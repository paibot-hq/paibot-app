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


def equation(text):
    sides = text.split('=')
    if len(sides) != 2:
        raise ValueError('expected exactly one "=" in each equation')
    return parse_formula(sides[0]), parse_formula(sides[1])


def check(formula):
    """An identity "lhs = rhs", or "equation => v = expr": expr solves the equation for v."""
    parts = formula.split('=>')
    if len(parts) == 1:
        left, right = equation(formula)
        if not same(left, right):
            raise ValueError('the two sides are not equal')
        return
    if len(parts) != 2:
        raise ValueError('expected at most one "=>"')
    (p_left, p_right), (variable, value) = equation(parts[0]), equation(parts[1])
    if not (variable.is_Symbol and variable in (p_left - p_right).free_symbols):
        raise ValueError('the conclusion must be "v = expr" for a letter v of the equation')
    if not same((p_left - p_right).subs(variable, value), 0):
        raise ValueError('the conclusion does not solve the equation')


def main(path):
    candidates = json.loads(Path(path).read_text(encoding='utf-8'))
    ok, bad = {}, []
    for key, formulas in candidates.items():
        for formula in formulas:
            try:
                check(formula)
                ok.setdefault(key, []).append(formula)
            except Exception as error:  # noqa: BLE001 - report any parse or algebra failure
                bad.append([key, formula, f'{type(error).__name__}: {error}'])
    print(json.dumps({'ok': ok, 'bad': bad}, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
