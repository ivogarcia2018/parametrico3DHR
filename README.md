# IA/ARQ — landing page do workshop

Landing page do workshop *IA/ARQ* (React 19 + Vite 7 + Tailwind v4 + Express),
exportada do Manus e adaptada para correr **totalmente offline**, sem
depender do storage remoto.

## Como abrir o site

O site **não é um ficheiro estático**: tem de haver um servidor a correr. Abrir
`http://localhost:3000/` sem servidor dá sempre
`Failed to Load Page / ERR_CONNECTION_REFUSED`.

```powershell
# Terminal integrado do VS Code (Terminal > New Terminal), deixar aberto:
pnpm install     # só na primeira vez
pnpm dev         # fica a correr; Ctrl+C para parar
```

Depois abre **http://localhost:3000/** (ou `http://127.0.0.1:3000/`). O Vite
imprime no terminal o URL exato — se a porta 3000 já estiver ocupada por outro
Vite, ele usa a 3001 e é esse URL que deves abrir.

Alternativa com build (sem recarregamento automático):

```powershell
pnpm build
pnpm start       # http://localhost:3000/
```

No VS Code também há duas tarefas prontas em `.vscode/tasks.json`
(`Ctrl+Shift+B`): *IA/ARQ: dev server* e *IA/ARQ: build + start*.

Se o terminal for fechado, a máquina suspender ou o processo for terminado, o
servidor cai e a página deixa de responder: volta a correr `pnpm dev`.

## Comandos

```bash
pnpm install      # instala dependências
pnpm dev          # servidor de desenvolvimento (http://localhost:3000)
pnpm check        # type-check (tsc --noEmit)
pnpm build        # build do cliente (dist/public) + bundle do servidor (dist/index.js)
pnpm start        # serve o build com Express (http://localhost:3000)
pnpm preview      # pré-visualização do build pelo próprio Vite
```

`pnpm start` funciona em Windows, macOS e Linux (o servidor resolve sozinho a
pasta `dist/public`, não depende de `NODE_ENV=production` no comando).

## Assets

Todos os visuais são locais, em `client/public/media/`, otimizados para web:

| Ficheiro | Uso |
| --- | --- |
| `hero-pavilion.webp` | fundo do hero |
| `result-concept.webp` | stage 01 / conceito |
| `result-parametric.webp` | stage 02 / parâmetros |
| `result-system.webp` | stage 03 / geometria |
| `result-night.webp` | stage 04 / imagem |
| `result-execution.webp` | resultado 04 / execução |
| `result-cnc.webp` | detalhe CNC |
| `result-execution-detail.webp` | detalhe de execução |
| `anatomy-detail.png` | detalhe de anatomia |
| `curation-reference.jpg` | referência de curadoria |
| `project-reference.jpg` | referência de projeto |
| `motion-pavilion.mp4` | resultado 06 / movimento |
| `motion-poster.webp` | poster do clip principal |
| `motion-context.mp4` | resultado 07 / contexto |
| `motion-context-poster.webp` | poster do clip de contexto |

Os originais (imagens Gemini, screenshots e vídeos) continuam em `media/` e não
são servidos pelo site. O código em `client/src/pages/Home.tsx` usa as
constantes `HERO_IMAGE` e `stages` / `resultMedia` para apontar para estes
ficheiros.

### Limpeza de assets órfãos (2026-09-28)

A pasta `client/public/media/imagens/` foi removida. Continha `0.webp`,
`1.jpg`, `3.jpg` e `4.png` — cópias byte-a-byte de `hero-pavilion.webp`,
`curation-reference.jpg`, `project-reference.jpg` e `anatomy-detail.png`
(respetivamente), sem qualquer referência no código. Libertou ~4,8 MB no build.
Cópia de segurança em `media/_backup-imagens-orphans-20260928-192306/`.

## Variáveis de ambiente

