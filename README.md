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
| `hero-pavilion.webp` | still do pavilhão (galeria, 01) |
| `result-concept.webp` | stage 01 / conceito |
| `result-parametric.webp` | stage 02 / parâmetros |
| `result-system.webp` | stage 03 / geometria |
| `result-night.webp` | stage 04 / imagem |
| `result-execution.webp` | resultado 04 / execução |
| `result-cnc.webp` | detalhe CNC |
| `result-execution-detail.webp` | **órfã** — só era usada na secção "o objeto", removida a 2026-09-29 |
| `anatomy-detail.png` | detalhe de anatomia |
| `curation-reference.jpg` | referência de curadoria |
| `project-reference.jpg` | referência de projeto |
| `motion-pavilion.mp4` | resultado 06 / movimento |
| `motion-poster.webp` | poster do clip principal |
| `motion-context.mp4` | **hero** (clipe de topo, autoplay sem som) + resultado 07 / contexto |
| `motion-context-poster.webp` | poster do clipe de contexto (usado no hero) |

Os originais (imagens Gemini, screenshots e vídeos) continuam em `media/` e não
são servidos pelo site. O código em `client/src/pages/Home.tsx` usa as
constantes `HERO_VIDEO` / `HERO_POSTER` e `stages` / `resultMedia` para apontar
para estes ficheiros. O hero é um `<video>`: para trocar pelo plano noturno
basta apontar as duas constantes a `motion-pavilion.mp4` / `motion-poster.webp`.

### Limpeza de assets órfãos (2026-09-28)

A pasta `client/public/media/imagens/` foi removida. Continha `0.webp`,
`1.jpg`, `3.jpg` e `4.png` — cópias byte-a-byte de `hero-pavilion.webp`,
`curation-reference.jpg`, `project-reference.jpg` e `anatomy-detail.png`
(respetivamente), sem qualquer referência no código. Libertou ~4,8 MB no build.
Cópia de segurança em `media/_backup-imagens-orphans-20260928-192306/`.

### Actualização da imagem 01 da galeria (2026-10-06)

O `media/imagens/0.webp` foi substituído por uma nova imagem (2349×1351) e o
respetivo asset servido, `client/public/media/hero-pavilion.webp`, passou a ser
uma cópia desse ficheiro — deixou de ser a cópia de 512×320 de 2026-09-28. É a
imagem **01 «Pavilhão construído»** de `PRINCIPAL_IMAGES`, em `Home.tsx`. O topo
da página (hero) mantém-se o clipe de vídeo.

## Marca

O site assume a identidade **3DHR Training**:

- **Logótipo** — o lockup oficial completo: vidro «3DHR» + barra laranja
  «TRAINING», razão 5,10:1. Renderizado pelo componente `BrandMark` em
  `client/src/pages/Home.tsx` e estilizado por `.brand-logo` em
  `client/src/index.css`. Como já diz o nome inteiro, substitui a antiga placa
  **e** o wordmark de texto — juntos repetiriam o nome. Usado no header
  (21—26 px) e no footer (38 px).
- **Favicon** — a letra «3» de vidro sobre placa `#171715` arredondada, com
  filete dourado. Gerado por `client/scripts/brand/make_favicon.py`; servido em
  SVG e em PNG de 16/32/48/180/192/512 px.
- **Assinatura** — «Na 3DHR Training a qualidade de ensino é a nossa
  excelência.», no footer e nas meta tags (`client/index.html`).

### Logótipo de vidro

O asset fornecido (`logo.jpg`, 2870×1472) é **vidro quase-branco sobre fundo
branco, sem canal alfa**, e traz **apenas a marca «3DHR»** — não traz a barra
laranja «TRAINING» do lockup institucional. Aplicado tal e qual no header escuro
(`#171715`) daria um rectângulo branco visível, e mesmo removendo o branco por
limiar a marca ficaria quase-branca — invisível no escuro. Por isso o asset é
convertido em «claro-sobre-transparente» e depois completado:

