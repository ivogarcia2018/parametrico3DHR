"""
Renderiza a folha de fundo para PNG, sem browser.

O GraphField desenha em canvas e nao ha puppeteer neste ambiente, o que deixa
a composicao por verificar. Este script e' a porta-francesa do `buildScene`: a
mesma composicao, a mesma baralho de figuras e os mesmos numeros, corridos em
Python com PIL.

Espelha `client/src/components/GraphField.tsx` folha a folha: 4 pranchas por
ciclo (2x2 em desktop, 2 em ecrã estreito), uma figura sorteada do baralho
embaralhado em cada uma, e o `order` local de cada figura遗迹 convertido para
a posicao na folha inteira.

    python client/scripts/brand/preview_graph_field.py 1920 1080 16 0
    python client/scripts/brand/preview_graph_field.py 1920 1080 16 1
    python client/scripts/brand/preview_graph_field.py 390 780 16 0
"""

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scripts" / "brand" / "_graph_preview.png"

INK = (126, 124, 118)
HOT = (233, 107, 59)

# Nomes de componente do Grasshopper — maior que o maximo por figura, por
# isso o indice vai por modulo (ver o mesmo comentario em GraphField.tsx).
GH_LABELS = ["Pt", "Srf", "Crv", "Lerp", "Msh", "Move", "Trim", "Divide"]

# Repertorio de notas de caderno, uma por folha.
CODE_POOL = [
    "waffle(24, t)", "Lerp(a, b, t)", "srf = Brep()", "count = 24", "fillet 0.5",
    "sweep.rail", "Pt(x, y, z)", "div = 6", "rev = true", "mesh = Cap()", "0.5 mm",
    "Pt(x, y, z).Move", "os = os.T", "gh = gh.In", "trim = Trim()", "rev = -1",
]

FIGURES = [
    "plan", "radial", "section", "graph", "elevation", "axo",
    "diagrid", "spiral", "contour", "detail", "module",
]
CELLS_DESKTOP = 4
CELLS_MOBILE = 2

# Mesma linha do tempo do componente: 13 s de traco, 3 s de solve.
DRAW = 13
CYCLE = 16
OPACITY = 0.5


