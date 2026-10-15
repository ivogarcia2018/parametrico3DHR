import io

PATH = "src/components/GraphField.tsx"
s = io.open(PATH, encoding="utf-8").read()

def sub(old, new):
    global s
    assert old in s, old[:70]
    s = s.replace(old, new, 1)

OLD_DECK = """/** Baralho de figuras sem repeticao: gasta-se figura a figura e so' se volta a
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
}"""

NEW_DECK = """/** Baralho de figuras: gasta-se uma a uma e so' se re-enche quando acaba.
 *
 *  O estado vive no modulo, nao dentro de `composition`. Com o baralho criado
 *  por chamada, cada ciclo partia de uma nova shuffled completa e voltavam a
 *  sair as mesmas figuras em ciclos seguidos (medido: 3 de 4 folhas repetidas
 *  entre os ciclos 1 e 2). Guardando o resto do baralho, o ciclo seguinte herda
 *  as figuras que sobraram, e so' volta a aparecer uma figura 11/4 ciclos
 *  depois \u2014 no maximo uma vez dentro da mesma janela de quatro folhas.
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
}"""

sub(OLD_DECK, NEW_DECK)

sub("  const draw = makeDeck(Math.round(w) * 7919 + cycle * 104729);\n  const cells: Cell[] = [];\n"
    "  for (let i = 0; i < count; i++) {\n    cells.push({\n      fig: draw(),",
    "  const cells: Cell[] = [];\n  for (let i = 0; i < count; i++) {\n    cells.push({\n      fig: drawFigure(w),")

# O numero da prancha ja nao precisa do ciclo na semente; mantem-se a variavel
# `cycle` para a numeracao连续 das folhas.
io.open(PATH, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
