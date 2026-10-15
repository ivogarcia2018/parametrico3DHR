"""
Retrato do formador (Ivo Garcia) para a secao de credibilidade.

`foto.jpg` chega como 1024x1024 JPEG com fundo de estudio cinzento-claro
(238,238,238) e o sujeito deslocado para a direita da moldura. Duas adaptacoes:

  1. Recorte 4:5. O quadrado original deixa muito ar acima da cabeca e corta
     o busto a meio; 4:5 e' a razao que o bloco de credibilidade usa.
  2. WebP + `method=6`, para nao pesar um retrato que ocupa uma coluna.

O fundo nao e' removido. Num fundo escuro daria um rectangulo claro solto, e
remover limiar na camisa (205,207,227) arriscava comel-a em vez do fundo
(238,238,238) — a distancia entre os dois e' pequena demais para um limiar
seguro. O retrato fica entao como uma "estampa" com legenda por baixo, o que
segue a convencao do resto da pagina.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "media" / "foto.jpg"

# Recorte medido sobre o original: 210,20 -> 890,875 (680x855 = 4:5,03).
# O topo deixa ~4% de ar acima do cabelo (medido: o sujeito comeca em y=62)
# e a base corta a meio do peito. O recorte anterior comecava em y=95 e
# cortava o cimo da cabeca — manter este valor acima do inicio do sujeito.
CROP = (210, 20, 890, 875)

TARGETS = {
    "mentor-ivo-garcia.webp": 760,
    "mentor-ivo-garcia-sm.webp": 420,
}


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"fonte em falta: {SRC}")

    with Image.open(SRC) as im:
        portrait = im.convert("RGB").crop(CROP)

        for name, width in TARGETS.items():
            height = round(width * portrait.height / portrait.width)
            out = portrait.resize((width, height), Image.LANCZOS)
            path = ROOT / "public" / "media" / name
            out.save(path, "WEBP", quality=88, method=6)
            print(f"{name}  {out.size[0]}x{out.size[1]}  {path.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
