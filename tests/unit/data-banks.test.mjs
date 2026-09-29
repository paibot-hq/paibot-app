// The reviewed problem banks in src/data/ satisfy their set rules. Importing a
// validator checks its bank; the same validators gate math:generate and the
// D1 imports. Answer keys are re-derived by `npm run test:sympy`.
import '../../scripts/validate-quiz.mjs';
import '../../scripts/validate-math-arith.mjs';
import '../../scripts/validate-math-factorization.mjs';
import '../../scripts/validate-math-pythagoras.mjs';
