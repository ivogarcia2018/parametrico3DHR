"""Gera o logotipo 3DHR Training como PNG com alfa, para fundos escuros.

PORQUE ISTE EXISTE
------------------
O asset fornecido (client/public/media/logo.jpg) e vidro quase-branco sobre
fundo branco, sem canal alfa. Aplicado tal e qual num header escuro
(#171715) daria um rectangulo branco visivel. E, mesmo removendo o branco por
limiar, o que sobraria seria uma marca quase-branca — invisivel no escuro.

Este script converte a marca num "claro-sobre-transparente": extrai uma
mascara suave a partir do quanto cada pixel se afasta do branco e reconstroi
a cor para leitura sobre fundo escuro. O croma da fonte e re-aplicado para
preservar o tom champagne do "R" e o azul frio do "3D"/"DH".

E TRATAMENTO NAO E AUTORAL
--------------------------
As formas vem do asset oficial. A escolha de cor de saida (clara, para
contrastar com o #171715 do site) foi tomada aqui, nao pelo design. Para uso
comstitucional convem pedir ao fornecedor um PNG transparente oficial e uma
variante para fundos escuros, e reexecutar este script com esses ficheiros.

Uso: python client/scripts/brand/make_logo_assets.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "client" / "public" / "media" / "logo.jpg"
OUT_DIR = ROOT / "client" / "public" / "media"
PREVIEW = ROOT / "client" / "scripts" / "brand" / "_preview.png"

# --- Parametros de extracao (ver analyze_logo.py para a fundamentacao) -------
# Abaixo de A_LO o pixel e halo/ruido de JPEG -> transparente.
# Acima de A_HI o pixel e contorno solido da marca -> opaco.
A_LO = 13.0
A_HI = 38.0

# Tons de saida. DIM e a cor da massa do vidro sobre o escuro; BRIGHT e a
# cor dos chanfros que apanham luz. Nenhum dos dois desce abaixo de ~0.5 de
# luminancia, senao o contorno preto do asset desaparece no fundo escuro.
DIM = (150, 162, 190)
BRIGHT = (250, 252, 255)

# Quanto do croma da fonte e preservado (1.0 = identico).
CHROMA_GAIN = 1.0

# Tamanhos de saida. O "sm" cobre o uso real no header (38/42 px) com folga
# para ecrãs 2x; o master cobre rodape/hero/og:image.
SIZES = {"logo-3dhr-glass.png": 1200, "logo-3dhr-glass-sm.png": 400}

# Cor do site, para o preview de verificacao.
SITE_BG = (23, 23, 21)


def smoothstep(x: float) -> float:
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    return x * x * (3.0 - 2.0 * x)


def build_rgba(im: Image.Image) -> Image.Image:
    """Converte RGB (vidro sobre branco) em RGBA legivel sobre fundo escuro."""
    out = Image.new("RGBA", im.size)
    src = im.load()
    dst = out.load()
    span = A_HI - A_LO
    r0, g0, b0 = DIM
    r1, g1, b1 = BRIGHT

    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b = src[x, y]
            mx = r if r > g else g
            if b > mx:
                mx = b

            t = smoothstep((255.0 - mx - A_LO) / span)
            if t <= 0.0:
                dst[x, y] = (0, 0, 0, 0)
                continue

            # Cor: interpola DIM -> BRIGHT e devolve o croma da fonte, para
            # o "R" manter o tom champagne e o "3DHR" o tom frio.
            cr = r0 + (r1 - r0) * t + (r - mx) * CHROMA_GAIN
            cg = g0 + (g1 - g0) * t + (g - mx) * CHROMA_GAIN
            cb = b0 + (b1 - b0) * t + (b - mx) * CHROMA_GAIN

            cr = 0.0 if cr < 0.0 else (255.0 if cr > 255.0 else cr)
            cg = 0.0 if cg < 0.0 else (255.0 if cg > 255.0 else cg)
            cb = 0.0 if cb < 0.0 else (255.0 if cb > 255.0 else cb)

            dst[x, y] = (int(cr), int(cg), int(cb), int(255.0 * t))

    return out


def crop_to_content(rgba: Image.Image, pad_ratio: float = 0.02) -> Image.Image:
    """Recorta as margens brancas, mantendo uma folga proporcional."""
    bbox = rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox is None:
        raise SystemExit("ERRO: a mascara ficou vazia — reveja A_LO/A_HI.")
    l, t, r, b = bbox
    pad = int(max(r - l, b - t) * pad_ratio)
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(rgba.size[0], r + pad)
    b = min(rgba.size[1], b + pad)
    return rgba.crop((l, t, r, b))


def make_preview(master: Image.Image) -> None:
    """Compoe o logo sobre a cor do site, nos tamanhos reais de uso."""
    W, H = 1100, 620
    canvas = Image.new("RGB", (W, H), SITE_BG)
    d = ImageDraw.Draw(canvas)
    d.text((40, 24), "sobre #171715 (header/footer)", fill=(242, 239, 230))

    x = 40
    for h in (38, 42, 64, 96, 180):
        w = int(master.size[0] / master.size[1] * h)
        im = master.resize((w, h), Image.LANCZOS)
        canvas.paste(im, (x, 90), im)
        d.text((x, 90 + h + 10), f"{h}px", fill=(242, 181, 68))
        x += w + 44

    big = master.resize((640, int(640 / master.size[0] * master.size[1])), Image.LANCZOS)
    canvas.paste(big, (40, 380), big)
    d.text((700, 380), "hero / rodape", fill=(242, 181, 68))
    canvas.save(PREVIEW)
    print(f"preview  -> {PREVIEW}")


def main() -> int:
    if not SRC.exists():
        print(f"ERRO: fonte ausente -> {SRC}")
        return 1

    print(f"fonte    -> {SRC.name}  (A_LO={A_LO}, A_HI={A_HI})")
    rgba = build_rgba(Image.open(SRC).convert("RGB"))
    print(f"recorte  -> {rgba.getbbox()} antes de crop")

    rgba = crop_to_content(rgba)
    print(f"master   -> {rgba.size[0]} x {rgba.size[1]} px")

    for name, width in SIZES.items():
        h = max(1, round(rgba.size[1] * width / rgba.size[0]))
        dest = OUT_DIR / name
        rgba.resize((width, h), Image.LANCZOS).save(dest, "PNG", optimize=True)
        print(f"asset    -> {dest.relative_to(ROOT)}  ({width} x {h}, {dest.stat().st_size // 1024} KB)")

    make_preview(rgba)
    return 0


if __name__ == "__main__":
    sys.exit(main())
