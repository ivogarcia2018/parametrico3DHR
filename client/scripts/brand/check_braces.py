"""Conta o balanceamento de chavetas do componente de fundo.

`tsc` so' diz "esperado }" na ultima linha, o que nao ajuda a achar o sitio.
Este script imprime a profundidade no fim de cada linha, para o ponto onde a
curva deixa de voltar a zero estar a vista. Faz uma contagem tosca (ignora
strings e comentarios), que chega para localizar o desequilibrio.
"""

import io
import sys
from pathlib import Path

TARGET = Path(__file__).resolve().parents[2] / "src" / "components" / "GraphField.tsx"

OPEN = "{(["
CLOSE = "})]"


def main() -> None:
    src = io.open(TARGET, encoding="utf-8").read()
    depth = 0
    in_str: str | None = None
    in_line_comment = False
    in_block_comment = False
    prev = ""

    for raw in src.splitlines():
        in_line_comment = False
        i = 0
        while i < len(raw):
            ch = raw[i]
            nxt = raw[i + 1] if i + 1 < len(raw) else ""
            if in_block_comment:
                if ch == "*" and nxt == "/":
                    in_block_comment = False
                    i += 2
                    continue
            elif in_str:
                if ch == "\\":
                    i += 2
                    continue
                if ch == in_str:
                    in_str = None
            else:
                if ch == "/" and nxt == "/":
                    break
                if ch == "/" and nxt == "*":
                    in_block_comment = True
                    i += 2
                    continue
                if ch in "\"'`":
                    in_str = ch
                elif ch in OPEN:
                    depth += 1
                elif ch in CLOSE:
                    depth -= 1
            i += 1
        prev = raw
        print(f"{depth:4d}  {raw[:96]}")

    print(f"\nprofundidade final: {depth}")
    sys.exit(0 if depth == 0 else 1)


if __name__ == "__main__":
    main()
