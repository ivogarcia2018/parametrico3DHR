#!/usr/bin/env node
/**
 * Diagnóstico do envio de email do formulário.
 *
 * Confirma as credenciais SMTP e mostra a conversa com o servidor — é o que
 * distingue "nunca chegou a enviar" de "enviou mas não foi entregue".
 *
 * Uso (a partir da raiz do projeto):
 *
 *   node scripts/check-smtp.mjs
 *
 * Lê as SMTP_* do ambiente e, se não existirem, do `.env` na raiz. A password
 * nunca é impressa: a linha AUTH da conversa é redigida antes de sair.
 */
import { readFileSync } from "fs";
import { inspect } from "util";
import nodemailer from "nodemailer";

function loadEnvFile() {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // Sem .env: seguimos apenas com o ambiente.
  }
}

// `debug: true` imprime a conversa toda, incluindo `AUTH PLAIN <base64>` — que
// contém a password. Redigimos essa linha para o output poder ser partilhado.
const format = (message) =>
  typeof message === "string" ? message : inspect(message, { depth: 2, breakLength: 120 });
const redact = (message) => format(message).replace(/^(C: AUTH\b.*)$/gim, "C: AUTH [REDIGIDO]");
const logger = {
  level: "debug",
  trace: (m) => console.log(redact(m)),
  debug: (m) => console.log(redact(m)),
  info: (m) => console.log(redact(m)),
  warn: (m) => console.warn(redact(m)),
  error: (m) => console.error(redact(m)),
};

loadEnvFile();

const host = process.env.SMTP_HOST?.trim();
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS;
const to = process.env.MAIL_TO?.trim() || user;

if (!host || !user || !pass) {
  console.error("Faltam SMTP_HOST / SMTP_USER / SMTP_PASS (no ambiente ou no .env).");
  process.exit(1);
}

console.log(`servidor:   ${host}:${port}  (secure=${port === 465})`);
console.log(`utilizador: ${user}`);
console.log(`destino:    ${to}`);
console.log("");

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  logger,
  debug: true,
  // Sem timeouts, um servidor inacessível deixa o script pendurado minutos.
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 25_000,
});

try {
  console.log("--- 1) ligação e credenciais ---");
  await transport.verify();
  console.log("OK: o servidor aceitou as credenciais.\n");

  console.log("--- 2) enviar mensagem de teste ---");
  const info = await transport.sendMail({
    from: `"3DHR Formação" <${user}>`,
    to,
    subject: `Teste de envio — ${new Date().toISOString()}`,
    text: "Mensagem de teste enviada por scripts/check-smtp.mjs.",
  });

  console.log("\n--- 3) resultado ---");
  console.log(`aceitou:  ${JSON.stringify(info.accepted)}`);
  console.log(`recusou:  ${JSON.stringify(info.rejected)}`);
  console.log(`resposta: ${info.response}`);
  console.log(`id:       ${info.messageId}`);

  if (info.rejected?.length) {
    console.error("\nO servidor RECUSOU o destino — o email não seguiu.");
    process.exit(2);
  }

  console.log("\nO servidor aceitou a mensagem. Se não aparecer na caixa, o problema é de ENTREGA:");
  console.log("- vê a pasta SPAM / Lixo da caixa;");
  console.log("- procura um bounce (mailer-daemon) na caixa;");
  console.log("- confirma o DKIM do domínio no hPanel (o SPF de 3dhr.pt está correcto).");
} catch (error) {
  console.error(`\nFALHOU: ${error.message}`);
  process.exit(1);
}
