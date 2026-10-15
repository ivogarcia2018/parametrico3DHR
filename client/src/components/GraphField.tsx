import { useEffect, useRef } from "react";

/**
 * Fundo de prancha: um desenho de arquitectura que se traça sozinho.
 *
 * A primeira versao eram nos e fios a mover-se — lia-se como wireframe
 * generico, nao como desenho. Aqui o fundo e' um caderno de desenho CAD:
 * cada ciclo mostra quatro pranchas (grelha 2x2), cada uma com grelha de
 * modulo, cotas, corte hachurado, planta, alçado, radios, blocos em
 * axonometria ou componentes de grafo. As folhas traçam-se uma a uma,
 * pela ordem de leitura, e o sorteio nunca repete figura entre folhas
 * vizinhas nem de um ciclo para o outro.
 *
 * Canvas e nao SVG: a cena tem ~600 primitivas e redesenha-se a cada frame.
 * Em SVG seriam 700 elementos no DOM; em canvas e' um unico contexto 2D.
 *
 * Cor: cinzento medio a opacidade baixa, laranja #e96b3b so nos elementos
 * "quentes". Um branco a 10% desaparece nas seccoes claras (#f2efe6) e um
 * preto a 10% desaparece nas escuras (#171715); o cinzento ve-se nas duas, por
 * isso a mesma folha serve a pagina inteira sem detetar a seccao por baixo.
 *
 * Determinismo: PRNG semeado (mulberry32), nunca Math.random — a mesma janela
 * produz sempre a mesma folha.
 */

type Vec = { x: number; y: number };

/** Primitiva de desenho. `order` e' a posicao na folha (0 = esquerda): a
 *  animacao revela por ordem, nao por tempo fixo. */
type Op =
  | { kind: "line"; pts: Vec[]; order: number; weight: number; hot: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; order: number; weight: number; hot: number }
  | { kind: "arc"; cx: number; cy: number; r: number; a0: number; a1: number; order: number; weight: number; hot: number }
  | { kind: "text"; x: number; y: number; s: string; order: number; size: number; hot: number };

/** Ponto de interesse: acende durante o "solve" e conta um numero. */
type Spot = { x: number; y: number; label: string; value: number; shown: number; order: number };

const INK = (alpha: number) => `rgba(126,124,118,${alpha.toFixed(3)})`;
const HOT = (alpha: number) => `rgba(233,107,59,${alpha.toFixed(3)})`;

/** Opacidade global do fundo. Um unico numero para regular a presenca da
 *  folha inteira sobre o texto das seccoes — mexer aqui e' mexer em todo o
 *  resto, sem tocar nos escaloes relativos de `alphaFor`. */
const OPACITY = 0.5;

/** CYCLE: duracao de um tracado completo. Sao 4 folhas por ciclo, por isso o
 *  tracado ocupa 13 s (3,25 s por prancha) e o solve os 3 s restantes. */
const CYCLE = 16;
/** Segundos de traco antes de comecar o solve. E' o unico sitio onde a
 *  partition 11/5 estava escrita a mao em tres lugares diferentes. */
const DRAW = 13;
const MONO = '"IBM Plex Mono", monospace';

/** Nomes de componente do Grasshopper. A lista e' maior do que o maximo de
 *  componentes por figura, por isso o indice vai por modulo — indexar sem
 *  mais rebentava assim que o sorteio passou a devolver 6 componentes. */
const GH_LABELS = ["Pt", "Srf", "Crv", "Lerp", "Msh", "Move", "Trim", "Divide"];

/** Baralho de figuras. Um ciclo mostra varias folhas em simultaneo (ver
 *  `CELLS`), entao o sorteio tem de ser por folha e nao por ciclo: e' um
 *  baralho embaralhado sem repeticao, que so' se volta a encher quando acaba,
 *  garantindo que nenhuma figura se repete a ce ciclo nem de dois em dois. */
const FIGURES = [
  "plan", "radial", "section", "graph", "elevation", "axo",
  "diagrid", "spiral", "contour", "detail", "module",
] as const;

type Figure = (typeof FIGURES)[number];

/** folhas por ciclo. 4 em desktop (2x2) e 1 coluna estreita em mobile: um
 *  unico desenho de pagina inteira ficava esmagado num ecrã estreito. */
const CELLS_DESKTOP = 4;
const CELLS_MOBILE = 2;

