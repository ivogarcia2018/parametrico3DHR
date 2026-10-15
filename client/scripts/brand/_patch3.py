import io

PATH = "src/components/GraphField.tsx"
s = io.open(PATH, encoding="utf-8").read()

def sub(old, new):
    global s
    assert old in s, old[:70]
    s = s.replace(old, new, 1)

# Linha do tempo: 4 folhas por ciclo precisam de mais tempo de traco do que a
# folha unica. 13 s para as quatro (3,25 s cada) e 5 s de solve.
sub("/** CYCLE: duracao de um tracado completo \u2014 11 s a desenhar, 5 s de solve. */\nconst CYCLE = 16;",
    "/** CYCLE: duracao de um tracado completo. Sao 4 folhas por ciclo, por isso o\n"
    " *  tracado ocupa 13 s (3,25 s por prancha) e o solve os 3 s restantes. */\n"
    "const CYCLE = 16;\n"
    "/** Segundos de traco antes de comecar o solve. E' o unico sitio onde a\n"
    " *  partition 11/5 estava escrita a mao em tres lugares diferentes. */\n"
    "const DRAW = 13;")

sub("      // 0\u201411 s a folha traca-se; 11\u201416 s uma onda de \"solve\" atravessa-a e os\n"
    "      // numeros correm para os valores finais.\n"
    "      const solve = pos >= 11 ? (pos - 11) / 5 : -1;",
    "      // 0\u2014DRAW s as quatro folhas tracam-se; DRAW\u2014CYCLE s uma onda de\n"
    "      // \"solve\" atravessa a folha e os numeros correm para os valores finais.\n"
    "      const solve = pos >= DRAW ? (pos - DRAW) / (CYCLE - DRAW) : -1;")

sub("        const born = op.order * 11;",
    "        // `order` ja e' a posicao na folha inteira (a celula i ocupa\n"
    "        // [i/4, (i+1)/4]), por isso a frente de traco percorre as pranchas\n"
    "        // pela ordem de leitura sem mais nenhuma conversao.\n"
    "        const born = op.order * DRAW;")

sub("        const fade = reduced ? 1 : pos > 10 ? Math.max(0, 1 - (pos - 10) / 1.6) : 1;\n"
    "        if (fade <= 0) continue;",
    "        const fade = reduced ? 1 : pos > DRAW - 3 ? Math.max(0, 1 - (pos - (DRAW - 3)) / 2.6) : 1;\n"
    "        if (fade <= 0) continue;")

sub("        if (pos < spot.order * 11 + 0.9) continue;\n"
    "        const fade = reduced ? 1 : pos > 10 ? Math.max(0, 1 - (pos - 10) / 1.6) : 1;",
    "        if (pos < spot.order * DRAW + 0.9) continue;\n"
    "        const fade = reduced ? 1 : pos > DRAW - 3 ? Math.max(0, 1 - (pos - (DRAW - 3)) / 2.6) : 1;")

# Comentarios que ainda falam da folha unica / grelha de 9 celulas.
sub("        // As caixas levam uma unidade `u` derivada do lado menor da figura: com\n"
    "        // o tamanho fixo de 11 px herdado da grelha de 9 celulas, um no ficava\n"
    "        // do tamanho de uma letra numa moldura de 1100 px e o grafo lia-se como\n"
    "        // uma frase com a palavra \"ON\".",
    "        // As caixas levam uma unidade `u` derivada do lado menor da figura: com\n"
    "        // um tamanho fixo em pixels, um no ficava do tamanho de uma letra\n"
    "        // dentro da moldura e o grafo lia-se como uma frase com a palavra\n"
    "        // \"ON\".")

io.open(PATH, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
