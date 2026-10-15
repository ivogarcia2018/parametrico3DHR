"""Compõe o lockup completo 3DHR Training: vidro "3DHR" + barra "TRAINING".

PORQUE ISTO EXISTE
------------------
O asset fornecido (client/public/media/logo.jpg) contem APENAS a marca de
vidro "3DHR" sobre fundo branco. O lockup institucional tem ainda a barra
laranja com "TRAINING" ao lado. Como essa parte nao veio no ficheiro, e
composta aqui a partir de medidas tiradas da referencia da marca.

ONDE ESTAO AS MEDIDAS
---------------------
Todas as dimensoes sao relativas a altura de caixa alta (cap height) do vidro,
designada H. Nao ha numeros magicos em pixels: mudar H reescala tudo.

Referencia medida (a partir da arte oficial fornecida pelo cliente):
    intervalo vidro -> barra ...... 0,24 H
    altura da barra ................ 0,57 H
    topo da barra .................. 0,33 H abaixo do topo do vidro
    altura de caixa do texto ....... 0,30 H
    texto ocupa .................... 94 % da largura da barra

O texto e' desenhado com Arial Bold esticado na horizontal e espacado: nao ha
Eurostile/Microgramma (a fonte apparentemente usada na marca original) neste
sistema. E' uma aproximacao tipografica, nao a fonte oficial.

E TRATAMENTO NAO E AUTORAL
--------------------------
As formas do "3DHR" vem do asset oficial. A barra, a cor laranja e o texto
"TRAINING" sao reconstituidos aqui. Para uso institucional convem pedir ao
fornecedor o lockup completo em PNG transparente e reexecutar este script com
o ficheiro oficial.

Uso: python client/scripts/brand/make_lockup.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
GLASS = ROOT / "client" / "public" / "media" / "logo-3dhr-glass.png"
OUT_DIR = ROOT / "client" / "public" / "media"
PREVIEW = ROOT / "client" / "scripts" / "brand" / "_lockup_preview.png"

# Fonte do texto. Arial Bold e' o substituto mais proximo disponivel para o
# desenho largo e geometrico da marca original.
FONT_PATH = Path("C:/Windows/Fonts/arialbd.ttf")

# --- Geometria, em multiplos de H (altura de caixa alta do vidro) -------------
GAP = 0.24  # intervalo horizontal vidro -> barra
BAR_H = 0.57  # altura da barra
BAR_TOP = 0.33  # topo da barra, medido do topo da caixa do vidro
CAP_H = 0.30  # altura de caixa alta do texto
TEXT_FILL = 0.94  # fracao da largura da barra ocupada pelo texto
TRACKING = 0.02  # espacamento entre letras, em fracoes de H
STRETCH_X = 1.18  # estiramento horizontal do texto

# --- Cor ---------------------------------------------------------------------
# O laranja e' o mesmo acento ja usado no design do site, por isso a barra
# pertence a paleta em vez de introduzir uma cor nova.
BAR_RGB = (233, 107, 59)  # #e96b3b
INK_RGB = (17, 17, 22)  # quase-preto, como na referencia

# O master cobre hero/rodape/og:image; o "-sm" cobre header e rodape.
SIZES = {"logo-3dhr-training.png": 1200, "logo-3dhr-training-sm.png": 400}
SITE_BG = (23, 23, 21)


def cap_box(master: Image.Image) -> tuple[int, int, int]:
    """Caixa alta do vidro: topo, base, altura. Ignora a sombra de contacto.

    A sombra difusa por baixo das letras continua a descer varias linhas abaixo
    da base. Se a base fosse o ultimo pixel com alfa, a barra ficaria descida
    em relacao as letras. Em vez disso toma-se a ultima linha totalmente
    opaca: e' a base do grafismo, e a sombra de baixo cai de facto abaixo dela.
    """
    a = master.getchannel("A")
    w, h = a.size
    px = a.load()
    top = next(y for y in range(h) if max(px[x, y] for x in range(w)) > 200)
    base = max(y for y in range(h) if max(px[x, y] for x in range(w)) >= 250)
    return top, base, base - top


def draw_training(height_px: int) -> Image.Image:
    """Renderiza "TRAINING" numa mascara, com caixa alta = height_px."""
    # Escolhe o corpo pela altura de caixa: mede a caixa alta real da fonte e
    # escala por ela, em vez de chutar o size e acertar no olho.
    probe = ImageFont.truetype(str(FONT_PATH), 200)
    box = probe.getbbox("TRAINING")
    body = round(200 * height_px / (box[3] - box[1]))

    font = ImageFont.truetype(str(FONT_PATH), body)
    track = round(height_px * TRACKING)
    widths = [font.getlength(ch) for ch in "TRAINING"]
    total = sum(widths) + track * (len(widths) - 1)

    mask = Image.new("L", (round(total * STRETCH_X) + 8, round(body * 1.6)), 0)
    d = ImageDraw.Draw(mask)
    x = 0.0
    for ch, w in zip("TRAINING", widths):
        d.text((x, 0), ch, font=font, fill=255)
        x += w + track

    box = mask.getbbox()
    if box is None:
        raise SystemExit("ERRO: o texto 'TRAINING' saiu vazio.")
    mask = mask.crop(box)
    # Escala por um unico fator nos dois eixos, senao o resize esmaga as
    # letras e o "TRAINING" vira um bloco. O estiramento extra e' a unica
    # distorcao deliberada, para aproximar o desenho largo da marca.
    k = height_px / mask.size[1]
    return mask.resize(
        (max(1, round(mask.size[0] * k * STRETCH_X)), height_px), Image.LANCZOS
    )


def compose() -> Image.Image:
    """Junta a marca de vidro e a barra num unico PNG com alfa."""
    master = Image.open(GLASS).convert("RGBA")
    # Recorta pela alfa ja extraida: o master tem a caixa de vidro com folga.
    box = master.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if box is None:
        raise SystemExit("ERRO: master sem pixels visiveis.")
    master = master.crop(box)
    top, _base, H = cap_box(master)

    gw, gh = master.size
    text = draw_training(round(H * CAP_H))
    tw, th = text.size

    bar_w = round(tw / TEXT_FILL)
    bar_h = round(H * BAR_H)
    gap = round(H * GAP)

    total_w = gw + gap + bar_w
    # A caixa alta do vidro pode nao comecar no topo do recorte (ha folga
    # residual). Alinha o topo da caixa, nao o do recorte, para a barra ficar
    # na altura certa em relacao as letras.
    cap_bottom = top + H
    total_h = max(gh, cap_bottom + round(H * (1.0 - BAR_TOP - BAR_H)))

    out = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    out.alpha_composite(master, (0, 0))

    bar_x = gw + gap
    bar_y = cap_bottom - bar_h
    out.paste(Image.new("RGBA", (bar_w, bar_h), BAR_RGB + (255,)), (bar_x, bar_y))

    # A tinta tem de ser a mascara do texto, nao um retangulo da sua caixa: o
    # fundo entre as letras tem de continuar a ser o laranja da barra.
    ink = Image.new("RGBA", (tw, th), INK_RGB + (255,))
    ink.putalpha(text)
    out.alpha_composite(ink, (bar_x + (bar_w - tw) // 2, bar_y + (bar_h - th) // 2))
    return out


def make_preview(master: Image.Image) -> None:
    """Compoe o lockup sobre a cor do site, nos tamanhos reais de uso."""
    W, H = 1280, 660
    canvas = Image.new("RGB", (W, H), SITE_BG)
    d = ImageDraw.Draw(canvas)
    ratio = master.size[0] / master.size[1]
    d.text(
        (40, 24),
        f"lockup {master.size[0]} x {master.size[1]} px  ({ratio:.2f}:1)",
        fill=(242, 239, 230),
    )

    x = 40
    for h in (30, 34, 44, 64, 96):
        w = round(ratio * h)
        im = master.resize((w, h), Image.LANCZOS)
        canvas.paste(im, (x, 90), im)
        d.text((x, 90 + h + 12), f"{h}px", fill=(242, 181, 68))
        x += w + 40
    d.text((x, 90), f"~{round(ratio * 34)}px no header", fill=(150, 148, 140))

    big = master.resize((960, round(960 / ratio)), Image.LANCZOS)
    canvas.paste(big, (40, 400), big)
    canvas.save(PREVIEW)
    print(f"preview  -> {PREVIEW}")


def main() -> int:
    if not GLASS.exists():
        print(f"ERRO: master de vidro ausente -> {GLASS}")
        print("      corre antes: python client/scripts/brand/make_logo_assets.py")
        return 1
    if not FONT_PATH.exists():
        print(f"ERRO: fonte ausente -> {FONT_PATH}")
        return 1

    master = compose()
    print(
        f"lockup   -> {master.size[0]} x {master.size[1]} px  "
        f"({master.size[0] / master.size[1]:.3f}:1)"
    )

    for name, width in SIZES.items():
        h = max(1, round(master.size[1] * width / master.size[0]))
        dest = OUT_DIR / name
        master.resize((width, h), Image.LANCZOS).save(dest, "PNG", optimize=True)
        print(
            f"asset    -> {dest.relative_to(ROOT)}  ({width} x {h}, "
            f"{dest.stat().st_size // 1024} KB)"
        )

    make_preview(master)
    return 0


if __name__ == "__main__":
    sys.exit(main())



SIZES = {"logo-3dhr-training.png": 1200, "logo-3dhr-training-sm.png": 400}
SITE_BG = (23, 23, 21)