/** Linha de nota de caderno no canto de cada folha. Uma por folha, sorteada — e' o que faz a margem mudar sem as quatro folhas do ciclo lerem igual. */
const CODE_POOL = [
  "waffle(24, t)", "Lerp(a, b, t)", "srf = Brep()", "count = 24", "fillet 0.5",
  "sweep.rail", "Pt(x, y, z)", "div = 6", "rev = true", "mesh = Cap()", "0.5 mm",
  "Pt(x, y, z).Move", "os = os.T", "gh = gh.In", "trim = Trim()", "rev = -1",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Amostragem de bezier cubica com tangentes horizontais nas duas pontas — o
 *  "S" que o Grasshopper desenha entre portas. Uma quadratica com um so'
 *  ponto de controlo dava um cabo pendurado. */
function cubic(p0: Vec, c1: Vec, c2: Vec, p1: Vec, steps = 24): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    });
  }
  return out;
}

/** Opacidade por peso de traco. Derivar a opacidade da espessura dava maus
 *  resultados: a grelha de fundo ficava igual a moldura, ou a hachura
 *  desaparecia. Aqui a dosagem e' por escaloes, com a grelha na cota de baixo. */
function alphaFor(kind: Op["kind"], weight: number): number {
  if (kind === "text") return 0.6;
  if (weight >= 1.3) return 0.74; // moldura da prancha
  if (weight >= 1.1) return 0.66; // perfil em evidencia
  if (weight >= 0.9) return 0.54; // traco corrente
  if (weight >= 0.7) return 0.44; // traco interior
  if (weight >= 0.55) return 0.32; // hachura, cotas
  return 0.13; // grelha de modulo
}


/** Desenha so' os primeiros `reveal` da polilinha, em comprimento de
 *  percurso — e' o que da a sensacao de lapis a avancar, em vez de a linha
 *  aparecer do nada. */
function strokeUpTo(g: CanvasRenderingContext2D, pts: Vec[], reveal: number) {
  if (reveal <= 0) return;
  if (reveal >= 1) {
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    return;
  }
  let total = 0;
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(total);
  }
  const want = total * reveal;
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    if (lens[i] <= want) {
      g.lineTo(pts[i].x, pts[i].y);
    } else {
      const seg = lens[i] - lens[i - 1];
      const f = seg > 0 ? (want - lens[i - 1]) / seg : 0;
      g.lineTo(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f);
      break;
    }
  }
}

/** true se o ponto esta dentro do poligono (ray casting). Usado para hachurar
 *  o interior de um perfil sem depender de clip paths. */
