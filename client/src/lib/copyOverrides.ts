import storedCopy from "@/content/copy.json";

/**
 * Copy overrides — texto editado no browser, guardado no repositorio.
 *
 * A pagina continua a ter a redacao dentro do Home.tsx. Este modulo acrescenta
 * uma camada opcional por cima: se `content/copy.json` tiver uma entrada para
 * um no de texto, esse no passa a mostrar o texto guardado, em desenvolvimento
 * e no build (o JSON entra no bundle).
 *
 * Como se identifica um no de texto sem tocar no JSX: pela posicao na arvore
 * (caminho de elementos + indice do no dentro do elemento pai). A chave tem de
 * ser calculada da mesma forma pelo editor (ao gravar) e por este modulo (ao
 * aplicar), por isso tudo o que mexe em chaves vive aqui e e' partilhado.
 *
 * Cada entrada guarda tambem o texto original (`was`). Ao aplicar so se
 * substitui quando o texto actual ainda e' o original. Se a pagina for
 * reestruturada e a chave passar a apontar para outro sitio, nada e' escrito
 * no lugar errado: a entrada fica simplesmente inactiva.
 */

export type CopyEntry = { text: string; was: string };
export type CopyAttrEntry = CopyEntry & { attr: string };
export type CopyTextMap = Record<string, CopyEntry>;
export type CopyAttrMap = Record<string, CopyAttrEntry>;
export type CopyStore = { text: CopyTextMap; attrs: CopyAttrMap };

/** Atributos que se mostram ao utilizador mas nao sao nos de texto. */
export const EDITABLE_ATTRS = ["placeholder", "alt", "aria-label", "title"] as const;

/** Controlos e desenhos: o seu conteudo nao se edita em linha. */
const INLINE_SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CANVAS",
]);

/** UI que nao e' pagina: painel do editor, portais e regioes de anuncio. */
const UI_SELECTORS = ["[data-copy-ui]", "[data-sonner-toaster]", "[aria-live]"];

function insideUi(element: Element): boolean {
  for (const selector of UI_SELECTORS) {
    if (element.closest(selector) !== null) return true;
  }
  // Tudo o que vive fora do root da aplicacao e' UI de biblioteca, nao copy.
  return element.closest("#root") === null;
}

/** Elementos cujo texto nao pode ser envolvido para edicao em linha. */
function isSkippedInline(element: Element): boolean {
  if (INLINE_SKIP_TAGS.has(element.tagName.toUpperCase())) return true;
  return element.closest("svg") !== null;
}

/** Caminho estavel de um elemento dentro do body, ex. "div0/main0/section3/h2".
 *
 * Blocos marcados no JSX com `data-copy-transient` (menu movel, mensagens de
 * estado, botoes que so existem depois de uma accao) aparecem e desaparecem.
 * Nao contam para o indice dos irmaos: se contassem, o simples abrir do menu
 * mudava a chave de tudo o que vem depois e as gravacoes deixavam de bater
 * certo — era essa a causa de "as vezes grava, outras vezes nao". */
function isTransient(element: Element): boolean {
  return element.hasAttribute("data-copy-transient");
}

export function elementPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && current !== document.documentElement) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(current.tagName.toLowerCase());
      break;
    }
    const stable = Array.from(parent.children).filter(
      (child) => !isTransient(child) || child === current,
    );
    const index = stable.indexOf(current);
    parts.unshift(`${current.tagName.toLowerCase()}${index < 0 ? 0 : index}`);
    current = parent;
  }
  return parts.join("/");
}

/** Ancora da seccao: o `id` do primeiro ascendente que tenha um. Serve de rede
 *  de seguranca para nao confundir texto igual em sitios diferentes da pagina. */
function sectionAnchor(element: Element | null): string {
  let current: Element | null = element;
  while (current) {
    const id = current.id;
    if (id) return id;
    current = current.parentElement;
  }
  return "";
}

/** Indice "caminho -> elemento" para tudo o que e' pagina (nao UI). */
function elementIndex(root: ParentNode): Map<string, Element> {
  const index = new Map<string, Element>();
  for (const element of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (insideUi(element)) continue;
    index.set(elementPath(element), element);
  }
  return index;
}