| Ficheiro | Papel |
| --- | --- |
| `client/scripts/brand/analyze_logo.py` | Mede o histograma e fundamenta os limiares. |
| `client/scripts/brand/make_logo_assets.py` | Gera `logo-3dhr-glass.png` (1200 px) e `-sm` (400 px). |
| `client/scripts/brand/make_lockup.py` | Junta o vidro à barra «TRAINING» → `logo-3dhr-training.png` e `-sm`. |
| `client/scripts/brand/make_favicon.py` | Gera o conjunto de favicons a partir do «3». |

`make_lockup.py` parametriza toda a barra em múltiplos da altura de caixa alta
do vidro (intervalo 0,24 H, altura 0,57 H, etc.), medidos a partir da arte
oficial. A barra usa o laranja `#e96b3b`, que já é o acento do site. O texto
«TRAINING» é Arial Bold esticado — não há Eurostile/Microgramma neste sistema,
por isso é aproximação tipográfica, não a fonte original.

Para regenerar (os parâmetros estão no topo de cada script):

```bash
python client/scripts/brand/analyze_logo.py
python client/scripts/brand/make_logo_assets.py
python client/scripts/brand/make_lockup.py
python client/scripts/brand/make_favicon.py
```

**Limites conhecidos.** As *formas* do «3DHR» vêm do asset oficial. A *barra
laranja*, o *texto* e a *cor de saída do vidro* (clara, para contrastar com o
`#171715`) foram escolhidos nos scripts, não pelo design. Para uso institucional
convém pedir ao fornecedor o lockup completo em PNG transparente e reexecutar os
scripts com esse ficheiro.

**Se a marca mudar de volta para um fundo claro**, o mesmo PNG serve: o vidro
original foi desenhado para fundo claro, por isso o `.jpg` é a versão correcta
nesse caso.

## Copy e narrativa da página

O texto de `Home.tsx` defende uma tese única — **a IA só é útil à arquitetura
quando entra sobre um modelo mensurável e sob supervisão** — e cada secção é
uma parte dela. A ordem é deliberada: a prova vem antes do argumento e o
«porquê» antes do «como» (2026-10-06).

| # | Secção (`id`) | Papel no argumento |
| --- | --- | --- |
| — | `#top`, `#galeria` | Prova: o pavilhão construído, em uso e o seu clipe |
| 01 | `#impasse` | **O impasse** (render impossível de construir vs. script que não se apresenta), a âncora — o Rhino como única fonte de verdade —, a pergunta crítica e os três ganhos |
| 02 | `#processo` | O método: cinco momentos, um sistema de decisão |
| 03 | `#programa` | O mapa das duas sessões |
| 04 | `#publico` | Para quem é |
| 05 | `#mentor` | Quem conduz: um curso de arquitetura, não de IA |
| 06 | `#faq` | Objeções honestas — inclui «Isto é só gerar imagens bonitas com IA?» e «A IA decide por mim?» |
| 07 | `#inscricao` | Inscrição, condições da turma e preços |

`#impasse` é a única secção que argumenta em vez de mostrar: não tem imagens
e por isso reutiliza as classes já existentes (`.section-kicker`, `.title-fit`,
`.flow-chip`) em vez de introduzir CSS novo. A numeração das secções vai de
**01 a 07** (a secção 04 / `#resultados` foi retirada em 2026-10-14) e o espaço do link «Porquê» na navegação foi verificado até aos
768 px (sem overflow).

## Editar o texto da página (modo edição, só em desenvolvimento)

Não é preciso mexer em JSX para mudar a redação. Com `pnpm dev` a página ganha
um botão **«editar textos»** no canto inferior esquerdo:

1. Clica em **editar textos** — todos os textos ficam editáveis no próprio
   sítio, cada um com o alvo sublinhado a laranja (nada muda de sítio nem de
   tamanho enquanto editas).
2. Escreve por cima. No painel, em «textos de campos, rótulos e opções», ficam
   as strings que não se podem escrever em linha: `placeholder` do formulário,
   `alt` das imagens, `aria-label` dos botões e o texto das opções do selector.
3. **gravar no projeto** → os textos vão para `client/src/content/copy.json` e a
   página recarrega já com a alteração. **descartar** volta atrás. **exportar**
   descarrega o JSON (e copia-o) para reutilizar noutro lado.

Como funciona, em três peças:

- `client/src/lib/copyOverrides.ts` — identifica cada texto pela posição no DOM
  (caminho de elementos + índice do nó) e aplica o que estiver gravado. Só
  substitui quando o texto actual **ainda é o original** (campo `was`): se a
  página for reestruturada, a entrada fica inactiva em vez de escrever no lugar
  errado. Um `MutationObserver` volta a aplicar a gravação depois de cada
  re-render do React (abrir uma FAQ, mudar de módulo, avançar o carrossel).
- `client/src/components/CopyEditor.tsx` — o painel. Só existe com
  `import.meta.env.DEV`, por isso não entra no build.
- `vite.config.ts` → plugin `vitePluginCopyEditor()` (`apply: "serve"`) — é o
  servidor de desenvolvimento que escreve o ficheiro (`POST /__copy`). Uma
  sessão nova **junta** ao que já estava gravado e **preserva o `was` da
  primeira gravação**; nunca apaga entradas antigas.

### Como uma entrada se mantém ligada ao texto (2026-10-06)

Três garantias, por esta ordem, valem para textos e para atributos:

1. **`was` é sempre o original do JSX.** Ao reeditar um texto já gravado, o
   painel consulta o ficheiro e guarda o original — não o texto que está no ecrã
   — e o servidor mantém o primeiro `was` conhecido. Sem isto, uma segunda
   gravação guardava como "original" o texto já alterado e a entrada deixava de
   aplicar-se depois de recarregar (os outros textos mantinham-se, o reeditado
   voltava atrás).
2. **Blocos de estado não contam para as chaves.** O menu móvel, a mensagem de
   sucesso do formulário e o botão «repor posição» só existem depois de uma
   acção, mas apareciam no meio dos irmãos e empurravam o índice de tudo o que
   vem depois — era o caso dos campos do formulário. Estão marcados no `Home.tsx`
   com `data-copy-transient`, que os exclui do cálculo do caminho.
3. **Rede de segurança ao aplicar.** Chave exacta → mesmo fim de caminho (a
   página ganhou ou perdeu um elemento) → texto original único *dentro da mesma
   secção*. As duas últimas exigem alvo único: se o mesmo texto existir em dois
   sítios, não se escreve nada. Entradas que não encontrem alvo nesta página
   (menu fechado, outro módulo activo) aparecem contadas no painel como
   «N de M entradas activas nesta página».

Notas práticas:

- `client/src/content/copy.json` é a fonte das alterações e deve ser commitado.
- Gravar em desenvolvimento só muda o site publicado depois de `pnpm build` —
  o JSON entra no bundle, o editor não.
- Sem o servidor do Vite não há gravação (o botão avisa); a leitura, essa,
  funciona sempre, inclusive no site publicado.
- Quebras de linha escritas no painel não aparecem na página (o HTML junta-as):
  no texto basta separar com « · »; quando os textos passarem para o
  `Home.tsx`, as quebras podem virar `<br />` reais.
- Se preferires que estes textos passem definitivamente para dentro do
  `Home.tsx` (e o `copy.json` volte a ficar vazio), é uma passagem mecânica a
  fazer a partir das entradas do ficheiro.
## Contacto e inscrições

As inscrições e os pedidos de informação são endereçados a
**`formacao@3dhr.pt`** (2026-10-06). Desde 2026-10-15 o formulário envia-os
**pelo servidor**, por SMTP — antes só abria o `mailto:` do visitante, o que
falhava em silêncio em browsers sem cliente de email associado.

O percurso é: o formulário da secção «inscrição»
(`client/src/pages/Home.tsx`) valida os campos e faz `POST /api/pedido`; o
endpoint em `server/index.ts` volta a validar, compõe o email (assunto
«Inscrição / pedido de informação — nome», `Reply-To` do visitante) e envia-o
por `nodemailer` para `formacao@3dhr.pt`, com as credenciais das `SMTP_*`.

Há três recuos, para o pedido nunca se perder:

1. **Sem `SMTP_*` configurado** — o endpoint responde `503` e o formulário abre
   o `mailto:` do visitante, como antes.
2. **O envio falhou** (`502`) — mesmo recuo, com um aviso diferente.
3. **`pnpm dev`** — só corre o Vite e não existe `/api/pedido`; a resposta não é
   JSON e o formulário recua para o `mailto:`.