function inside(poly: Vec[], px: number, py: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * Uma folha: uma figura desenhada dentro de uma caixa local (0,0)-(w,h).
 *
 * O `order` de cada primitiva e' local a folha (0 = lado esquerdo). Quem
 * compoe as celulas converte-o para a posicao na folha inteira, para o traco
 * avancar de prancha em prancha em vez de correr em zigue-zague pelas quatro.
 */
function buildFigure(
  kind: Figure,
  w: number,
  h: number,
  rand: () => number,
  sheetNo: number
): { ops: Op[]; spots: Spot[] } {
  const ops: Op[] = [];
  const spots: Spot[] = [];
  const order = (x: number) => Math.max(0, Math.min(1, x / w));

  const addLine = (pts: Vec[], weight = 1, hot = 0) => ops.push({ kind: "line", pts, order: order(pts[0].x), weight, hot });
  const addRect = (x: number, y: number, rw: number, rh: number, weight = 1, hot = 0) =>
    ops.push({ kind: "rect", x, y, w: rw, h: rh, order: order(x), weight, hot });
  const addArc = (cx: number, cy: number, r: number, a0: number, a1: number, weight = 1, hot = 0) =>
    ops.push({ kind: "arc", cx, cy, r, a0, a1, order: order(cx - r), weight, hot });
  const addText = (x: number, y: number, s: string, size = 9, hot = 0) =>
    ops.push({ kind: "text", x, y, s, order: order(x), size, hot });

  // A figura vive na origem local: `x`/`y` sao 0 e `w`/`h` o lado util da
  // moldura, para cada desenho se dimensionar em fraccoes da propria caixa.
  const x = 0;
  const y = 0;
  const lead = true;
  const ox = 0;
  // Contagens para um quarto de tela (2x2). Os numeros que serviam a folha
  // unica deixavam aqui um anel de 46 raios dentro de uma caixa de ~700 px,
  // que se lia como ruido em vez de estrutura.
  const ribs = 20 + Math.floor(rand() * 16);
  const nodesN = 5 + Math.floor(rand() * 3);
  const barsN = 6 + Math.floor(rand() * 5);
  const slabs = 3 + Math.floor(rand() * 3);
  const hatchN = 34 + Math.floor(rand() * 34);

  {
      // Moldura e marcas de canto, como num desenho tecnico.
      addRect(x, y, w, h, 1.4);
      const tick = 14;
      addLine([{ x, y }, { x: x + tick, y }], 1.4);
      addLine([{ x, y }, { x, y: y + tick }], 1.4);
      addLine([{ x: x + w, y: y + h }, { x: x + w - tick, y: y + h }], 1.4);
      addLine([{ x: x + w, y: y + h }, { x: x + w, y: y + h - tick }], 1.4);
      addText(x, y - 7, `${kind.toUpperCase()} / ${String(sheetNo).padStart(2, "0")}`, 8, lead ? 0.6 : 0);

      if (kind === "plan") {
        // Planta: malha de vaos, com um nucleo marcado a laranja. A malha cresce
        // com a figura — 3 vaos num nono de tela eram um desenho dentro de outro;
        // em tela grande le-se como um piso portico.
        const n = 4;
        for (let i = 1; i < n; i++) {
          addLine([{ x: x + (w * i) / n, y }, { x: x + (w * i) / n, y: y + h }], 0.8);
          addLine([{ x, y: y + (h * i) / n }, { x: x + w, y: y + (h * i) / n }], 0.8);
        }
        addRect(x + w * 0.34, y + h * 0.34, w * 0.32, h * 0.32, 1.2, 1);
        spots.push({ x: x + w * 0.5, y: y + h * 0.5, label: "Ø 5 000", value: 5000, shown: 0, order: ox });
        addLine([{ x, y: y + h + 16 }, { x: x + w, y: y + h + 16 }], 0.8);
        addLine([{ x, y: y + h + 12 }, { x, y: y + h + 20 }], 0.8);
        addLine([{ x: x + w, y: y + h + 12 }, { x: x + w, y: y + h + 20 }], 0.8);
      } else if (kind === "radial") {
        // Planta do pavilhao em aneis concentricos com raios. A primeira
        // versao eram costelas num leque e lia-se como uma aranha; em planta,
        // os aneis dao a leitura de estrutura.
        const cx = x + w / 2;
        const cy = y + h * 0.52;
        const r = Math.min(w, h) * 0.36;
        addArc(cx, cy, r, 0, Math.PI * 2, 1.3, 1);
        addArc(cx, cy, r * 0.62, 0, Math.PI * 2, 0.9);
        addArc(cx, cy, r * 0.26, 0, Math.PI * 2, 0.9);
        for (let i = 0; i < ribs; i++) {
          const a = (i / ribs) * Math.PI * 2;
          addLine(
            [
              { x: cx + Math.cos(a) * r * 0.26, y: cy + Math.sin(a) * r * 0.26 },
              { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r },
            ],
            0.7,
            i % 4 === 0 ? 0.55 : 0
          );
        }
        // Banco central.
        addLine([{ x: cx - r * 0.26, y: cy }, { x: cx + r * 0.26, y: cy }], 0.8);
        spots.push({ x: cx, y: cy - r - 14, label: "24 costelas", value: 24, shown: 0, order: ox });
      } else if (kind === "section") {
        // Corte: perfil a cheio com hachura a 45 graus por baixo.
        const base = y + h * 0.78;
        const poly: Vec[] = [
          { x: x + w * 0.12, y: base },
          { x: x + w * 0.3, y: y + h * 0.34 },
          { x: x + w * 0.7, y: y + h * 0.34 },
          { x: x + w * 0.88, y: base },
        ];
        addLine(poly, 1.4, 1);
        addLine([{ x: x + w * 0.12, y: base }, { x: x + w * 0.88, y: base }], 1.2);
        for (let i = 0; i < hatchN; i++) {
          const px = x + w * 0.1 + rand() * w * 0.8;
          const py = y + h * 0.32 + rand() * (h * 0.46);
          if (inside(poly, px, py)) addLine([{ x: px, y: py }, { x: px + 7, y: py + 7 }], 0.6);
        }
        addLine([{ x: x + w * 0.94, y: y + h * 0.34 }, { x: x + w * 0.94, y: base }], 0.8);
        addText(x + w * 0.14, y + h * 0.26, "corte A-A", 8, 0.5);
      } else if (kind === "elevation") {
        // Alcado: verticais de alturas varias sobre a linha de terre, fechadas
        // por um perfil de cobertura, e cota de altura.
        const base = y + h * 0.84;
        const roof: Vec[] = [];
        for (let i = 0; i < barsN; i++) {
          const px = x + w * 0.14 + (i * w * 0.72) / (barsN - 1);
          const ph = h * (0.3 + rand() * 0.32);
          roof.push({ x: px, y: base - ph });
          addLine([{ x: px, y: base }, { x: px, y: base - ph }], 0.9, i === 3 ? 1 : 0);
        }
        addLine(roof, 1.2, 1);
        addLine([{ x: x + w * 0.12, y: base }, { x: x + w * 0.88, y: base }], 1.2);
        addLine([{ x: x + w * 0.08, y: y + h * 0.3 }, { x: x + w * 0.08, y: base }], 0.8);
        addLine([{ x: x + w * 0.05, y: y + h * 0.3 }, { x: x + w * 0.11, y: y + h * 0.3 }], 0.8);
        addLine([{ x: x + w * 0.05, y: base }, { x: x + w * 0.11, y: base }], 0.8);
        addText(x + w * 0.12, y + h * 0.27, "h 3 000", 8);
      } else if (kind === "axo") {
        // Axonometria explodida: tres lajes com arestas verticais a ligar as
        // successivas. Sem essas arestas eram laminas soltas e nao se liam
        // como volume.
        const rings: Vec[][] = [];
        for (let i = 0; i < slabs; i++) {
          const bx = x + w * 0.2 + i * w * 0.1;
          const by = y + h * 0.68 - i * h * 0.2;
          const bw = w * 0.36;
          const dx = w * 0.085;
          const dy = h * 0.07;
          const ring: Vec[] = [
            { x: bx, y: by },
            { x: bx + bw, y: by },
            { x: bx + bw + dx, y: by - dy },
            { x: bx + dx, y: by - dy },
          ];
          addLine(ring, 0.9, i === 2 ? 1 : 0);
          addLine([ring[0], ring[3]], 0.7);
          addLine([ring[1], ring[2]], 0.7);
          rings.push(ring);
        }
        for (let i = 0; i < slabs - 1; i++) {
          for (let k = 0; k < 4; k++) addLine([rings[i][k], rings[i + 1][k]], 0.6);
        }
      } else if (kind === "graph") {
        // Grafo: componentes com cruzes e fios em S, como no Grasshopper.
        // As caixas levam uma unidade `u` derivada do lado menor da figura: com
        // um tamanho fixo em pixels, um no ficava do tamanho de uma letra
        // dentro da moldura e o grafo lia-se como uma frase com a palavra
        // "ON".
        const u = Math.min(w, h) * 0.032;
        const n = nodesN;
        const nodes: Vec[] = [];
        for (let i = 0; i < n; i++) {
          const px = x + w * 0.16 + (i * w * 0.68) / (n - 1);
          // A ondulacao ocupa agora a altura toda da figura, para os fios em S
          // terem percurso em vez de uma ondulacao achatada no meio.
          const py = y + h * 0.5 + (i % 2 === 0 ? -1 : 1) * h * 0.22;
          nodes.push({ x: px, y: py });
          addRect(px - u, py - u, u * 2, u * 2, 1.2, i === n - 1 ? 1 : 0);
          addLine([{ x: px - u * 0.27, y: py - u * 0.27 }, { x: px + u * 0.27, y: py + u * 0.27 }], 0.7);
          addLine([{ x: px + u * 0.27, y: py - u * 0.27 }, { x: px - u * 0.27, y: py + u * 0.27 }], 0.7);
          addText(px - u, py - u * 1.55, GH_LABELS[i % GH_LABELS.length], 8, i === n - 1 ? 0.6 : 0);
        }
        for (let i = 0; i < n - 1; i++) {
          const p0 = { x: nodes[i].x + u, y: nodes[i].y };
          const p1 = { x: nodes[i + 1].x - u, y: nodes[i + 1].y };
          const mid = (p0.x + p1.x) / 2;
          const c1 = { x: mid, y: p0.y };
          const c2 = { x: mid, y: p1.y };
          addLine(cubic(p0, c1, c2, p1), 1, i === n - 2 ? 0.8 : 0);
        }
        spots.push({ x: nodes[n - 1].x, y: nodes[n - 1].y + u * 2.4, label: "0.5 mm", value: 5, shown: 0, order: ox });
      } else if (kind === "diagrid") {
        // Diagrid: quadrícula triangulada, a malha de estrutura de一章im.
        const n = 4 + Math.floor(rand() * 3);
        const dx = w / n;
        const dy = h / n;
        for (let i = 0; i <= n; i++) {
          addLine([{ x: x + i * dx, y }, { x: x + i * dx, y: y + h }], 0.6);
          addLine([{ x, y: y + i * dy }, { x: x + w, y: y + i * dy }], 0.6);
        }
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if ((i + j) % 2 === 0) continue;
            addLine([{ x: x + i * dx, y: y + j * dy }, { x: x + (i + 1) * dx, y: y + (j + 1) * dy }], 0.7);
          }
        }
        spots.push({ x: x + w * 0.5, y: y - 10, label: "diagrid", value: 0, shown: 0, order: ox });
      } else if (kind === "spiral") {
        // Espiral com radios de referencia: a espinha do pavilhao.
        const cx = x + w * 0.5;
        const cy = y + h * 0.56;
        const pts: Vec[] = [];
        const turns = 1.6 + rand();
        for (let s = 0; s <= 60; s++) {
          const a = (s / 60) * Math.PI * 2 * turns;
          const r = ((s / 60) * Math.min(w, h) * 0.42) + Math.min(w, h) * 0.04;
          pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.82 });
        }
        addLine(pts, 1.3, 1);
        for (let i = 0; i < 12; i++) {
          const t = i / 12;
          const a = t * Math.PI * 2 * turns;
          const r = t * Math.min(w, h) * 0.42 + Math.min(w, h) * 0.04;
          addLine(
            [
              { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.82 },
              { x: cx + Math.cos(a) * (r + 9), y: cy + Math.sin(a) * (r + 9) * 0.82 },
            ],
            0.6
          );
        }
      } else if (kind === "contour") {
        // Curvas de nivel: curvas fechadas irregulares, uma por cota.
        const layers = 3 + Math.floor(rand() * 3);
        for (let L = layers; L > 0; L--) {
          const k = L / layers;
          const pts: Vec[] = [];
          for (let s = 0; s < 40; s++) {
            const a = (s / 40) * Math.PI * 2;
            const wob = 1 + 0.16 * Math.sin(a * 3 + L) + 0.08 * Math.sin(a * 5 - L);
            pts.push({
              x: x + w * 0.5 + Math.cos(a) * w * 0.4 * k * wob,
              y: y + h * 0.5 + Math.sin(a) * h * 0.4 * k * wob,
            });
          }
          addLine(pts, L === 1 ? 1.2 : 0.7, L === 1 ? 1 : 0);
        }
      } else if (kind === "detail") {
        // Pormenor de encontro: duas pecas separadas por uma folga, com
        // linha de chamada e rotulo — o desenho de um unico node.
        const cy = y + h * 0.55;
        addRect(x + w * 0.18, cy - h * 0.14, w * 0.28, h * 0.28, 1.2, 1);
        addRect(x + w * 0.5, cy - h * 0.14, w * 0.28, h * 0.28, 1.2, 1);
        addLine([{ x: x + w * 0.46, y: cy }, { x: x + w * 0.5, y: cy }], 0.9, 1);
        for (let i = 0; i < 4; i++) {
          addLine([{ x: x + w * 0.2, y: cy - h * 0.1 + i * h * 0.06 }, { x: x + w * 0.44, y: cy - h * 0.1 + i * h * 0.06 }], 0.6);
        }
        addLine([{ x: x + w * 0.66, y: cy }, { x: x + w * 0.82, y: y + h * 0.28 }], 0.8);
        addArc(x + w * 0.86, y + h * 0.24, 13, 0, Math.PI * 2, 1, 1);
        addText(x + w * 0.83, y + h * 0.27, "A", 9, 1);
        addText(x + w * 0.18, cy + h * 0.22, "folga 0,5", 8);
      } else {
        // Module: grelha modular com uma celula destacada e cota.
        const n = 4 + Math.floor(rand() * 4);
        const cell = 2 + Math.floor(rand() * (n - 2));
        const cw = w / n;
        const chh = h / n;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === cell && j === cell) continue;
            addRect(x + i * cw, y + j * chh, cw, chh, 0.7);
          }
        }
        addRect(x + cell * cw, y + cell * chh, cw, chh, 1.3, 1);
        addLine([{ x, y: y + h + 14 }, { x: x + w, y: y + h + 14 }], 0.7);
        addLine([{ x, y: y + h + 10 }, { x, y: y + h + 18 }], 0.7);
        addLine([{ x: x + w, y: y + h + 10 }, { x: x + w, y: y + h + 18 }], 0.7);
        spots.push({ x: x + (cell + 0.5) * cw, y: y + (cell + 0.5) * chh, label: "mod", value: 0, shown: 0, order: ox });
      }
  // Nota de caderno no canto direito da folha: uma linha do repertorio, muda
  // por figura, para quatro folhas vizinhas nao partilharem a mesma margem.
  addText(w * 0.6, -7, CODE_POOL[Math.floor(rand() * CODE_POOL.length)], 8, 0.3);

  } // fecha o bloco da figura: moldura + um unico desenho por folha

  ops.sort((a, b) => a.order - b.order);
  spots.sort((a, b) => a.order - b.order);
  return { ops, spots };
}