/**
 * A que seccao pertence uma chave? Uma chave antiga pode ja nao existir na
 * pagina, mas o troço inicial do caminho (a seccao) continua a existir: procura
 * o prefixo mais longo que ainda se resolve e devolve a ancora desse elemento.
 */
function anchorForPath(
  path: string,
  lookup: (candidatePath: string) => Element | null | undefined,
): string {
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  const hash = last.indexOf("#");
  if (hash >= 0) segments[segments.length - 1] = last.slice(0, hash);
  for (let size = segments.length; size > 0; size -= 1) {
    const element = lookup(segments.slice(0, size).join("/"));
    if (element) return sectionAnchor(element);
  }
  return "";
}

/** Chave de um no de texto: caminho do pai + indice entre os nos de texto irmaos. */
export function textNodeKey(node: Text): string | null {
  const parent = node.parentElement;
  if (!parent || insideUi(parent)) return null;
  let index = 0;
  let sibling: Node | null = parent.firstChild;
  while (sibling && sibling !== node) {
    if (sibling.nodeType === Node.TEXT_NODE) index += 1;
    sibling = sibling.nextSibling;
  }
  return `${elementPath(parent)}#t${index}`;
}

export function attributeKey(element: Element, attribute: string): string {
  return `${elementPath(element)}@${attribute}`;
}

function cleanSection(raw: unknown): Record<string, Record<string, string>> {
  const clean: Record<string, Record<string, string>> = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || key.length > 400) continue;
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const kept: Record<string, string> = {};
    for (const field of ["was", "text", "attr"]) {
      const raw_field = entry[field];
      if (typeof raw_field === "string" && raw_field.length <= 4000) kept[field] = raw_field;
    }
    if (typeof kept.was === "string" && typeof kept.text === "string" && kept.text !== kept.was) {
      clean[key] = kept;
    }
  }
  return clean;
}

/** Leitura defensiva do ficheiro guardado: nada la dentro se aplica sem `was`+`text`. */
function readStore(raw: unknown): CopyStore {
  const shaped = (raw ?? {}) as { text?: unknown; attrs?: unknown };
  return {
    text: cleanSection(shaped.text) as CopyTextMap,
    attrs: cleanSection(shaped.attrs) as CopyAttrMap,
  };
}

export const store: CopyStore = readStore(storedCopy);

// ---------------------------------------------------------------------------
// Aplicacao das gravacoes (corre em dev e no build)
// ---------------------------------------------------------------------------

let editing = false;

/** Em edicao os nos de texto sao substituidos por spans editaveis: a aplicacao
 *  automatica para, para nao competir com o que esta a ser escrito. */
export function setCopyEditing(active: boolean): void {
  editing = active;
}

export function isCopyEditing(): boolean {
  return editing;
}

/** Todos os nos de texto com conteudo, dentro de um root. */
function textNodesIn(root: ParentNode): Text[] {
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  const found: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if ((node.nodeValue ?? "").trim()) found.push(node);
  }
  return found;
}

/** Resultado da aplicacao: quantas entradas estao activas e quais nao foram
 *  encontradas nesta pagina (vivem em estados que só aparecem por interaccao:
 *  menu movel fechado, modulo por abrir, outro filtro do carrossel). */
export type CopyApplyReport = { total: number; applied: number; missing: string[] };

let lastReport: CopyApplyReport = { total: 0, applied: 0, missing: [] };

export function getCopyApplyReport(): CopyApplyReport {
  return lastReport;
}

type TextCandidate = { node: Text; key: string; text: string; anchor: string };

/** O unico candidato que satisfaz o predicado; null se houver dois (ambiguo). */
function uniqueCandidate<T>(all: T[], used: Set<T>, matches: (candidate: T) => boolean): T | null {
  let found: T | null = null;
  for (const candidate of all) {
    if (used.has(candidate) || !matches(candidate)) continue;
    if (found) return null;
    found = candidate;
  }
  return found;
}

/** Ultimos troços do caminho iguais — sobrevive a um elemento a mais ou a menos
 *  acima, que e' o que acontece quando a pagina ganha ou perde um wrapper. */
function sameTail(a: string, b: string, depth = 3): boolean {
  return a.split("/").slice(-depth).join("/") === b.split("/").slice(-depth).join("/");
}