class Rng:
    """mulberry32 — a mesma semeadura do componente."""

    def __init__(self, seed: int) -> None:
        self.a = seed & 0xFFFFFFFF

    def next(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (self.a ^ (self.a >> 15)) * (1 | self.a) & 0xFFFFFFFF
        t = (t + (t ^ (t >> 7)) * 61 ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def inside(poly, px, py) -> bool:
    hit = False
    j = len(poly) - 1
    for i in range(len(poly)):
        a, b = poly[i], poly[j]
        if (a[1] > py) != (b[1] > py):
            if px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]:
                hit = not hit
        j = i
    return hit


def font(size: int):
    for name in ("consola.ttf", "cour.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
        except OSError:
            continue
    return ImageFont.load_default()


def alpha_for(kind: str, weight: float) -> float:
    """Opacidade por peso de traco.

    Derivar a opacidade da espessura sobe/desce a linear e da maus resultado:
    a grelha de fundo fica a mesma coisa que a moldura, ou a hachura some.
    Aqui a dosagem e' por escaloes, com a grelha a marcar a cota de baixo.
    """
    if kind == "text":
        return 0.60
    if weight >= 1.3:
        return 0.74  # moldura da prancha
    if weight >= 1.1:
        return 0.66  # perfil em evidencia
    if weight >= 0.9:
        return 0.54  # traco corrente
    if weight >= 0.7:
        return 0.44  # traco interior
    if weight >= 0.55:
        return 0.32  # hachura, cotas
    return 0.13  # grelha de modulo


def build(width, height, rand, cycle=0):
    """Porta de buildScene. Devolve (ops, spots) com a mesma forma logica."""
    ops, spots = [], []

    def order(x):
        return max(0.0, min(1.0, x / width))

    def line(pts, weight=1, hot=0):
        ops.append(("line", pts, order(pts[0][0]), weight, hot))

    def rect(x, y, w, h, weight=1, hot=0):
        ops.append(("rect", (x, y, w, h), order(x), weight, hot))

    def arc(cx, cy, r, a0, a1, weight=1, hot=0):
        ops.append(("arc", (cx, cy, r, a0, a1), order(cx - r), weight, hot))

    def text(x, y, s, size=9, hot=0):
        ops.append(("text", (x, y, s, size), order(x), 1, hot))

    mod = 54
    for x in range(mod, width, mod):
        line([(x, 0), (x, height)], 0.5)
    for y in range(mod, height, mod):
        line([(0, y), (width, y)], 0.5)

    pad_x, pad_y = width * 0.06, height * 0.14
    usable_w, usable_h = width - pad_x * 2, height - pad_y * 2
    # Uma figura so, quase a tela toda — espelha o GraphField.tsx depois da
    # passagem da grelha de 9 celulas para prancha unica.
    x, y = pad_x, pad_y
    w, h = usable_w, usable_h
    figures = [
        "plan", "radial", "section", "graph", "elevation", "axo",
        "diagrid", "spiral", "contour", "detail", "module",
    ]
    kind = figures[int(rand.next() * len(figures))]
    ox = order(x)
    ribs = 26 + int(rand.next() * 20)
    nodes_n = 5 + int(rand.next() * 3)
    bars_n = 7 + int(rand.next() * 6)
    slabs = 3 + int(rand.next() * 3)
    hatch_n = 44 + int(rand.next() * 46)

    if True:
        if True:
            rect(x, y, w, h, 1.4)
            t = 14
            line([(x, y), (x + t, y)], 1.4)
            line([(x, y), (x, y + t)], 1.4)
            line([(x + w, y + h), (x + w - t, y + h)], 1.4)
            line([(x + w, y + h), (x + w, y + h - t)], 1.4)
            text(x, y - 7, f"{kind.upper()} / {cycle + 1:02d}", 8, 0.6)

            if kind == "plan":
                n = 4
                for i in range(1, n):
                    line([(x + w * i / n, y), (x + w * i / n, y + h)], 0.8)
                    line([(x, y + h * i / n), (x + w, y + h * i / n)], 0.8)
                rect(x + w * 0.34, y + h * 0.34, w * 0.32, h * 0.32, 1.2, 1)
                spots.append((x + w * 0.5, y + h * 0.5, "Ø 5 000", 5000, ox))
                line([(x, y + h + 16), (x + w, y + h + 16)], 0.8)
                line([(x, y + h + 12), (x, y + h + 20)], 0.8)
                line([(x + w, y + h + 12), (x + w, y + h + 20)], 0.8)
            elif kind == "radial":
                # Planta do pavilhao em aneis concentricos com raios. A
                # primeira versao eram costelas num leque e lia-se como uma
                # aranha; em planta, os aneis dao a leitura de estrutura.
                cx, cy = x + w / 2, y + h * 0.52
                rad = min(w, h) * 0.36
                arc(cx, cy, rad, 0, math.tau, 1.3, 1)
                arc(cx, cy, rad * 0.62, 0, math.tau, 0.9)
                arc(cx, cy, rad * 0.26, 0, math.tau, 0.9)
                for i in range(ribs):
                    a = (i / ribs) * math.tau
                    line(
                        [
                            (cx + math.cos(a) * rad * 0.26, cy + math.sin(a) * rad * 0.26),
                            (cx + math.cos(a) * rad, cy + math.sin(a) * rad),
                        ],
                        0.7,
                        0.55 if i % 4 == 0 else 0,
                    )
                # Banco central e vazio do nucleo.
                line([(cx - rad * 0.26, cy), (cx + rad * 0.26, cy)], 0.8)
                spots.append((cx, cy - rad - 14, "24 costelas", 24, ox))
            elif kind == "section":
                base = y + h * 0.78
                poly = [
                    (x + w * 0.12, base),
                    (x + w * 0.3, y + h * 0.34),
                    (x + w * 0.7, y + h * 0.34),
                    (x + w * 0.88, base),
                ]
                line(poly, 1.4, 1)
                line([(x + w * 0.12, base), (x + w * 0.88, base)], 1.2)
                for _ in range(hatch_n):
                    px = x + w * 0.1 + rand.next() * w * 0.8
                    py = y + h * 0.32 + rand.next() * (h * 0.46)
                    if inside(poly, px, py):
                        line([(px, py), (px + 7, py + 7)], 0.6)
                line([(x + w * 0.94, y + h * 0.34), (x + w * 0.94, base)], 0.8)
                text(x + w * 0.14, y + h * 0.26, "corte A-A", 8, 0.5)
            elif kind == "elevation":
                # Alcado: verticais de alturas varias sobre a linha de terre,
                # fechadas por um perfil de cobertura, e cota de altura.
                base = y + h * 0.84
                roof = []
                for i in range(bars_n):
                    px = x + w * 0.14 + (i * w * 0.72) / (bars_n - 1)
                    ph = h * (0.3 + rand.next() * 0.32)
                    roof.append((px, base - ph))
                    line([(px, base), (px, base - ph)], 0.9, 1 if i == 3 else 0)
                line(roof, 1.2, 1)
                line([(x + w * 0.12, base), (x + w * 0.88, base)], 1.2)
                line([(x + w * 0.08, y + h * 0.3), (x + w * 0.08, base)], 0.8)
                line([(x + w * 0.05, y + h * 0.3), (x + w * 0.11, y + h * 0.3)], 0.8)
                line([(x + w * 0.05, base), (x + w * 0.11, base)], 0.8)
                text(x + w * 0.12, y + h * 0.27, "h 3 000", 8)
            elif kind == "axo":
                # Axonometria explodida: tres lajes com arestas verticais a
                # ligar as successivas. Sem essas arestas eram laminas soltas
                # e nao se liam como volume.
                corners = []
                for i in range(slabs):
                    bx, by = x + w * 0.2 + i * w * 0.1, y + h * 0.68 - i * h * 0.2
                    bw, dx, dy = w * 0.36, w * 0.085, h * 0.07
                    ring = [(bx, by), (bx + bw, by), (bx + bw + dx, by - dy), (bx + dx, by - dy)]
                    line(ring, 0.9, 1 if i == 2 else 0)
                    line([ring[0], ring[3]], 0.7)
                    line([ring[1], ring[2]], 0.7)
                    corners.append(ring)
                for i in range(slabs - 1):
                    for k in range(4):
                        line([corners[i][k], corners[i + 1][k]], 0.6)
            else:
                nodes = []
                for i in range(nodes_n):
                    px = x + w * 0.16 + (i * w * 0.68) / (nodes_n - 1)
                    py = y + h * 0.36 + (0 if i % 2 == 0 else h * 0.15)
                    nodes.append((px, py))
                    rect(px - 11, py - 11, 22, 22, 1.2, 1 if i == 4 else 0)
                    line([(px - 3, py - 3), (px + 3, py + 3)], 0.7)
                    line([(px + 3, py - 3), (px - 3, py + 3)], 0.7)
                    text(px - 11, py - 17, GH_LABELS[i % len(GH_LABELS)], 8, 0.6 if i == nodes_n - 1 else 0)
                for i in range(nodes_n - 1):
                    a, b = nodes[i], nodes[i + 1]
                    # Bezier cubica com tangentes horizontais nas duas pontas.
                    # Uma quadratica com um so' ponto de controlo dava um cabo
                    # pendurado; o "S" e' o que o Grasshopper faz entre portas.
                    x0, y0, x3, y3 = a[0] + 11, a[1], b[0] - 11, b[1]
                    c1 = (x0 + (x3 - x0) / 2, y0)
                    c2 = (x0 + (x3 - x0) / 2, y3)
                    pts = []
                    for s in range(25):
                        u = 1 - s / 24
                        t = s / 24
                        pts.append(
                            (
                                u ** 3 * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * x3,
                                u ** 3 * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * y3,
                            )
                        )
                    line(pts, 1, 0.8 if i == 3 else 0)
                spots.append((nodes[-1][0], nodes[-1][1] + 26, "0.5 mm", 5, ox))

    # Faixa de codigo na margem de baixo, como a nota de um desenho. Antes
    # corria a meia altura e caia por cima das figuras.
    code = ["waffle(24, t)", "Lerp(a, b, t)", "srf = Brep()", "count = 24", "fillet 0.5", "sweep.rail", "Pt(x, y, z)"]
    strip = height - 18
    for i, s in enumerate(code):
        if rand.next() < 0.35:
            continue
        text(pad_x + (usable_w / len(code)) * i, strip, s, 9, 0.6 if rand.next() < 0.3 else 0)
    line([(pad_x, strip - 14), (width - pad_x, strip - 14)], 0.5)

    ops.sort(key=lambda o: o[2])
    spots.sort(key=lambda s: s[4])
    return ops, spots


def main() -> None:
    width = int(sys.argv[1]) if len(sys.argv) > 1 else 1280
    height = int(sys.argv[2]) if len(sys.argv) > 2 else 800
    pos = float(sys.argv[3]) if len(sys.argv) > 3 else 11.0
    cycle = int(sys.argv[4]) if len(sys.argv) > 4 else 0

    ops, spots = build(width, height, Rng(round(width) * 7919 + cycle * 104729), cycle)
    # Fundo escuro: e' a seccao onde a folha tem de se ler melhor. O script
    # repete-se com fundo claro para conferir o outro extremo.
    img = Image.new("RGB", (width, height), (23, 23, 21))
    d = ImageDraw.Draw(img, "RGBA")

    solve = (pos - 11) / 5 if pos >= 11 else -1
    front = solve * (width + 300) - 150
    fade = 1.0 if pos <= 10 else max(0.0, 1 - (pos - 10) / 1.6)
    base = 0.5

    for kind, data, order_, weight, hot in ops:
        # Espelho exacto do GraphField: sem atalho para pos < 10, senao o
        # preview mentia e mostrava a folha inteira nos primeiros segundos.
        local = min(1.0, max(0.0, (pos - order_ * 11) / 0.35))
        if local <= 0 or fade <= 0:
            continue
        if kind == "arc":
            cx = data[0]
            cy0 = data[1]
        elif kind == "line":
            cx = data[0][0]
            cy0 = data[0][1]
        else:
            cx = data[0]
            cy0 = data[1]
        wave = max(0.0, 1 - abs(cx - front) / 260) if solve >= 0 else 0
        heat = max(hot * 0.55, wave)
        # Banda de silencio, como no GraphField: mais apagado a meia altura.
        quiet = 0.55 + 0.45 * abs(cy0 / height - 0.5) * 2
        a = int(alpha_for(kind, weight) * fade * quiet * 255)
        color = (HOT + (a,)) if heat > 0.02 else (INK + (a,))
        reveal = min(1.0, local)
        lw = max(1, int(round(weight)))

        if kind == "line":
            pts = data
            if reveal < 1:
                lens = [0.0]
                for i in range(1, len(pts)):
                    lens.append(lens[-1] + math.dist(pts[i], pts[i - 1]))
                want = lens[-1] * reveal
                cut = [pts[0]]
                for i in range(1, len(pts)):
                    if lens[i] <= want:
                        cut.append(pts[i])
                    else:
                        seg = lens[i] - lens[i - 1]
                        f = (want - lens[i - 1]) / seg if seg else 0
                        cut.append(
                            (
                                pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f,
                                pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f,
                            )
                        )
                        break
                pts = cut
            d.line(pts, fill=color, width=lw)
        elif kind == "rect":
            x, y, w, h = data
            r = min(1.0, reveal * 1.6)
            d.rectangle([x, y, x + w * r, y + h * r], outline=color, width=lw)
        elif kind == "arc":
            cx, cy, r, a0, a1 = data
            d.arc(
                [cx - r, cy - r, cx + r, cy + r],
                math.degrees(a0),
                math.degrees(a0 + (a1 - a0) * reveal),
                fill=color,
                width=lw,
            )
        else:
            x, y, s, size = data
            d.text((x, y), s, font=font(size), fill=color)

    f9 = font(9)
    for x, y, label, value, order_ in spots:
        if pos < order_ * 11 + 0.9 or fade <= 0:
            continue
        d.text((x - d.textlength(label, font=f9) / 2, y), label, font=f9,
               fill=HOT + (int(0.5 * fade * 255),))
        n = str(value)
        d.text((x - d.textlength(n, font=f9) / 2, y + 11), n, font=f9, fill=INK + (int(0.42 * fade * 255),))

    img.save(OUT)
    print(f"{OUT}  {width}x{height}  pos={pos}s  {len(ops)} primitivas  {len(spots)} cotas")


if __name__ == "__main__":
    main()