/** Colunas da grelha de folhas: 2 em desktop (2x2 = 4 pranchas), 1 em ecrã
 *  estreito, onde quatro folhas lado a lado seriam ilegiveis. */
function colsFor(w: number) {
  return w < 760 ? 1 : 2;
}

/** Baralho de figuras: gasta-se uma a uma e so' se re-enche quando acaba.
 *
 *  O estado vive no modulo, nao dentro de `composition`. Com o baralho criado
 *  por chamada, cada ciclo partia de uma nova shuffled completa e voltavam a
 *  sair as mesmas figuras em ciclos seguidos (medido: 3 de 4 folhas repetidas
 *  entre os ciclos 1 e 2). Guardando o resto do baralho, o ciclo seguinte herda
 *  as figuras que sobraram, e so' volta a aparecer uma figura 11/4 ciclos
 *  depois — no maximo uma vez dentro da mesma janela de quatro folhas.
 *
 *  A re-embaralhar usa a semente da janela, por isso e' deterministica: a mesma
 *  largura produz sempre a mesma sequencia. */
let deckBag: Figure[] = [];
let deckSeed = 0;

function drawFigure(w: number): Figure {
  const seed = Math.round(w) * 7919;
  if (deckSeed !== seed || !deckBag.length) {
    deckSeed = seed;
    deckBag = FIGURES.slice();
    const r = mulberry32(seed);
    for (let i = deckBag.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [deckBag[i], deckBag[j]] = [deckBag[j], deckBag[i]];
    }
  }
  return deckBag.pop() as Figure;
}

