import express from "express";
import { existsSync } from "fs";
import { createServer } from "http";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Finds the folder that holds the built frontend, so `pnpm start` behaves the
 * same on Windows, macOS and Linux without relying on a NODE_ENV=production
 * prefix (which is not valid syntax in PowerShell or cmd.exe).
 *
 * When the server is bundled, __dirname is <root>/dist and the client build
 * lives in <root>/dist/public.
 */
function resolveStaticPath(): string {
  const candidates = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];

  return candidates.find((candidate) => existsSync(path.join(candidate, "index.html"))) ?? candidates[0];
}

// ---------------------------------------------------------------------------
// Pedido de informacao do formulario (POST /api/pedido)
//
// O site nao tem base de dados: o pedido e validado aqui e enviado por SMTP
// para a caixa da formacao. As credenciais vivem em variaveis de ambiente
// (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS — ver .env.example) para nunca
// entrarem no repositorio. Sem elas o endpoint responde 503 e o formulario
// volta ao `mailto:` de recurso, por isso o pedido nunca se perde.
// ---------------------------------------------------------------------------

function contactEmail(): string {
  return process.env.MAIL_TO?.trim() || "formacao@3dhr.pt";
}

// Texto legivel de cada opcao do seletor de perfil, igual ao do formulario.
const PROFILE_LABELS: Record<string, string> = {
  arquitetura: "sou arquiteto/a",
  estudante: "sou estudante",
  equipa: "represento uma equipa",
  outro: "outro perfil",
};

type Pedido = { name: string; email: string; profile: string; message: string };

// As mesmas regras do `validateField` do formulario: o servidor nao confia no
// cliente, mas as mensagens sao iguais para o utilizador nao ver dois discursos.
function readPedido(body: unknown): { pedido?: Pedido; errors: Record<string, string> } {
  const source = (body ?? {}) as Record<string, unknown>;
  const pedido: Pedido = {
    name: String(source.name ?? "").trim(),
    email: String(source.email ?? "").trim(),
    profile: String(source.profile ?? "").trim(),
    message: String(source.message ?? "").trim(),
  };

  const errors: Record<string, string> = {};
  if (pedido.name.length < 2) errors.name = "Indica pelo menos 2 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(pedido.email)) errors.email = "Escreve um email válido.";
  if (!PROFILE_LABELS[pedido.profile]) errors.profile = "Escolhe uma opção.";
  if (pedido.message.length > 0 && pedido.message.length < 8) errors.message = "Escreve pelo menos 8 caracteres ou deixa vazio.";

  return Object.keys(errors).length > 0 ? { errors } : { pedido, errors };
}

// Devolve null quando falta configuracao — e o sinal para o cliente recuar
// para o `mailto:` em vez de mostrar um erro.
function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    user,
    transport: nodemailer.createTransport({
      host,
      port,
      // 465 e SSL directo; 587/25 sobem por STARTTLS.
      secure: port === 465,
      auth: { user, pass },
      // Sem timeouts, um SMTP inacessivel deixa o pedido pendurado minutos.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
  };
}

// A resposta do servidor SMTP: `accepted` e `rejected` dizem o que aconteceu de
// facto ao destinatário, mesmo quando `sendMail` resolve sem excepção.
function formatAddresses(items: unknown[]): string {
  return items
    .map((item) => (typeof item === "string" ? item : (item as { address?: string }).address ?? String(item)))
    .join(", ");
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  const staticPath = resolveStaticPath();

  if (!existsSync(path.join(staticPath, "index.html"))) {
    console.error(`No client build found at ${staticPath}. Run "pnpm build" before "pnpm start".`);
    process.exit(1);
  }

  console.log(`Serving client build from ${staticPath}`);

  // Fica antes do catch-all do SPA, que responde a qualquer GET com o index.html.
  app.post("/api/pedido", express.json({ limit: "32kb" }), async (req, res) => {
    const { pedido, errors } = readPedido(req.body);
    if (!pedido) {
      res.status(400).json({ ok: false, errors });
      return;
    }

    const smtp = createTransport();
    if (!smtp) {
      res.status(503).json({ ok: false, reason: "smtp-not-configured" });
      return;
    }

    const fromName = process.env.MAIL_FROM_NAME?.trim() || "3DHR Formação";
    const profile = PROFILE_LABELS[pedido.profile] ?? pedido.profile;

    try {
      const info = await smtp.transport.sendMail({
        from: `"${fromName}" <${smtp.user}>`,
        to: contactEmail(),
        replyTo: `"${pedido.name}" <${pedido.email}>`,
        subject: `Inscrição / pedido de informação — ${pedido.name}`,
        text: [
          `Nome: ${pedido.name}`,
          `Email: ${pedido.email}`,
          `Perfil: ${profile}`,
          `Mensagem: ${pedido.message || "—"}`,
        ].join("\r\n"),
      });

      // O que o servidor respondeu. `accepted` vazio ou `rejected` preenchido
      // significa que o email nao seguiu, mesmo sem excepcao.
      const accepted = formatAddresses(info.accepted ?? []);
      const rejected = formatAddresses(info.rejected ?? []);
      console.log(`[pedido] destinatario=${contactEmail()} aceitou=[${accepted || "—"}]${rejected ? ` recusou=[${rejected}]` : ""} resposta="${info.response ?? "sem resposta"}" id=${info.messageId ?? "—"}`);
      if (rejected) console.warn(`[pedido] o servidor SMTP RECUSOU: ${rejected}`);

      res.json({ ok: true });
    } catch (error) {
      console.error("[pedido] falha ao enviar por SMTP:", error);
      res.status(502).json({ ok: false, reason: "send-failed" });
    }
  });

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