Para diagnosticar fora do deploy há `scripts/check-smtp.mjs`: verifica as
credenciais e imprime a conversa com o servidor (a linha `AUTH` sai redigida, por
isso o output pode ser partilhado). Lê as `SMTP_*` do ambiente ou do `.env`.

```powershell
$env:SMTP_HOST='smtp.hostinger.com'; $env:SMTP_PORT='587'
$env:SMTP_USER='formacao@3dhr.pt';  $env:SMTP_PASS='<password da caixa>'
node scripts/check-smtp.mjs
```

Se terminar com «o servidor aceitou a mensagem» e o email não aparecer na caixa,
o problema é de entrega (spam / DKIM), não de envio.

### Autenticação de email (para os pedidos não caírem em spam)

Verificado no DNS de `3dhr.pt` (nameservers `ns1/ns2.dns-parking.com`, ou seja, o
DNS é gerido no hPanel):

| Registo | Valor | Estado |
| --- | --- | --- |
| MX | `mx1` / `mx2.hostinger.com` | ✓ |
| SPF | `v=spf1 include:_spf.mail.hostinger.com ~all` | ✓ |
| DKIM | `hostingermail1._domainkey` | ✓ publicado (2026-10-15) |
| DKIM | `hostingermail2._domainkey` | ✗ por publicar — só é preciso se o hPanel o listar |
| DMARC | `v=DMARC1; p=none` | ✓ |

Sem DKIM os emails saem sem assinatura e o Gmail/Outlook tendem a mandá-los para
spam — vale a pena confirmar este quadro depois de mexer no email do domínio.

O endereço está também visível como link `mailto:` no cartão de contacto
(«ou envia directamente para…») e no rodapé, para quem preferir escrever sem
passar pelo formulário.

A constante `CONTACT_EMAIL` em `Home.tsx` e a função `contactEmail()` em
`server/index.ts` são os pontos onde o endereço vive (a segunda aceita
`MAIL_TO`): mudá-los propaga-o ao formulário, ao cartão de contacto e ao rodapé.

## Variáveis de ambiente

Vê `.env.example`. O site arranca sem `.env`: o script de analytics só é
injetado quando `VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID` estão
definidos, e o formulário recua para o `mailto:` quando faltam as `SMTP_*`.

Para o formulário enviar email (Hostinger Email):

| Variável | Valor |
| --- | --- |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `587` (STARTTLS) ou `465` (SSL) |
| `SMTP_USER` | `formacao@3dhr.pt` |
| `SMTP_PASS` | password da caixa — segredo, só no hPanel ou no `.env` local |
| `MAIL_TO` | destino do pedido (opcional; por omissão `formacao@3dhr.pt`) |
| `MAIL_FROM_NAME` | nome no «De:» (opcional; por omissão `3DHR Formação`) |

O `.env` está no `.gitignore`: as credenciais nunca entram no repositório.

## Estrutura

```
client/             frontend (Vite root): index.html, src/, public/media/
client/src/content/ texto da página editado no browser (copy.json)
server/index.ts     servidor Express que serve dist/public
server.js           entry file do preset Express da Hostinger (carrega dist/index.js)
shared/             constantes partilhadas
media/              material original (imagens/vídeos) — não servido
patches/            patch do wouter (ver "Versões e configuração do pnpm")
```

## Versões e configuração do pnpm

O campo `packageManager` foi **removido**. Estava fixado em `pnpm@10.15.1` + hash
de integridade; o pnpm 10 mudava de versão sozinho por causa dele, mas o pnpm 11
**recusa correr** quando a versão instalada não coincide com o campo — foi isso
que fez falhar o primeiro build na Hostinger, que corre o pnpm 11.24.0:

> This project is configured to use 10.15.1 of pnpm. Your current pnpm is v11.24.0

Sem o campo, cada ambiente usa a sua própria versão do pnpm e todas leem as
mesmas definições do `pnpm-workspace.yaml`. Não voltar a acrescentar o campo.

Todas as definições vivem em `pnpm-workspace.yaml`:

- `patchedDependencies` → aplica `patches/wouter@3.7.1.patch` (expõe os caminhos
  das rotas em `window.__WOUTER_ROUTES__`, um hook do Manus — o site não o usa).