type Cell = { fig: Figure; x: number; y: number; w: number; h: number; number: number };
type Composition = { w: number; h: number; cols: number; cells: Cell[] };

/** Distribui as folhas do ciclo. `count` e' o numero de pranchas visiveis: 4 em
 *  desktop, 2 em mobile. A semente junta a janela ao ciclo, por isso a mesma
 *  janela mostra sempre a mesma folha. */
function composition(w: number, h: number, cycle: number): Composition {
  const cols = colsFor(w);
  const count = w < 760 ? CELLS_MOBILE : CELLS_DESKTOP;
  const rows = Math.ceil(count / cols);
  const padX = w * 0.06;
  const padY = h * 0.09;
  const gapX = w * 0.035;
  const gapY = h * 0.055;
  const cellW = (w - padX * 2 - gapX * (cols - 1)) / cols;
  const cellH = (h - padY * 2 - gapY * (rows - 1)) / rows;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    cells.push({
      fig: drawFigure(w),
      x: padX + (i % cols) * (cellW + gapX),
      y: padY + Math.floor(i / cols) * (cellH + gapY),
      w: cellW,
      h: cellH,
      // Numero de prancha continuo atraves dos ciclos: a pagina le-se como um
      // caderno de folhas em numeracao, nao como quatro paineis soltos.
      number: cycle * count + i + 1,
    });
  }
  return { w, h, cols, cells };
}


