"""
Mostra que folhas diferentes saem mesmo a sair, ciclo a ciclo.

O baralho tem 11 figuras e as folhas levam 4 a 6 celulas, escolhidas sem
reposicao — por isso nenhuma folha repete o conjunto. Antes, o baralho tinha
exatamente o numero de celulas e todas as folhas levavam as mesmas figuras,
so' baralhadas: era isso que se lia como monotonia.

Este script nao desenha nada; reproduz so' a parte do sorteio (grelha +
escolha das figuras) e imprime as folhas lado a lado.

    python client/scripts/brand/check_variety.py
"""

from pathlib import Path

FIGURES = [
    "plan", "radial", "section", "graph", "elevation", "axo",
    "diagrid", "spiral", "contour", "detail", "module",
]


class Rng:
    def __init__(self, seed: int) -> None:
        self.a = seed & 0xFFFFFFFF

    def next(self) -> float:
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (self.a ^ (self.a >> 15)) * (1 | self.a) & 0xFFFFFFFF
        t = (t + (t ^ (t >> 7)) * 61 ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def sheet(width: int, cycle: int):
    """Espelha o sorteio de buildScene."""
    rand = Rng(round(width) * 7919 + cycle * 104729)
    rand.next()  # mod da grelha
    rand.next()  # mod
    pad_x = rand.next()
    pad_y = rand.next()
    cols = 2 + int(rand.next() * 2) if width >= 700 else 2
    rows = 2 + int(rand.next() * 2)
    deck = FIGURES[:]
    for i in range(len(deck) - 1, 0, -1):
        j = int(rand.next() * (i + 1))
        deck[i], deck[j] = deck[j], deck[i]
    return cols, rows, deck[: cols * rows]


def main() -> None:
    width = 1280
    seen: set[frozenset[str]] = set()
    orders: set[tuple[str, ...]] = set()
    for cycle in range(8):
        cols, rows, chosen = sheet(width, cycle)
        seen.add(frozenset(chosen))
        orders.add(tuple(chosen))
        grid = "  ".join(" ".join(chosen[i * cols : (i + 1) * cols]) for i in range(rows))
        print(f"ciclo {cycle}  {cols}x{rows}  {grid}")

    print()
    print(f"conjuntos distintos: {len(seen)} de 8")
    print(f"ordens distintas:    {len(orders)} de 8")
    if len(seen) < 8:
        raise SystemExit("FALHA: folhas repetem o mesmo conjunto de figuras")
    if len(orders) < 8:
        raise SystemExit("FALHA: folhas repetem a mesma ordem")
    print("ok: nenhuma folha repete o conjunto nem a ordem")


if __name__ == "__main__":
    main()