- `overrides` → `tailwindcss>nanoid: 3.3.7`.
- `allowBuilds` → `false` para o esbuild e o `@tailwindcss/oxide` (o binário nativo
  vem via optionalDependencies; o pnpm 11 exige esta entrada ou falha o install).

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

## Deploy na Hostinger (via GitHub)

O repositório `github.com/ivogarcia2018/parametrico3DHR` está ligado ao
**Node.js Hosting** da Hostinger (2026-10-14). O que a plataforma faz sozinha e o
que tem de ser configurado:

**Detetado automaticamente** — a Hostinger lê o `pnpm-lock.yaml` e usa **pnpm**,
por isso o patch do wouter e o override do nanoid (que vivem no
`pnpm-workspace.yaml`) continuam a aplicar-se. A versão do Node vem do campo
`engines` do `package.json` (`>=22.12.0` → Node 22 LTS, o default da plataforma).

### Opção A — Express (recomendada)

Mantém o servidor `server/index.ts`, que serve o build e responde com o
`index.html` a qualquer rota (o *fallback* de SPA que o `wouter` precisa).

| Campo no hPanel | Valor |
| --- | --- |
| Node.js version | 22 |
| Application type | `express` |
| Root directory | *(vazio — a raiz)* |
| Build script | `build` |
| Output directory | *(vazio — o Express publica a raiz)* |
| Entry file | `dist/index.js` |

O `pnpm build` produz `dist/index.js` (servidor) e `dist/public/` (cliente), que
é exactamente onde o `resolveStaticPath()` do servidor os procura.

Se o campo *Entry file* ficar no default `server.js`, também funciona: o
`server.js` da raiz apenas carrega o bundle compilado (`import "./dist/index.js"`),
para o preset Express arrancar sem mexer no hPanel. Em alternativa, aponta o
*Entry file* directamente para `dist/index.js`.

### Opção B — Vite estático

Não corre nenhum processo Node: a Hostinger serve os ficheiros. Mais leve e mais
rápido, mas perde-se o *fallback* de SPA (um endereço que não seja `/` dá o 404
do servidor em vez da página «Página não encontrada»).

| Campo no hPanel | Valor |
| --- | --- |
| Node.js version | 22 |
| Application type | `vite` |
| Root directory | *(vazio — a raiz)* |
| Build script | `build` |
| Output directory | `dist/public` |
| Entry file | *(vazio — site estático)* |

Em qualquer das opções, `dist/` está no `.gitignore`: o build corre na Hostinger,
nunca é enviado do repositório.

### Variáveis de ambiente no hPanel

**`MANUS_RUNTIME=0`** — em *Environment variables* no hPanel, antes do primeiro
build. A Hostinger injeta as variáveis **no build e no runtime**, por isso esta
chega ao `vite.config.ts`.

Sem ela, o `vite-plugin-manus-runtime` inlina ~366 kB de runtime (com uma cópia
própria do React) dentro do `index.html` — inútil fora do host do Manus. Com ela,
o `index.html` sai com ~3,9 kB. O comportamento por omissão do código continua a
ser «runtime ligado», para não partir um build dentro do Manus.

Para o formulário enviar email, acrescenta **`SMTP_HOST`**, **`SMTP_PORT`**,
**`SMTP_USER`** e **`SMTP_PASS`** (e, se quiseres, `MAIL_TO` /
`MAIL_FROM_NAME`) — ver «Variáveis de ambiente». O servidor lê-as no arranque, do
ambiente do processo **ou** de um `.env` na raiz (a Hostinger escreve esse
ficheiro; o servidor carrega-o com `process.loadEnvFile`, porque não usa dotenv):
depois de as guardares, faz **Redeploy**.

As variáveis `VITE_ANALYTICS_*` são opcionais: sem elas o `index.html` fica com
os marcadores `%VITE_...%` e o script de analytics não é injetado (o próprio
código deteta o `%` e desiste). O `.env` não vai para o repositório.

### Se um dia mudar o domínio ou a pasta

O `vite.config.ts` não define `base`, pelo que o site assume a raiz do domínio
(`/`). Um deploy numa subpasta exigiria `base: "/nome-da-pasta/"`.

## Problemas comuns