/**
 * Junta as folhas do ciclo numa unica lista de primitivas, em coordenadas de
 * tela. Cada folha ocupa uma faixa da linha do tempo de revelacao, pela ordem
 * de leitura, para a animacao passar de prancha em prancha.
 */
function buildScene(comp: Composition, rand: () => number): { ops: Op[]; spots: Spot[] } {
  const ops: Op[] = [];
  const spots: Spot[] = [];
  const count = comp.cells.length;

  // Grelha de modulo: o papel milimetrado por baixo de tudo, em coordenadas de
  // tela. O modulo tambem varia, senao todas as folhas partilham a quadrícula.
  const mod = 46 + Math.floor(rand() * 22);
  const sheetOrder = (x: number) => Math.max(0, Math.min(1, x / comp.w));
  for (let gx = mod; gx < comp.w; gx += mod)
    ops.push({ kind: "line", pts: [{ x: gx, y: 0 }, { x: gx, y: comp.h }], order: sheetOrder(gx), weight: 0.5, hot: 0 });
  for (let gy = mod; gy < comp.h; gy += mod)
    ops.push({ kind: "line", pts: [{ x: 0, y: gy }, { x: comp.w, y: gy }], order: 0, weight: 0.5, hot: 0 });

  for (let i = 0; i < count; i++) {
    const cell = comp.cells[i];
    const sheet = buildFigure(cell.fig, cell.w, cell.h, rand, cell.number);
    // `order` local (0..1) -> posicao na folha inteira: a celula i ocupa
    // [i/count, (i+1)/count], o que faz a revelacao seguir a ordem de leitura.
    const base = i / count;
    const span = 1 / count;
    for (const op of sheet.ops) {
      const o = base + op.order * span;
      if (op.kind === "line") {
        ops.push({ ...op, pts: op.pts.map((p) => ({ x: p.x + cell.x, y: p.y + cell.y })), order: o });
      } else if (op.kind === "arc") {
        ops.push({ ...op, cx: op.cx + cell.x, cy: op.cy + cell.y, order: o });
      } else {
        ops.push({ ...op, x: op.x + cell.x, y: op.y + cell.y, order: o });
      }
    }
    for (const s of sheet.spots) {
      spots.push({ ...s, x: s.x + cell.x, y: s.y + cell.y, order: base + s.order * span });
    }
  }

  ops.sort((a, b) => a.order - b.order);
  spots.sort((a, b) => a.order - b.order);
  return { ops, spots };
}


