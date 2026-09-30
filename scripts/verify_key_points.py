#!/usr/bin/env python3
"""Checks candidate key points ("lhs = rhs" formulas) with SymPy.

Usage: verify_key_points.py candidates.json   ({"unit/item": ["lhs = rhs", ...]})
Prints {"ok": {...}, "bad": [[key, formula, reason], ...]} as JSON: a formula is
ok when both sides parse in the formula grammar and are equal as expressions.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_math import parse_formula, same  # noqa: E402


def main(path):
    candidates = json.loads(Path(path).read_text(encoding='utf-8'))
    ok, bad = {}, []
    for key, formulas in candidates.items():
        for formula in formulas:
            try:
                sides = formula.split('=')
                if len(sides) != 2:
                    raise ValueError('expected exactly one "="')
                if not same(parse_formula(sides[0]), parse_formula(sides[1])):
                    raise ValueError('the two sides are not equal')
                ok.setdefault(key, []).append(formula)
            except Exception as error:  # noqa: BLE001 - report any parse or algebra failure
                bad.append([key, formula, f'{type(error).__name__}: {error}'])
    print(json.dumps({'ok': ok, 'bad': bad}, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
