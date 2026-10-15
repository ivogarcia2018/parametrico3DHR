"""Verificacao pos-build da seccao do formador.

Confere o que um build silenciosamente pode perder: o JSON-LD tem de ser JSON
valido (um erro aqui nao quebra a pagina, apenas o rich result), os dois WebP
tem de ser copias para o dist, e a seccao tem de existir no bundle.
"""

import json
import re
from pathlib import Path

# dist vive na raiz do repo (o build escreve em ../dist), enquanto os media
# vivem em client/public — por isso os dois scripts usam niveis diferentes.
DIST = Path(__file__).resolve().parents[3] / "dist" / "public"


def main() -> None:
    html = (DIST / "index.html").read_text(encoding="utf-8")

    match = re.search(
        r'<script type="application/ld\+json">(.*?)</script>', html, re.S
    )
    if not match:
        raise SystemExit("FALHA: JSON-LD ausente do index.html")
    data = json.loads(match.group(1))
    print(f"JSON-LD ok: {data['@type']} -> {data['name']} ({len(data)} chaves)")

    for name in ("mentor-ivo-garcia.webp", "mentor-ivo-garcia-sm.webp"):
        path = DIST / "media" / name
        if not path.exists():
            raise SystemExit(f"FALHA: {name} nao foi copiado para dist")
        print(f"{name}  {path.stat().st_size / 1024:.1f} kB")

    bundle = next((DIST / "assets").glob("index-*.js"))
    text = bundle.read_text(encoding="utf-8")

    # O srcSet e' um template literal (${photo.srcSm} 420w, ...), logo os
    # descritores nao ficam colados ao caminho no bundle. Verifica-se cada
    # parte em vez da string inteira.
    checks = [
        ("/media/mentor-ivo-garcia.webp", "caminho do retrato master"),
        ("/media/mentor-ivo-garcia-sm.webp", "caminho do retrato -sm"),
        ("420w", "descritor de largura do -sm"),
        ("V-Ray Mentor em Portugal", "credencial V-Ray"),
        ("width:760,height:956", "dimensao intrinseca (evita CLS)"),
    ]
    failed = [label for needle, label in checks if needle not in text]
    for needle, label in checks:
        print(f"{label}: {'ok' if needle in text else 'FALHA — ausente'}")

    print(f"bundle: {bundle.name}  {len(text) / 1024:.0f} kB")
    if failed:
        raise SystemExit("FALHA: " + "; ".join(failed))


if __name__ == "__main__":
    main()