function writeText(node: Text, next: string): boolean {
  const current = node.nodeValue ?? "";
  const lead = current.match(/^\s*/)?.[0] ?? "";
  const trail = current.match(/\s*$/)?.[0] ?? "";
  const value = `${lead}${next}${trail}`;
  if (value === current) return false;
  node.nodeValue = value;
  return true;
}

/**
 * Escreve os textos guardados. Cada entrada tenta, por esta ordem:
 *   1. a chave exacta (o caso normal);
 *   2. o mesmo fim de caminho (a pagina ganhou ou perdeu um elemento);
 *   3. texto original unico dentro da mesma seccao (a chave mudou de sitio).
 * Todas exigem que o texto actual ainda seja o original (`was`) e as tentativas
 * 2 e 3 exigem que o alvo seja unico: nunca se escreve por cima de outro texto
 * nem no lugar errado. Sem candidato, a entrada fica por aplicar e e' contada.
 */
function applyTextOverrides(root: ParentNode): { applied: number; missing: string[] } {
  const entries = Object.entries(store.text);
  const missing: string[] = [];
  if (entries.length === 0) return { applied: 0, missing };

  const candidates: TextCandidate[] = [];
  for (const node of textNodesIn(root)) {
    const key = textNodeKey(node);
    if (!key) continue;
    candidates.push({
      node,
      key,
      text: (node.nodeValue ?? "").trim(),
      anchor: sectionAnchor(node.parentElement),
    });
  }

  const index = elementIndex(root);
  const used = new Set<TextCandidate>();
  let applied = 0;
  for (const [key, entry] of entries) {
    const anchor = anchorForPath(key, (candidate) => index.get(candidate));
    const match =
      uniqueCandidate(candidates, used, (c) => c.key === key && c.text === entry.was) ??
      uniqueCandidate(candidates, used, (c) => c.text === entry.was && sameTail(c.key, key)) ??
      uniqueCandidate(
        candidates,
        used,
        (c) => c.text === entry.was && anchor !== "" && c.anchor === anchor,
      );
    if (!match) {
      missing.push(key);
      continue;
    }
    used.add(match);
    if (writeText(match.node, entry.text)) applied += 1;
  }
  return { applied, missing };
}

type AttrCandidate = { element: Element; path: string; anchor: string };

function applyAttributeOverrides(root: ParentNode): { applied: number; missing: string[] } {
  const entries = Object.entries(store.attrs);
  const missing: string[] = [];
  if (entries.length === 0) return { applied: 0, missing };

  const candidates: AttrCandidate[] = [];
  for (const element of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (insideUi(element)) continue;
    candidates.push({ element, path: elementPath(element), anchor: sectionAnchor(element) });
  }
  const byPath = new Map(candidates.map((candidate) => [candidate.path, candidate]));

  const used = new Set<AttrCandidate>();
  let applied = 0;

  for (const [key, entry] of entries) {
    const at = key.lastIndexOf("@");
    if (at < 0) continue;
    const path = key.slice(0, at);
    const attribute = key.slice(at + 1);
    const valueOf = (candidate: AttrCandidate) =>
      candidate.element.getAttribute(attribute)?.trim() ?? "";
    const anchor = anchorForPath(path, (candidate) => byPath.get(candidate)?.element);

    const pick = (matches: (candidate: AttrCandidate) => boolean): AttrCandidate | null => {
      let found: AttrCandidate | null = null;
      for (const candidate of candidates) {
        if (used.has(candidate) || !matches(candidate)) continue;
        if (found) return null; // ambiguo: nao se escreve nada
        found = candidate;
      }
      return found;
    };

    // Mesmas tentativas do texto: chave exacta, fim de caminho, ancora da seccao.
    const resolved =
      pick((c) => c.path === path && valueOf(c) === entry.was) ??
      pick((c) => sameTail(c.path, path) && valueOf(c) === entry.was) ??
      pick((c) => anchor !== "" && c.anchor === anchor && valueOf(c) === entry.was);

    if (!resolved) {
      missing.push(key);
      continue;
    }
    used.add(resolved);
    if (resolved.element.getAttribute(attribute) !== entry.text) {
      resolved.element.setAttribute(attribute, entry.text);
      applied += 1;
    }
  }
  return { applied, missing };
}

