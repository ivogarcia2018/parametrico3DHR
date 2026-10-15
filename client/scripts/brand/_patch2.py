import io

PATH = "src/components/GraphField.tsx"
s = io.open(PATH, encoding="utf-8").read()

def sub(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new, 1)

# 1) CODE_POOL module-level + corrected cell comment.
sub(
    "const CELLS_DESKTOP = 4;\nconst CELLS_MOBILE = 2;",
    "const CELLS_DESKTOP = 4;\nconst CELLS_MOBILE = 2;\n\n"
    "/** Linha de nota de caderno no canto de cada folha. Uma por folha, "
    "sorteada \u2014 e' o que faz a margem mudar sem as quatro folhas do ciclo "
    "lerem igual. */\nconst CODE_POOL = [\n"
    '  "waffle(24, t)", "Lerp(a, b, t)", "srf = Brep()", "count = 24", "fillet 0.5",\n'
    '  "sweep.rail", "Pt(x, y, z)", "div = 6", "rev = true", "mesh = Cap()", "0.5 mm",\n'
    '  "Pt(x, y, z).Move", "os = os.T", "gh = gh.In", "trim = Trim()", "rev = -1",\n'
    "];",
)

# 2) build() agora compoe as folhas do ciclo.
old_build = """    function build() {
      // A semente junta a largura ao indice do ciclo: a moldura fica identica
      // (uma celula so, a tela toda), mas a figura e' sempre outra. O numero
      // da prancha e' o proprio ciclo, para o rodape subiu a cada volta.
      const seed = Math.round(width) * 7919 + cycleIndex * 104729;
      const scene = buildScene(width, height, mulberry32(seed), cycleIndex + 1);
      ops = scene.ops;
      spots = scene.spots;
    }"""
new_build = """    function build() {
      // `composition` sorteia as folhas (baralho sem repeticao) e distribui-as
      // na grelha; `buildScene` desenha cada uma na sua caixa e traduz as
      // coordenadas locais para a tela. A semente junta a janela ao ciclo: a
      // mesma janela mostra sempre a mesma folha.
      const comp = composition(width, height, cycleIndex);
      const seed = Math.round(width) * 7919 + cycleIndex * 104729;
      const scene = buildScene(comp, mulberry32(seed));
      ops = scene.ops;
      spots = scene.spots;
    }"""
sub(old_build, new_build)

# 3) Docstring do topo: descrever as 4 folhas.
sub(
    " * A primeira versao eram nos e fios a mover-se \u2014 lia-se como wireframe\n"
    " * generico, nao como desenho. Aqui o fundo e' uma folha de desenho CAD: grelha\n"
    " * de modulo, cotas, corte hachurado, planta, al\u00e7ado, radios, blocos em\n"
    " * axonometria e componentes de grafo, todos aerea-se da esquerda para a\n"
    " * direita pela ordem em que um desenhista os faria.",
    " * A primeira versao eram nos e fios a mover-se \u2014 lia-se como wireframe\n"
    " * generico, nao como desenho. Aqui o fundo e' um caderno de desenho CAD:\n"
    " * cada ciclo mostra quatro pranchas (grelha 2x2), cada uma com grelha de\n"
    " * modulo, cotas, corte hachurado, planta, al\u00e7ado, radios, blocos em\n"
    " * axonometria ou componentes de grafo. As folhas tra\u00e7am-se uma a uma,\n"
    " * pela ordem de leitura, e o sorteio nunca repete figura entre folhas\n"
    " * vizinhas nem de um ciclo para o outro.",
)

# 4) Docstring do topo: contagem de primitivas.
sub(" * Canvas e nao SVG: a cena tem ~700 primitivas e redesenha-se a cada frame.",
    " * Canvas e nao SVG: a cena tem ~600 primitivas e redesenha-se a cada frame.")

io.open(PATH, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
