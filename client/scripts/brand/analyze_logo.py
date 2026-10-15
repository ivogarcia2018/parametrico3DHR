"""Analise o histograma de logo.jpg para escolher limiares de recorte do fundo.

O logotipo e vidro quase-branco sobre fundo branco, por isso "quase branco"
nao distingue logo de fundo. O que separa sao os BISSAIS (chanfro, sombra
propria, contorno) e o desvio de croma. Este script mede ambos.

Uso: python client/scripts/brand/analyze_logo.py
"""

from __future__ import annotations

import collections
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "client" / "public" / "media" / "logo.jpg"


def main() -> int:
    if not SRC.exists():
        print(f"ERRO: fonte ausente -> {SRC}")
        return 1

    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    print(f"fonte : {SRC}")
    print(f"dimensoes: {w} x {h}")
    print()

    # Amostragem para o histograma (a imagem tem ~4.2 Mpx; 600 k chega).
    small = im.resize((w // 2, h // 2), Image.LANCZOS)
    px = list(small.getdata())
    n = len(px)

    deficit = collections.Counter()  # 255 - max(canal) -> "quanto nao e branco"
    chroma = collections.Counter()  # max(canal) - min(canal) -> "quanto e colorido"
    for r, g, b in px:
        deficit[255 - max(r, g, b)] += 1
        chroma[max(r, g, b) - min(r, g, b)] += 1

    total = float(n)
    print("deficit de branco (255 - max(R,G,B)) — acumulado")
    print("  valor   %pixels   %acumulado")
    cum = 0
    for d in range(0, 90):
        c = deficit.get(d, 0)
        cum += c
        if d % 3 == 0 or c:
            print(f"  {d:5d}   {100.0 * c / total:7.3f}%   {100.0 * cum / total:8.3f}%")

    print()
    print("croma (max-min) — acumulado")
    print("  valor   %pixels   %acumulado")
    cum = 0
    for c in range(0, 60):
        k = chroma.get(c, 0)
        cum += k
        if c % 3 == 0 or k:
            print(f"  {c:5d}   {100.0 * k / total:7.3f}%   {100.0 * cum / total:8.3f}%")

    return 0


if __name__ == "__main__":
    sys.exit(main())