/** Escreve os textos guardados sobre a pagina e devolve o relatorio. */
export function applyCopyOverrides(root: ParentNode = document): CopyApplyReport {
  const total = Object.keys(store.text).length + Object.keys(store.attrs).length;
  if (editing || total === 0) {
    lastReport = { total, applied: 0, missing: [] };
    return lastReport;
  }
  const text = applyTextOverrides(root);
  const attrs = applyAttributeOverrides(root);
  lastReport = {
    total,
    applied: text.applied + attrs.applied,
    missing: [...text.missing, ...attrs.missing],
  };
  return lastReport;
}

/**
 * Aplica uma vez e volta a aplicar sempre que o React reescrever a pagina: o
 * React nao sabe das gravacoes, por isso um re-render (abrir uma FAQ, mudar de
 * modulo) repoe o texto original e e' preciso corrigi-lo de novo. A escrita e'
 * idempotente — depois de aplicar, o texto deixa de coincidir com `was` e a
 * passagem seguinte nao encontra nada para fazer, o que evita ciclos.
 */
export function watchCopyOverrides(): () => void {
  let frame = 0;
  const run = () => {
    frame = 0;
    applyCopyOverrides();
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(run);
  };

  run();
  if (Object.keys(store.text).length === 0 && Object.keys(store.attrs).length === 0) {
    return () => {};
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  };
}

// ---------------------------------------------------------------------------
// Edicao: nos de texto -> spans editaveis, ler o que foi escrito, desfazer
// ---------------------------------------------------------------------------

const TEXT_TARGET_CLASS = "copy-edit-text";

/**
 * Texto que nao vive num no de texto da pagina: `attr` sao valores de
 * atributos (placeholder, alt, aria-label, title); `option` e' o texto de uma
 * opcao de selector, que se grava como override de texto.
 */
export type AttrItem = {
  key: string;
  kind: "attr" | "option";
  attr: string;
  label: string;
  was: string;
  value: string;
};
export type CopyChanges = { text: CopyTextMap; attrs: CopyAttrMap };

/**
 * Envolve cada no de texto num span editavel. As chaves sao calculadas antes de
 * tocar no DOM (envolver um no acrescenta um elemento irmao, o que mudaria o
 * caminho de todos os que viessem depois).
 */
export function beginCopyEditing(): number {
  if (editing) return 0;

  // O `was` de cada entrada tem de ser sempre o texto ORIGINAL do JSX. Se o
  // texto que esta no ecra ja veio de uma gravacao anterior, guardar esse como
  // "original" quebrava a ligacao ao sitio: depois de recarregar, a pagina
  // mostra outra vez o texto do JSX, nao bate certo com o `was` e a alteracao
  // desaparecia. A tabela abaixo traduz "texto mostrado" -> "original".
  const pristine = new Map<string, string>();
  for (const entry of Object.values(store.text)) pristine.set(entry.text, entry.was);

  const targets: { node: Text; key: string; was: string; raw: string }[] = [];
  for (const node of textNodesIn(document.body)) {
    const parent = node.parentElement;
    if (!parent || isSkippedInline(parent)) continue;
    const key = textNodeKey(node);
    if (!key) continue;
    const raw = node.nodeValue ?? "";
    const displayed = raw.trim();
    const was = store.text[key]?.was ?? pristine.get(displayed) ?? displayed;
    targets.push({ node, key, was, raw });
  }
  for (const target of targets) {
    const wrapper = document.createElement("span");
    wrapper.className = TEXT_TARGET_CLASS;
    wrapper.dataset.copyKey = target.key;
    wrapper.dataset.copyWas = target.was;
    // O que estava no ecra ao abrir a edicao. Serve para saber o que mudou
    // nesta sessao: comparar com o `was` (original do JSX) acusaria como
    // alteracao tudo o que ja vem de uma gravacao anterior.
    wrapper.dataset.copyShown = target.raw.trim();
    wrapper.dataset.copyRaw = target.raw;
    wrapper.setAttribute("contenteditable", "plaintext-only");
    wrapper.setAttribute("spellcheck", "false");
    wrapper.textContent = target.raw;
    target.node.parentNode?.replaceChild(wrapper, target.node);
  }
  setCopyEditing(true);
  document.body.classList.add("copy-edit-mode");
  return targets.length;
}

