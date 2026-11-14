"""verify_ds.py refuses wrong keys, unsafe expressions and choices that do not show their values."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
import verify_ds as v  # noqa: E402

ITEMS = {'entropy', 'descriptive'}


def problem(**over):
    p = {'id': 'info-001', 'item': 'entropy', 'setId': '1', 'position': 1, 'tier': 1, 'published': False,
         'question': '確率が $0.5, 0.5$ の分布のエントロピー（ビット）は？', 'choices': ['0.5', '1', '1.5', '2'], 'answerIndex': 1,
         'explanation': '$-2 \\times 0.5 \\log_2 0.5 = 1$', 'check': {'expr': 'entropy([0.5, 0.5])', 'values': [0.5, 1, 1.5, 2]}}
    p.update(over)
    return p


def errors(**over):
    return v.problems_of('info', [problem(**over)], ITEMS)


assert errors() == [], errors()
assert any('not answerIndex' in e for e in errors(answerIndex=0)), 'a wrong key is caught'
assert any('2 choices' in e for e in errors(check={'expr': 'entropy([0.5, 0.5])', 'values': [1, 1, 1.5, 2]}, choices=['1', '1.0', '1.5', '2'])), 'two right choices are caught'
assert any('fails' in e for e in errors(check={'expr': "__import__('os')", 'values': [0.5, 1, 1.5, 2]})), 'unknown names are refused'
assert any('fails' in e for e in errors(check={'expr': 'entropy.__class__', 'values': [0.5, 1, 1.5, 2]})), 'attributes are refused'
assert any('shows 3.0 but its value is 2' in e for e in errors(choices=['0.5', '1', '1.5', '3'])), 'a choice must show its value'
assert any('unknown item' in e for e in errors(item='nope'))
assert v.shown_number('$\\frac{1}{4}$') == 0.25 and v.shown_number('約 $0.47$ ビット') == 0.47 and v.shown_number('$2.5 \\times 10^{-3}$') == 0.0025
assert errors(choices=['50%', '100%', '150%', '200%']) == [], 'percentages count as their value / 100'
assert abs(v.evaluate('f1(8, 2, 4)') - 2 * 0.8 * (8 / 12) / (0.8 + 8 / 12)) < 1e-12
assert v.evaluate('conv_out(32, 3, 1, 1)') == 32 and v.evaluate('conv_out(28, 2, 0, 2)') == 14
assert abs(v.evaluate('auc([0.9, 0.8, 0.3, 0.1], [1, 0, 1, 0])') - 0.75) < 1e-12
print('PASS: verify_ds.py rejects wrong keys, unsafe expressions and choices that do not show their values')
