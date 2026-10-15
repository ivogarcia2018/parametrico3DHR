import io

PATH = r"src/components/GraphField.tsx"
lines = io.open(PATH, encoding="utf-8").read().split("\n")

HEADER = '''/**
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
'''.split("\n")

TAIL_FIG = '''  // Nota de caderno no canto direito da folha: uma linha do repertorio, muda
  // por figura, para quatro folhas vizinhas nao partilharem a mesma margem.
  addText(w * 0.6, -7, CODE_POOL[Math.floor(rand() * CODE_POOL.length)], 8, 0.3);

  ops.sort((a, b) => a.order - b.order);
  spots.sort((a, b) => a.order - b.order);
  return { ops, spots };
}'''.split("\n")

COMPOSER = '''
/** Colunas da grelha de folhas: 2 em desktop (2x2 = 4 pranchas), 1 em ecrã
 *  estreito, onde quatro folhas lado a lado seriam ilegiveis. */
function colsFor(w: number) {
  return w < 760 ? 1 : 2;
}

/** Baralho de figuras sem repeticao: gasta-se figura a figura e so' se volta a
 *  encher quando acaba. E' o que garante que as folhas de um ciclo sao
 *  diferentes entre si e que nenhuma reaparece de um ciclo para o outro. */
function makeDeck(seed: number) {
  let bag: Figure[] = [];
  return () => {
    if (!bag.length) {
      bag = FIGURES.slice();
      const r = mulberry32(seed);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop() as Figure;
  };
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
  const draw = makeDeck(Math.round(w) * 7919 + cycle * 104729);
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    cells.push({
      fig: draw(),
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
'''.split("\n")

SCENE = '''
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
'''.split("\n")

# --- Sanity checks on the original file (1-based line numbers) --------------
assert lines[151].startswith("/**"), lines[151]
assert lines[212].strip() == "{", lines[212]
assert lines[437].strip() == "}", lines[437]
assert lines[439].startswith("  // --- Faixa de codigo"), lines[439]
assert lines[460].strip() == "}", lines[460]

out = lines[:151] + HEADER + lines[212:437] + TAIL_FIG + COMPOSER + SCENE + lines[461:]
io.open(PATH, "w", encoding="utf-8", newline="\n").write("\n".join(out))
print("ok", len(out))