function unwrap(keepEdits: boolean): void {
  for (const wrapper of Array.from(document.querySelectorAll<HTMLElement>(`.${TEXT_TARGET_CLASS}`))) {
    const parent = wrapper.parentNode;
    if (!parent) continue;
    const value = keepEdits ? wrapper.textContent ?? "" : wrapper.dataset.copyRaw ?? "";
    parent.replaceChild(document.createTextNode(value), wrapper);
    parent.normalize();
  }
  setCopyEditing(false);
  document.body.classList.remove("copy-edit-mode");
}

/** Sai da edicao mantendo o que foi escrito nesta sessao. */
export function commitCopyEditing(): void {
  unwrap(true);
}

/** Sai da edicao devolvendo o texto que a pagina tinha. */
export function revertCopyEditing(): void {
  unwrap(false);
}

/**
 * Strings que nao vivem num no de texto da pagina: placeholders, alt de
 * imagens, rotulos de leitores de ecra e o texto das opcoes de um selector.
 * Editam-se no painel, em campos — em linha seriam ilegiveis (um placeholder
 * nao tem texto para carregar).
 */
export function listEditableStrings(): AttrItem[] {
  const items: AttrItem[] = [];
  const seen = new Set<string>();
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    if (insideUi(element)) continue;
    const tag = element.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;

    const context = element.getAttribute("aria-label") ?? element.getAttribute("name") ?? "";
    for (const attr of EDITABLE_ATTRS) {
      const value = element.getAttribute(attr);
      if (!value || !value.trim()) continue;
      const key = attributeKey(element, attr);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key,
        kind: "attr",
        attr,
        label: context && attr !== "aria-label" ? `${attr} · ${context}` : attr,
        // O original mantem-se o do JSX mesmo que a pagina ja mostre uma
        // gravacao anterior (ver beginCopyEditing).
        was: store.attrs[key]?.was ?? value.trim(),
        value,
      });
    }

    if (tag === "OPTION") {
      const node = element.firstChild;
      if (node && node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? "").trim()) {
        const key = textNodeKey(node as Text);
        if (key && !seen.has(key)) {
          seen.add(key);
          const select = element.closest("select")?.getAttribute("aria-label") ?? "";
          items.push({
            key,
            kind: "option",
            attr: "",
            label: select ? `opção · ${select}` : "opção",
            was: store.text[key]?.was ?? (node.nodeValue ?? "").trim(),
            value: node.nodeValue ?? "",
          });
        }
      }
    }
  }
  return items;
}

/** O que mudou nesta sessao, no formato do ficheiro guardado. */
export function collectCopyChanges(attrDraft: Record<string, string> = {}): CopyChanges {
  const text: CopyTextMap = {};
  for (const wrapper of Array.from(document.querySelectorAll<HTMLElement>(`.${TEXT_TARGET_CLASS}`))) {
    const key = wrapper.dataset.copyKey;
    const was = wrapper.dataset.copyWas ?? "";
    if (!key || !was) continue;
    const next = (wrapper.textContent ?? "").trim();
    // Compara com o que estava no ecra ao abrir a edicao: assim uma entrada ja
    // gravada antes nao conta como alterada so por estar aplicada.
    if (!next || next === (wrapper.dataset.copyShown ?? "")) continue;
    text[key] = { text: next, was };
  }

  const attrs: CopyAttrMap = {};
  for (const item of listEditableStrings()) {
    const next = (attrDraft[item.key] ?? item.value).trim();
    if (!next || next === item.was) continue;
    // O texto de uma opcao de selector e' um no de texto como outro qualquer.
    if (item.kind === "option") text[item.key] = { text: next, was: item.was };
    else attrs[item.key] = { attr: item.attr, text: next, was: item.was };
  }

  return { text, attrs };
}

export function countCopyChanges(attrDraft: Record<string, string> = {}): number {
  const changes = collectCopyChanges(attrDraft);
  return Object.keys(changes.text).length + Object.keys(changes.attrs).length;
}