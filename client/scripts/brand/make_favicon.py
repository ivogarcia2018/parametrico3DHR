"""Gera o conjunto de favicons a partir do logo de vidro.

PORQUE O "3" E NAO A WORDMARK
-----------------------------
A wordmark completa foi renderizada nos tamanhos reais de aba e comparada
com a letra "3" isolada. Resultado: a wordmark e ilegivel a 16 px (uma
mancha) e so legivel a partir de ~48 px. A letra "3" isolada le-se limpa
aos 16 px. O favicon e, por definicao, o sitio onde a marca tem de
sobreviver a 16 px — logo usa-se o "3".

PORQUE HA UMA PLACA ESCURA ATRAS
--------------------------------
A barra de abas pode ter UI clara. O vidro e palido: sozinho, desapareceria
numa barra clara. A placa #171715 (a cor do site) da-lo contraste nos dois
sentidos e mantem o acento dourado do design.

Uso: python client/scripts/brand/make_favicon.py
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
MASTER = ROOT / "client" / "public" / "media" / "logo-3dhr-glass.png"
PUB = ROOT / "client" / "public"

PLATE = (23, 23, 21, 255)  # #171715
HAIRLINE = (242, 181, 68, 128)  # #f2b544 a 50%, como a placa anterior
THRESH = 8
GLYPH_H = 0.62  # altura do "3" como fracao do lado da placa


def live_columns(alpha):
    w, h = alpha.size
    return [x for x in range(w) if alpha.crop((x, 0, x + 1, h)).getextrema()[1] > THRESH]


def extract_three(logo: Image.Image) -> Image.Image:
    """Recorta a primeira letra da wordmark ("3")."""
    alpha = logo.getchannel("A")
    cols = live_columns(alpha)
    if not cols:
        raise SystemExit("ERRO: master sem pixels visiveis.")
    L, R = cols[0], cols[-1]
    live = set(cols)
    dead = [x for x in range(L, R + 1) if x not in live]
    gap = dead[0] if dead else L + (R - L) // 3
    glyph = logo.crop((L, 0, gap, logo.size[1]))
    box = glyph.getchannel("A").point(lambda v: 255 if v > THRESH else 0).getbbox()
    return glyph.crop(box) if box else glyph


def render(side: int, three: Image.Image) -> Image.Image:
    """Placa escura arredondada com o "3" de vidro centrado."""
    S = side * 8  # supersample para as bordas ficarem limpas
    plate = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(plate)
    r = int(S * 0.22)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=r, fill=PLATE)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=r, outline=HAIRLINE, width=max(1, S // 128))

    gh = int(S * GLYPH_H)
    gw = max(1, round(three.size[0] / three.size[1] * gh))
    g = three.resize((gw, gh), Image.LANCZOS)
    plate.paste(g, ((S - gw) // 2, (S - gh) // 2), g)
    return plate.resize((side, side), Image.LANCZOS)


def main() -> int:
    if not MASTER.exists():
        print(f"ERRO: master ausente -> {MASTER}")
        return 1

    three = extract_three(Image.open(MASTER).convert("RGBA"))
    print(f"glifo '3' -> {three.size}")

    pngs = {
        "favicon-16.png": 16,
        "favicon-32.png": 32,
        "favicon-48.png": 48,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    biggest = render(512, three)
    for name, side in pngs.items():
        img = biggest if side == 512 else render(side, three)
        img.save(PUB / name, "PNG", optimize=True)
        print(f"asset    -> public/{name}  ({side}px)")

    # O SVG embute o "3" em PNG: um favicon em SVG nao pode contar com
    # <text> nem com <image href="..."> externo, entao vai em data URI.
    buf = io.BytesIO()
    render(128, three).save(buf, "PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="3DHR Training">
  <rect width="128" height="128" rx="28" fill="#171715"/>
  <rect x="0.5" y="0.5" width="127" height="127" rx="28" fill="none" stroke="#f2b544" stroke-opacity="0.5"/>
  <image href="data:image/png;base64,{b64}" x="0" y="0" width="128" height="128"/>
</svg>
"""
    (PUB / "favicon.svg").write_text(svg, encoding="utf-8")
    print("asset    -> public/favicon.svg  (com o '3' embutido em data URI)")

    # Previsualizacao, para inspeccao visual em vez de suposicao.
    strip = Image.new("RGB", (760, 190), PLATE[:3])
    dd = ImageDraw.Draw(strip)
    x = 20
    for side in (16, 32, 48, 96, 128):
        s = render(side, three)
        strip.paste(s, (x, 24), s)
        dd.text((x, 24 + side + 12), f"{side}px", fill=(242, 181, 68))
        x += side + 34
    probe = ROOT / "client" / "scripts" / "brand" / "_favicon_probe.png"
    strip.save(probe)
    print(f"probe    -> {probe}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
