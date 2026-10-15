"""Cola o corpo novo (composicao + folhas) dentro de preview_graph_field.py."""

import io

PREV = "scripts/brand/preview_graph_field.py"
BODY = "scripts/brand/_pb1.txt"

lines = io.open(PREV, encoding="utf-8").read().split("\n")
body = io.open(BODY, encoding="utf-8").read().split("\n")

assert lines[110].startswith("def build("), lines[110]
assert lines[290].startswith("def main()"), lines[290]

out = lines[:110] + body + lines[290:]

# A linha do tempo mudou (13 s de traco) e a banda de silencio saiu do
# componente: o preview nao pode mostrar o que o GraphField ja nao faz.
s = "\n".join(out)


def sub(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new, 1)


sub(
    "    ops, spots = build(width, height, Rng(round(width) * 7919 + cycle * 104729), cycle)\n",
    "    (ops, spots), comp = build(width, height, cycle)\n"
    "    print(\"  folhas:\", \", \".join(c[\"fig\"] for c in comp[\"cells\"]))\n",
)
sub(
    "    solve = (pos - 11) / 5 if pos >= 11 else -1\n"
    "    front = solve * (width + 300) - 150\n"
    "    fade = 1.0 if pos <= 10 else max(0.0, 1 - (pos - 10) / 1.6)\n"
    "    base = 0.5\n",
    "    solve = (pos - DRAW) / (CYCLE - DRAW) if pos >= DRAW else -1\n"
    "    front = solve * (width + 300) - 150\n"
    "    fade = 1.0 if pos <= DRAW - 3 else max(0.0, 1 - (pos - (DRAW - 3)) / 2.6)\n",
)
sub(
    "        local = min(1.0, max(0.0, (pos - order_ * 11) / 0.35))",
    "        local = min(1.0, max(0.0, (pos - order_ * DRAW) / 0.35))",
)
sub(
    "        # Banda de silencio, como no GraphField: mais apagado a meia altura.\n"
    "        quiet = 0.55 + 0.45 * abs(cy0 / height - 0.5) * 2\n"
    "        a = int(alpha_for(kind, weight) * fade * quiet * 255)\n",
    "        # Sem banda de silencio: o GraphField nao a tem, a folha e' fundo e\n"
    "        # nao compete com a leitura.\n"
    "        a = int(alpha_for(kind, weight) * fade * OPACITY * 255)\n",
)
sub("        if pos < order_ * 11 + 0.9 or fade <= 0:",
    "        if pos < order_ * DRAW + 0.9 or fade <= 0:")

io.open(PREV, "w", encoding="utf-8", newline="\n").write(s)
print("spliced", len(s.split(chr(10))))
