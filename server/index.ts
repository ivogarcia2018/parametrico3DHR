import express from "express";
import { existsSync } from "fs";
import { createServer } from "http";
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

async function startServer() {
  const app = express();
  const server = createServer(app);

  const staticPath = resolveStaticPath();

  if (!existsSync(path.join(staticPath, "index.html"))) {
    console.error(`No client build found at ${staticPath}. Run "pnpm build" before "pnpm start".`);
    process.exit(1);
  }

  console.log(`Serving client build from ${staticPath}`);

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
