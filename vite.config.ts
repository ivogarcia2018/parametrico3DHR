import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

/**
 * Editor de texto da landing page — apenas em desenvolvimento.
 *
 * Converte a UI do browser em ficheiro: o componente CopyEditor faz POST de
 * { text, attrs } e este middleware valida e escreve
 * client/src/content/copy.json, que e' a fonte das alteracoes de texto.
 *
 * GET  /__copy -> devolve o que esta guardado
 * POST /__copy -> grava (substitui o ficheiro pelo lote enviado)
 *
 * `apply: "serve"` garante que nada disto entra no build de producao.
 */
function vitePluginCopyEditor(): Plugin {
  const file = path.join(PROJECT_ROOT, "client", "src", "content", "copy.json");
  const EMPTY = { text: {}, attrs: {} };

  function sanitizeSection(raw: unknown): Record<string, Record<string, string>> {
    const clean: Record<string, Record<string, string>> = {};
    if (!raw || typeof raw !== "object") return clean;
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!key || key.length > 400) continue;
      if (!value || typeof value !== "object") continue;
      const entry = value as Record<string, unknown>;
      const kept: Record<string, string> = {};
      for (const field of ["was", "text", "attr"]) {
        const fieldValue = entry[field];
        if (typeof fieldValue === "string" && fieldValue.length <= 4000) kept[field] = fieldValue;
      }
      if (typeof kept.was === "string" && typeof kept.text === "string" && kept.text !== kept.was) {
        clean[key] = kept;
      }
    }
    return clean;
  }

  type Section = Record<string, Record<string, string>>;

  function readFileStore(): { text: Section; attrs: Section } {
    try {
      if (!fs.existsSync(file)) return { text: {}, attrs: {} };
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as { text?: unknown; attrs?: unknown };
      return { text: sanitizeSection(parsed?.text), attrs: sanitizeSection(parsed?.attrs) };
    } catch {
      return { text: {}, attrs: {} };
    }
  }

  function orderKeys(section: Section): Section {
    const ordered: Section = {};
    for (const key of Object.keys(section).sort()) ordered[key] = section[key];
    return ordered;
  }

  return {
    name: "copy-editor",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/__copy", (req, res, next) => {
        const respond = (status: number, payload: unknown) => {
          res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify(payload));
        };

        if (req.method === "GET") {
          try {
            const raw = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
            return respond(200, { success: true, file, store: raw ? JSON.parse(raw) : EMPTY });
          } catch (error) {
            return respond(500, { success: false, error: String(error) });
          }
        }

        if (req.method !== "POST") return next();

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
          if (body.length > 2 * 1024 * 1024) req.destroy();
        });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body) as { text?: unknown; attrs?: unknown };
            const batch = {
              text: sanitizeSection(parsed?.text),
              attrs: sanitizeSection(parsed?.attrs),
            };
            const count = Object.keys(batch.text).length + Object.keys(batch.attrs).length;
            if (count === 0) {
              return respond(400, { success: false, error: "nenhuma alteracao recebida" });
            }
            // Junta ao que ja estava guardado: uma sessao nova de edicao nunca
            // apaga as entradas gravadas em sessoes anteriores.
            //
            // O `was` e' o texto original do JSX. Ao reeditar um texto, o lote
            // novo traz como "original" o texto ja gravado — guardar isso
            // quebrava a ligacao ao sitio (depois de recarregar, o texto do JSX
            // nao batia certo com o `was` e a alteracao desaparecia). Por isso o
            // primeiro `was` conhecido ganha sempre.
            const previous = readFileStore();
            const mergeSection = (before: Section, after: Section): Section => {
              const merged: Section = { ...before };
              for (const [key, entry] of Object.entries(after)) {
                const pristine = before[key];
                merged[key] = pristine
                  ? { ...entry, was: pristine.was, ...(pristine.attr ? { attr: pristine.attr } : {}) }
                  : entry;
              }
              return merged;
            };
            const store = {
              text: orderKeys(mergeSection(previous.text, batch.text)),
              attrs: orderKeys(mergeSection(previous.attrs, batch.attrs)),
            };
            const total = Object.keys(store.text).length + Object.keys(store.attrs).length;
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
            return respond(200, { success: true, count, total, file });
          } catch (error) {
            return respond(400, { success: false, error: String(error) });
          }
        });
      });
    },
  };
}

/**
 * vite-plugin-manus-runtime inlines ~366 kB of runtime (its own React copy
 * included) directly into index.html. That is only useful inside the Manus
 * host, so a self-hosted build can skip it with MANUS_RUNTIME=0.
 * Default behaviour is unchanged: the runtime stays enabled.
 */
const manusRuntimeEnabled = process.env.MANUS_RUNTIME !== "0";

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  ...(manusRuntimeEnabled ? [vitePluginManusRuntime()] : []),
  vitePluginManusDebugCollector(),
  vitePluginStorageProxy(),
  vitePluginCopyEditor(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