| Sintoma | Causa | Resolução |
| --- | --- | --- |
| Bloco vermelho do pnpm em PowerShell | aviso do campo `pnpm` deprecado | já resolvido — não voltar a acrescentar o campo ao `package.json` |
| Build falha com `This project is configured to use 10.15.1 of pnpm` | o campo `packageManager` fixava uma versão diferente da do servidor | já resolvido — o campo foi removido; ver "Versões e configuração do pnpm" |
| Formulário: «nada acontece» ao enviar | `mailto:` sem cliente de email associado no browser | configurar as `SMTP_*` — ver «Contacto e inscrições» |
| Formulário: aparece «Pedido preparado» em vez de «Pedido enviado» | faltam as `SMTP_*` no hPanel, ou o envio falhou | procurar `[pedido] falha ao enviar por SMTP` no log e conferir as credenciais |
| Formulário: aparece «Pedido enviado» mas o email não chega | é problema de **entrega**, não de envio | ver no log `[pedido] destinatario=… aceitou=[…]`; confirmar o **SPAM** da caixa. SPF ✓, DKIM `hostingermail1` ✓ e DMARC `p=none` — ver «Autenticação de email» |
| `Port 3000 is in use, trying another one...` → Vite em `http://localhost:3001` | já há um Vite a correr | usa o URL que o Vite imprime (3001) ou fecha o servidor antigo; a porta 3000 fica sem ninguém |
| `ERR_CONNECTION_REFUSED` / `Failed to Load Page` em `localhost:3000` | nenhum servidor a correr (não há ficheiro estático a abrir) | `pnpm dev` e deixar o terminal aberto — ver "Como abrir o site" |
| `ELIFECYCLE Command failed with exit code 4294967295` | o processo foi terminado (Ctrl+C ou outra ferramenta matou o node) | não é erro de código: volta a arrancar |
| `node.exe :` a vermelho, vazio, durante `pnpm build` | o `esbuild` escreve o resumo em stderr e a PowerShell trata stderr de comandos nativos como erro | já resolvido com `2>&1` no script `build` |
| `ERESOLVE`/peer warnings durante `pnpm install` | versões do React 19 | ignorar se `pnpm check` e `pnpm build` passarem |
| WebP/MP4 dão 404 | a build não foi feita | `pnpm build` — os assets vivem em `client/public/media/` |
| «gravar no projeto» não grava | o editor de texto só grava com o servidor do Vite a correr | `pnpm dev` — ver "Editar o texto da página" |

## Notas pendentes

- O copy do React (`Home.tsx`) foi unificado em **6 h, pipeline de 5
  ferramentas, Veo/Gemini Omni** — já não menciona «3 dias» nem «Antigravity
  2.0». O `ler.html` continua a ser um protótipo não usado, com as datas
  antigas de outubro, e não é servido pelo site: a divergência de copy está
  resolvida na página real.
- Logística atualizada em `Home.tsx` (2026-09-29): 2 sessões de 3 h —
  **terça 10 e quinta 12 de novembro de 2026, 18:30—21:30 WET** —, **12 a 15
  participantes**, **early bird 100 € + IVA** / **preço normal 120 € + IVA**, e
  bloco «condições da turma» em `#inscricao` com o que está incluído (gravação
  por 30 dias, ficheiros de exercício, biblioteca de prompts, checklist de
  qualidade, certificado). `ler.html` é um protótipo não usado e mantém as
  datas antigas de outubro — não é servido pelo site.
- `vite-plugin-manus-runtime` injeta ~366 kB de runtime inline no
  `index.html` (com uma cópia própria do React). Para um deploy fora do Manus:
  `$env:MANUS_RUNTIME='0'` antes de `pnpm build` (2 kB em vez de 369 kB).
- Ainda existem 53 ficheiros em `client/src/components/ui/` e ~11 dependências
  shadcn sem uso, e `client/src/components/Map.tsx` não é importado.
- Datas do evento movidas de **3 e 5** para **10 e 12 de novembro de 2026**
  (2026-10-14) — uma semana mais tarde, mantendo terça/quinta e o horário
  18:30—21:30 WET. Atualizados os 6 pontos em `Home.tsx` e a meta description do
  `index.html`. `ler.html` continua com as datas antigas (protótipo não servido).