Opcionais — vê `.env.example`. Sem `.env` o site corre igual; o script de
analytics só é injetado quando `VITE_ANALYTICS_ENDPOINT` e
`VITE_ANALYTICS_WEBSITE_ID` estão definidos.

## Estrutura

```
client/            frontend (Vite root): index.html, src/, public/media/
server/index.ts    servidor Express que serve dist/public
shared/            constantes partilhadas
media/             material original (imagens/vídeos) — não servido
patches/           patch do wouter (ver "Versões e configuração do pnpm")
```

## Versões e configuração do pnpm

O gestor de pacotes está fixado em `packageManager`
(`pnpm@10.15.1` + hash de integridade). O pnpm 10 lê essa entrada e muda
automaticamente para essa versão, pelo que `pnpm` corre sempre a mesma versão,
independentemente da versão instalada globalmente.

Todas as definições vivem em `pnpm-workspace.yaml`:

- `patchedDependencies` → aplica `patches/wouter@3.7.1.patch` (expõe os caminhos
  das rotas em `window.__WOUTER_ROUTES__`, um hook do Manus — o site não o usa).
- `overrides` → `tailwindcss>nanoid: 3.3.7`.

O campo `pnpm` do `package.json` foi **removido**: está deprecado (as definições
passaram para o `pnpm-workspace.yaml` a partir do pnpm 10.9) e fazia o pnpm
imprimir um aviso em cada comando, que a PowerShell mostrava a vermelho como se
fosse um erro:

```
node.exe : [WARN] The "pnpm" field in package.json is no longer read by pnpm...
+ CategoryInfo          : NotSpecified: ([WARN] ...) [], RemoteException
+ FullyQualifiedErrorId : NativeCommandError
```

Para confirmar que o patch continua ativo:

```powershell
Select-String node_modules\wouter\esm\index.js -Pattern __WOUTER_ROUTES__
```

## Problemas comuns

| Sintoma | Causa | Resolução |
| --- | --- | --- |
| Bloco vermelho do pnpm em PowerShell | aviso do campo `pnpm` deprecado | já resolvido — não voltar a acrescentar o campo ao `package.json` |
| `Port 3000 is in use, trying another one...` → Vite em `http://localhost:3001` | já há um Vite a correr | usa o URL que o Vite imprime (3001) ou fecha o servidor antigo; a porta 3000 fica sem ninguém |
| `ERR_CONNECTION_REFUSED` / `Failed to Load Page` em `localhost:3000` | nenhum servidor a correr (não há ficheiro estático a abrir) | `pnpm dev` e deixar o terminal aberto — ver "Como abrir o site" |
| `ELIFECYCLE Command failed with exit code 4294967295` | o processo foi terminado (Ctrl+C ou outra ferramenta matou o node) | não é erro de código: volta a arrancar |
| `node.exe :` a vermelho, vazio, durante `pnpm build` | o `esbuild` escreve o resumo em stderr e a PowerShell trata stderr de comandos nativos como erro | já resolvido com `2>&1` no script `build` |
| `ERESOLVE`/peer warnings durante `pnpm install` | versões do React 19 | ignorar se `pnpm check` e `pnpm build` passarem |
| WebP/MP4 dão 404 | a build não foi feita | `pnpm build` — os assets vivem em `client/public/media/` |

## Notas pendentes

- O copy do React (`Home.tsx`: 3 dias, Antigravity 2.0, Omni) e o do protótipo
  antigo (`ler.html`: 6 h, pipeline de 5 ferramentas, Veo) descrevem o workshop
  de forma diferente. É uma decisão editorial, ainda não unificada.
- `vite-plugin-manus-runtime` injeta ~366 kB de runtime inline no
  `index.html` (com uma cópia própria do React). Para um deploy fora do Manus:
  `$env:MANUS_RUNTIME='0'` antes de `pnpm build` (2 kB em vez de 369 kB).
- Ainda existem 53 ficheiros em `client/src/components/ui/` e ~11 dependências
  shadcn sem uso, e `client/src/components/Map.tsx` não é importado.