export default function GraphField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const maybeCanvas = canvasRef.current;
    if (!maybeCanvas) return;
    // Alias nao-nulo: o TS nao propaga o estreitamento para funcoes aninhadas.
    const canvas: HTMLCanvasElement = maybeCanvas;
    const got = canvas.getContext("2d");
    if (!got) return;
    const g: CanvasRenderingContext2D = got;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ops: Op[] = [];
    let spots: Spot[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let startTime = 0;
    let cycleIndex = 0;
    /** Rato, normalizado a [-1, 1]. `active` desliga o campo quando o ponteiro
     *  sai da janela, para o desenho assentar quando ninguem esta a mexer. */
    let mx = 0;
    let my = 0;
    let active = false;
    const CYCLE_MS = CYCLE * 1000;

    function build() {
      // `composition` sorteia as folhas (baralho sem repeticao) e distribui-as
      // na grelha; `buildScene` desenha cada uma na sua caixa e traduz as
      // coordenadas locais para a tela. A semente junta a janela ao ciclo: a
      // mesma janela mostra sempre a mesma folha.
      const comp = composition(width, height, cycleIndex);
      const seed = Math.round(width) * 7919 + cycleIndex * 104729;
      const scene = buildScene(comp, mulberry32(seed));
      ops = scene.ops;
      spots = scene.spots;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function onPointerMove(event: PointerEvent) {
      mx = (event.clientX / width) * 2 - 1;
      my = (event.clientY / height) * 2 - 1;
      active = true;
    }

    function onPointerLeave() {
      active = false;
    }

    function draw() {
      const now = performance.now();
      // Ao dar a volta no ciclo, sorteia-se uma folha nova. Detecta-se pelo
      // indice, e nao por `pos < anterior`, para nao falhar num frame perdido.
      const cyc = Math.floor((now - startTime) / CYCLE_MS);
      if (cyc !== cycleIndex) {
        cycleIndex = cyc;
        build();
      }

      const pos = ((now - startTime) % CYCLE_MS) / 1000;
      // 0—DRAW s as quatro folhas tracam-se; DRAW—CYCLE s uma onda de
      // "solve" atravessa a folha e os numeros correm para os valores finais.
      const solve = pos >= DRAW ? (pos - DRAW) / (CYCLE - DRAW) : -1;
      const front = solve * (width + 300) - 150;

      // Sem banda de silêncio: a folha e' mesmo um fundo (z-20, abaixo do
      // conteudo em z-30), por isso nao compete com a leitura e pode ocupar a
      // altura toda com a mesma presenca. A hierarquia visual vem dos pesos de
      // `alphaFor`, nao de apagar uma faixa da tela.
      const cursorX = ((mx + 1) / 2) * width;
      const cursorY = ((my + 1) / 2) * height;
      const FIELD = Math.min(width, height) * 0.28;

      g.clearRect(0, 0, width, height);

      for (const op of ops) {
        // Cada primitiva entra quando a frente de traço passa por ela, e
        // demora 0,35 s a sair. O escalonamento e' por posicao na folha, por
        // isso a ordem e' a da leitura da esquerda para a direita.
        // `order` ja e' a posicao na folha inteira (a celula i ocupa
        // [i/4, (i+1)/4]), por isso a frente de traco percorre as pranchas
        // pela ordem de leitura sem mais nenhuma conversao.
        const born = op.order * DRAW;
        const local = reduced ? 1 : (pos - born) / 0.35;
        if (local <= 0) continue;
        const reveal = Math.min(1, local);
        // Depois de tracada, a primitiva desvanece um pouco ate ao fim do
        // ciclo, para o proximo traco comecar de uma folha limpa.
        const fade = reduced ? 1 : pos > DRAW - 3 ? Math.max(0, 1 - (pos - (DRAW - 3)) / 2.6) : 1;
        if (fade <= 0) continue;

        // Elementos perto da frente do solve acendem a laranja. Cada tipo de
        // primitiva tem a sua referencia horizontal para medir a distancia.
        const cx = op.kind === "arc" ? op.cx : op.kind === "line" ? op.pts[0].x : op.x;
        const cy0 = op.kind === "arc" ? op.cy : op.kind === "line" ? op.pts[0].y : op.y;
        const wave = solve >= 0 ? Math.max(0, 1 - Math.abs(cx - front) / 260) : 0;

        // Campo do rato: dentro do raio a primitiva acende e e' empurrada
        // para longe do ponteiro. E' o que faz o desenho responder ao rato em
        // vez de ser so' uma pelicula por tras.
        const d = Math.hypot(cx - cursorX, cy0 - cursorY);
        const near = active && d < FIELD ? 1 - d / FIELD : 0;
        const push = near * near * 13;
        const ux = d > 0.001 ? (cx - cursorX) / d : 0;
        const uy = d > 0.001 ? (cy0 - cursorY) / d : 0;

        const heat = Math.max(op.hot * 0.55, wave, near * 0.95);
        // `text` nao tem espessura: usa a mesma base dos tracos finos.
        const weight = op.kind === "text" ? 1 : op.weight;

        // Um unico multiplicador para a folha inteira: 0,5 = metade da opacidade
        // do traco tal como e' desenhado, sobre o fundo da seccao. Os escaloes
        // de `alphaFor` sao relativos — a moldura continua a pesar mais que a
        // grelha — mas todas as primitivas partilham a mesma atenuacao.
        const a = alphaFor(op.kind, weight) * fade * OPACITY;
        g.lineWidth = weight;
        g.strokeStyle = heat > 0.02 ? HOT(a * (0.5 + heat)) : INK(a);
        g.fillStyle = heat > 0.02 ? HOT(a * (0.6 + heat)) : INK(a * 1.1);

        if (op.kind === "line") {
          g.beginPath();
          // O deslocamento aplica-se so' quando o rato esta em cima: sem ele
          // seria um custo de um array novo por segmento, a 60 fps, sempre.
          if (push > 0.01) {
            strokeUpTo(g, op.pts.map((p) => ({ x: p.x + ux * push, y: p.y + uy * push })), reveal);
          } else {
            strokeUpTo(g, op.pts, reveal);
          }
          g.stroke();
        } else if (op.kind === "rect") {
          const r = Math.min(1, reveal * 1.6);
          g.strokeRect(op.x + ux * push, op.y + uy * push, op.w * r, op.h * r);
        } else if (op.kind === "arc") {
          g.beginPath();
          g.arc(op.cx + ux * push, op.cy + uy * push, op.r, op.a0, op.a0 + (op.a1 - op.a0) * reveal, false);
          g.stroke();
        } else {
          g.font = `${op.size}px ${MONO}`;
          g.fillText(op.s, op.x + ux * push, op.y + uy * push);
        }
      }

      // As cotas: so' aparecem quando a sua figura ja esta tracada, e o numero
      // conta para o valor em vez de aparecer de repente.
      for (const spot of spots) {
        if (pos < spot.order * DRAW + 0.9) continue;
        const fade = reduced ? 1 : pos > DRAW - 3 ? Math.max(0, 1 - (pos - (DRAW - 3)) / 2.6) : 1;
        if (fade <= 0) continue;
        // Sob o rato, a cota conta mais depressa — como se estivesse a ser
        // lida. E' o gesto que fecha a interacao com a parte mais legivel
        // do desenho.
        const sd = Math.hypot(spot.x - cursorX, spot.y - cursorY);
        const snear = active && sd < FIELD ? 1 - sd / FIELD : 0;
        spot.shown += (spot.value - spot.shown) * (0.06 + snear * 0.22);
        const sAlpha = (0.34 + snear * 0.5) * fade * OPACITY;
        g.font = `9px ${MONO}`;
        g.fillStyle = HOT(sAlpha);
        g.fillText(spot.label, spot.x - g.measureText(spot.label).width / 2, spot.y);
        if (spot.value >= 24) {
          const n = String(Math.round(spot.shown));
          g.fillStyle = INK(0.34 * fade);
          g.fillText(n, spot.x - g.measureText(n).width / 2, spot.y + 11);
        }
      }

      if (reduced) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(draw);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduced && !raf) {
        startTime = performance.now() - (startTime % CYCLE_MS);
        raf = requestAnimationFrame(draw);
      }
    }

    let resizeTimer = 0;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        startTime = performance.now() - (startTime % CYCLE_MS);
        if (reduced) draw();
      }, 180);
    }

    resize();
    startTime = performance.now();
    draw();

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="graph-field" />;
}

