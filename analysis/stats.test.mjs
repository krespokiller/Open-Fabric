// Tests for stats.mjs. Every expected value comes from a source that does not use the
// code under test: a closed form, a published table value, or brute-force enumeration.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from './stats.mjs';

const Z95 = 1.959963984540054;

function near(actual, expected, tolerance, label = '') {
  assert.ok(
    typeof actual === 'number' && Math.abs(actual - expected) <= tolerance,
    `${label} expected ${expected} within ${tolerance}, got ${actual}`,
  );
}

// ---- independent helpers (BigInt, no shared code with stats.mjs) ----

function choose(n, k) {
  if (k < 0 || k > n) return 0n;
  let r = 1n;
  for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
}

const ratio = (num, den) => Number((num * 10n ** 18n) / den) / 1e18;

// Exact conditional distribution of T by listing every table with the observed margins.
function bruteCmh(strata) {
  let dist = new Map([[0, 1n]]);
  let total = 1n;
  let observed = 0;
  for (const { xT, nT, xC, nC } of strata) {
    const r = xT + xC;
    observed += xT;
    total *= choose(nT + nC, r);
    const next = new Map();
    for (let x = Math.max(0, r - nC); x <= Math.min(nT, r); x++) {
      const w = choose(nT, x) * choose(nC, r - x);
      for (const [t, v] of dist) next.set(t + x, (next.get(t + x) ?? 0n) + v * w);
    }
    dist = next;
  }
  const at = dist.get(observed);
  let upper = 0n;
  let lower = 0n;
  let two = 0n;
  for (const [t, v] of dist) {
    if (t >= observed) upper += v;
    if (t <= observed) lower += v;
    if (v <= at) two += v;
  }
  return { upper: ratio(upper, total), lower: ratio(lower, total), twoSided: ratio(two, total) };
}

function binomialPmf(n, k, p) {
  return Number(choose(n, k)) * p ** k * (1 - p) ** (n - k);
}

describe('rng', () => {
  test('is reproducible, seed dependent and inside [0, 1)', () => {
    const a = S.rng(7);
    const b = S.rng(7);
    const c = S.rng(8);
    const first = [a(), a(), a()];
    assert.deepEqual(first, [b(), b(), b()]);
    assert.notDeepEqual(first, [c(), c(), c()]);
    let sum = 0;
    const g = S.rng(123);
    for (let i = 0; i < 100000; i++) {
      const u = g();
      assert.ok(u >= 0 && u < 1);
      sum += u;
    }
    near(sum / 100000, 0.5, 0.005, 'mean of uniforms');
  });
});

describe('normal distribution', () => {
  test('cdf matches tabulated values', () => {
    near(S.normalCdf(0), 0.5, 1e-15);
    near(S.normalCdf(1), 0.8413447460685429, 1e-12);
    near(S.normalCdf(Z95), 0.975, 1e-12);
    near(S.normalCdf(-3), 0.0013498980316301, 1e-13);
    near(S.normalCdf(-6), 9.865876450377e-10, 1e-18);
    near(S.normalCdf(2.5) + S.normalCdf(-2.5), 1, 1e-14);
  });

  test('quantile matches tabulated values and inverts the cdf', () => {
    near(S.normalQuantile(0.975), Z95, 1e-10);
    near(S.normalQuantile(0.8), 0.8416212335729143, 1e-10);
    near(S.normalQuantile(0.5), 0, 1e-12);
    near(S.normalQuantile(0.025), -Z95, 1e-10);
    for (const p of [1e-6, 0.003125, 0.021875, 0.2, 0.6, 0.99, 0.999999]) {
      near(S.normalCdf(S.normalQuantile(p)), p, 1e-12 + p * 1e-9, `roundtrip ${p}`);
    }
    assert.throws(() => S.normalQuantile(0), RangeError);
    assert.throws(() => S.normalQuantile(1), RangeError);
  });
});

describe('beta distribution', () => {
  test('log gamma equals the sum of logs and the half-integer closed form', () => {
    let sum = 0;
    for (let n = 1; n <= 170; n++) {
      sum += Math.log(n);
      near(S.logGamma(n + 1), sum, 1e-10 * Math.max(1, sum), `lgamma(${n + 1})`);
    }
    near(S.logGamma(0.5), 0.5 * Math.log(Math.PI), 1e-12);
    near(S.logGamma(1), 0, 1e-12);
  });

  test('anchor: I_0.5(2,3) = 0.6875', () => {
    near(S.betaCdf(0.5, 2, 3), 0.6875, 1e-12);
  });

  test('closed forms and the binomial identity', () => {
    for (const x of [0.01, 0.2, 0.5, 0.83, 0.99]) {
      near(S.betaCdf(x, 1, 1), x, 1e-12);
      near(S.betaCdf(x, 4, 1), x ** 4, 1e-12);
      near(S.betaCdf(x, 1, 6), 1 - (1 - x) ** 6, 1e-12);
      near(S.betaCdf(x, 0.5, 0.5), (2 / Math.PI) * Math.asin(Math.sqrt(x)), 1e-10);
    }
    // I_p(k, n-k+1) = P(Bin(n, p) >= k)
    for (const [n, k, p] of [[30, 7, 0.2], [30, 29, 0.9], [120, 60, 0.47], [240, 12, 0.05]]) {
      let tail = 0;
      for (let i = k; i <= n; i++) tail += binomialPmf(n, i, p);
      near(S.betaCdf(p, k, n - k + 1), tail, 1e-10, `binomial identity n=${n}`);
    }
  });

  test('edges and the quantile', () => {
    assert.equal(S.betaCdf(0, 2, 3), 0);
    assert.equal(S.betaCdf(1, 2, 3), 1);
    near(S.betaQuantile(0.6875, 2, 3), 0.5, 1e-10);
    near(S.betaQuantile(0.025, 1, 34), 1 - 0.975 ** (1 / 34), 1e-10);
  });
});

describe('wilson', () => {
  test('anchor: 0 of 34 has upper limit 0.1015 and lower limit exactly 0', () => {
    const w = S.wilson(0, 34);
    near(w.upper, 0.1015, 5e-5);
    near(w.upper, Z95 ** 2 / (34 + Z95 ** 2), 1e-12);
    assert.equal(w.lower, 0);
    assert.equal(w.estimate, 0);
  });

  test('published values: 5 of 10 and 81 of 263 (Newcombe 1998)', () => {
    const a = S.wilson(5, 10);
    near(a.lower, 0.2366, 5e-5);
    near(a.upper, 0.7634, 5e-5);
    const b = S.wilson(81, 263);
    near(b.lower, 0.2553, 5e-5);
    near(b.upper, 0.3662, 5e-5);
  });

  test('all successes: upper limit exactly 1, lower n/(n+z^2)', () => {
    const w = S.wilson(12, 12);
    assert.equal(w.upper, 1);
    near(w.lower, 12 / (12 + Z95 ** 2), 1e-12);
  });

  test('uses the z it is given', () => {
    near(S.wilson(0, 20, 2.44).upper, 2.44 ** 2 / (20 + 2.44 ** 2), 1e-12);
  });

  test('no runs: estimate is null and the interval is the whole range', () => {
    assert.deepEqual(S.wilson(0, 0), { estimate: null, lower: 0, upper: 1 });
  });

  test('rejects impossible counts', () => {
    assert.throws(() => S.wilson(5, 4), RangeError);
    assert.throws(() => S.wilson(-1, 4), RangeError);
    assert.throws(() => S.wilson(1.5, 4), RangeError);
  });
});

describe('clopperPearson', () => {
  test('zero successes: closed form 1 - (alpha/2)^(1/n)', () => {
    const c = S.clopperPearson(0, 34);
    assert.equal(c.lower, 0);
    near(c.upper, 1 - 0.025 ** (1 / 34), 1e-9);
  });

  test('all successes: closed form (alpha/2)^(1/n)', () => {
    const c = S.clopperPearson(34, 34);
    assert.equal(c.upper, 1);
    near(c.lower, 0.025 ** (1 / 34), 1e-9);
  });

  test('1 of 2: closed form from the quadratic', () => {
    const c = S.clopperPearson(1, 2);
    near(c.lower, 1 - Math.sqrt(0.975), 1e-9);
    near(c.upper, Math.sqrt(0.975), 1e-9);
  });

  test('published value: 81 of 263 (Newcombe 1998)', () => {
    const c = S.clopperPearson(81, 263);
    near(c.lower, 0.2527, 5e-5);
    near(c.upper, 0.3676, 5e-5);
  });

  test('"at least half" needs 9 of 10: the lower limit solves 10p^9 - 9p^10 = 0.025', () => {
    const nine = S.clopperPearson(9, 10).lower;
    near(10 * nine ** 9 - 9 * nine ** 10, 0.025, 1e-9);
    assert.ok(nine >= 0.5);
    assert.ok(S.clopperPearson(8, 10).lower < 0.5);
  });

  test('level changes the limits; no runs gives the whole range', () => {
    near(S.clopperPearson(0, 10, 0.9).upper, 1 - 0.05 ** (1 / 10), 1e-9);
    assert.deepEqual(S.clopperPearson(0, 0), { estimate: null, lower: 0, upper: 1 });
    assert.throws(() => S.clopperPearson(3, 2), RangeError);
  });
});

describe('zeroSuccessBound', () => {
  test('anchor: 0 of 34 gives at most 8.4%', () => {
    near(S.zeroSuccessBound(34), 0.0843, 5e-5);
    near(S.zeroSuccessBound(34), 1 - 0.05 ** (1 / 34), 1e-12);
  });

  test('other levels and the empty case', () => {
    near(S.zeroSuccessBound(34, 0.975), 1 - 0.025 ** (1 / 34), 1e-12);
    near(S.zeroSuccessBound(1), 0.95, 1e-12);
    assert.equal(S.zeroSuccessBound(0), 1);
  });
});

describe('newcombe', () => {
  test('anchor: 56 of 70 against 48 of 80 gives (0.0524, 0.3339)', () => {
    const d = S.newcombe(56, 70, 48, 80);
    near(d.estimate, 0.2, 1e-12);
    near(d.lower, 0.0524, 5e-5);
    near(d.upper, 0.3339, 5e-5);
  });

  test('published value: 9 of 10 against 3 of 10 gives (0.1705, 0.8090)', () => {
    const d = S.newcombe(9, 10, 3, 10);
    near(d.lower, 0.1705, 5e-5);
    near(d.upper, 0.809, 5e-5);
  });

  test('zero successes in both arms: symmetric, half-width is the Wilson upper limit', () => {
    const d = S.newcombe(0, 10, 0, 10);
    const u = Z95 ** 2 / (10 + Z95 ** 2);
    assert.equal(d.estimate, 0);
    near(d.upper, u, 1e-12);
    near(d.lower, -u, 1e-12);
  });

  test('all against none: upper limit exactly 1', () => {
    const d = S.newcombe(10, 10, 0, 10);
    const u = Z95 ** 2 / (10 + Z95 ** 2);
    assert.equal(d.estimate, 1);
    assert.equal(d.upper, 1);
    near(d.lower, 1 - Math.SQRT2 * u, 1e-12);
  });

  test('an empty arm: estimate is null and the interval is the whole range', () => {
    assert.deepEqual(S.newcombe(3, 5, 0, 0), { estimate: null, lower: -1, upper: 1 });
  });
});

describe('exactCmh', () => {
  test('anchor: Fisher two-sided for 10 of 25 against 15 of 25 is 0.2578', () => {
    const r = S.exactCmh([{ xT: 15, nT: 25, xC: 10, nC: 25 }]);
    near(r.pTwoSided, 0.2578, 5e-5);
    const swapped = S.exactCmh([{ xT: 10, nT: 25, xC: 15, nC: 25 }]);
    near(swapped.pTwoSided, r.pTwoSided, 1e-12);
    near(swapped.pLower, r.pUpper, 1e-12);
  });

  test('anchor: Fisher for 0 of 5 against 5 of 5 is 2/252 two-sided, 1/252 one-sided', () => {
    const r = S.exactCmh([{ xT: 5, nT: 5, xC: 0, nC: 5 }]);
    near(r.pTwoSided, 2 / 252, 1e-12);
    near(r.pTwoSided, 0.008, 5e-4);
    near(r.pUpper, 1 / 252, 1e-12);
    near(r.pLower, 1, 1e-12);
  });

  test('tea tasting: 3 of 4 against 1 of 4 gives 17/70 and 34/70', () => {
    const r = S.fisherExact(3, 4, 1, 4);
    near(r.pUpper, 17 / 70, 1e-12);
    near(r.pTwoSided, 34 / 70, 1e-12);
  });

  test('several strata equal the brute-force enumeration', () => {
    const cases = [
      [{ xT: 3, nT: 5, xC: 1, nC: 5 }, { xT: 2, nT: 4, xC: 2, nC: 4 }, { xT: 4, nT: 6, xC: 1, nC: 5 }],
      [{ xT: 2, nT: 2, xC: 0, nC: 2 }, { xT: 1, nT: 2, xC: 1, nC: 2 }, { xT: 2, nT: 2, xC: 1, nC: 2 }, { xT: 0, nT: 2, xC: 1, nC: 2 }],
      [{ xT: 7, nT: 10, xC: 2, nC: 10 }, { xT: 9, nT: 10, xC: 8, nC: 10 }],
      [{ xT: 1, nT: 3, xC: 3, nC: 7 }, { xT: 0, nT: 4, xC: 2, nC: 2 }],
    ];
    for (const strata of cases) {
      const expected = bruteCmh(strata);
      const got = S.exactCmh(strata);
      near(got.pUpper, expected.upper, 1e-12, 'upper');
      near(got.pLower, expected.lower, 1e-12, 'lower');
      near(got.pTwoSided, expected.twoSided, 1e-12, 'two-sided');
    }
  });

  test('reports the observed and expected statistic', () => {
    const r = S.exactCmh([{ xT: 3, nT: 5, xC: 1, nC: 5 }, { xT: 2, nT: 4, xC: 2, nC: 4 }]);
    assert.equal(r.observed, 5);
    near(r.expected, 2 + 2, 1e-12);
    assert.equal(r.informativeStrata, 2);
  });

  test('zero successes, all successes: every p is 1 and no stratum is informative', () => {
    for (const strata of [
      [{ xT: 0, nT: 5, xC: 0, nC: 5 }, { xT: 0, nT: 5, xC: 0, nC: 5 }],
      [{ xT: 5, nT: 5, xC: 5, nC: 5 }],
    ]) {
      const r = S.exactCmh(strata);
      assert.equal(r.pUpper, 1);
      assert.equal(r.pLower, 1);
      assert.equal(r.pTwoSided, 1);
      assert.equal(r.informativeStrata, 0);
    }
  });

  test('an empty stratum changes nothing; no strata at all gives p = 1', () => {
    const base = [{ xT: 3, nT: 5, xC: 1, nC: 5 }];
    const withEmpty = [...base, { xT: 0, nT: 0, xC: 0, nC: 0 }, { xT: 2, nT: 3, xC: 0, nC: 0 }];
    assert.deepEqual(S.exactCmh(withEmpty), S.exactCmh(base));
    assert.equal(S.exactCmh([]).pUpper, 1);
    assert.equal(S.exactCmh([]).informativeStrata, 0);
  });

  test('rejects impossible counts', () => {
    assert.throws(() => S.exactCmh([{ xT: 6, nT: 5, xC: 0, nC: 5 }]), RangeError);
  });
});

describe('sample sizes', () => {
  test('anchor: normal approximation gives 97, 43, 24 and 15 runs per arm around 50%', () => {
    assert.equal(S.sampleSizeNormal(0.6, 0.4), 97);
    assert.equal(S.sampleSizeNormal(0.65, 0.35), 43);
    assert.equal(S.sampleSizeNormal(0.7, 0.3), 24);
    assert.equal(S.sampleSizeNormal(0.75, 0.25), 15);
  });

  test('from a 10% baseline it gives 62, 32, 20 and 14 (method.md)', () => {
    assert.equal(S.sampleSizeNormal(0.3, 0.1), 62);
    assert.equal(S.sampleSizeNormal(0.4, 0.1), 32);
    assert.equal(S.sampleSizeNormal(0.5, 0.1), 20);
    assert.equal(S.sampleSizeNormal(0.6, 0.1), 14);
  });

  test('exact power of the Fisher test equals a direct enumeration', () => {
    // n = 5 per arm. By hand, the tables with a two-sided p of at most 5% are 5 against 0
    // (2/252), 5 against 1 and 4 against 0 (both 10/210), and their mirrors.
    const p1 = 0.9;
    const p2 = 0.2;
    const b = (k, p) => binomialPmf(5, k, p);
    const byHand = b(5, p1) * b(0, p2) + b(0, p1) * b(5, p2) + b(5, p1) * b(1, p2) + b(1, p1) * b(5, p2) + b(4, p1) * b(0, p2) + b(0, p1) * b(4, p2);
    near(S.fisherPower(5, p1, p2), byHand, 1e-12);
    // The same number from every table, with the p-value computed in whole numbers.
    let enumerated = 0;
    for (let x1 = 0; x1 <= 5; x1++) {
      for (let x2 = 0; x2 <= 5; x2++) {
        if (bruteCmh([{ xT: x1, nT: 5, xC: x2, nC: 5 }]).twoSided <= 0.05) enumerated += b(x1, p1) * b(x2, p2);
      }
    }
    near(S.fisherPower(5, p1, p2), enumerated, 1e-12);
    assert.equal(S.fisherPower(3, 0.9, 0.1), 0); // 0 of 3 against 3 of 3 has p = 0.1
    near(S.fisherPower(8, 0.5, 0.5, 1), 1, 1e-12); // every table rejects at alpha = 1
  });

  test('exact Fisher needs more runs than the normal approximation', () => {
    assert.equal(S.sampleSizeFisher(0.6, 0.4), 102);
    assert.equal(S.sampleSizeFisher(0.65, 0.35), 49);
    assert.equal(S.sampleSizeFisher(0.7, 0.3), 29);
    assert.equal(S.sampleSizeFisher(0.75, 0.25), 18);
  });

  test('the power of an exact test is not monotone: 102 runs reach 80%, 103 to 107 fall back', () => {
    assert.ok(S.fisherPower(102, 0.6, 0.4) >= 0.8);
    for (let n = 103; n <= 107; n++) assert.ok(S.fisherPower(n, 0.6, 0.4) < 0.8, `n = ${n}`);
    assert.equal(S.sampleSizeFisher(0.6, 0.4, { stable: 10 }), 108);
    assert.equal(S.sampleSizeFisher(0.5, 0.5), Infinity);
    assert.equal(S.sampleSizeNormal(0.5, 0.5), Infinity);
  });
});

describe('thresholds', () => {
  test('one look spends everything; half then full spends 0.003125 then 0.021875', () => {
    assert.deepEqual(S.spendingThresholds([5]), [0.025]);
    const two = S.spendingThresholds([3, 6]);
    near(two[0], 0.003125, 1e-15);
    near(two[1], 0.021875, 1e-15);
    near(S.spendingThresholds([2, 5, 9]).reduce((a, b) => a + b, 0), 0.025, 1e-15);
  });

  test('rejects looks that do not increase', () => {
    assert.throws(() => S.spendingThresholds([]), RangeError);
    assert.throws(() => S.spendingThresholds([4, 4]), RangeError);
    assert.throws(() => S.spendingThresholds([0, 4]), RangeError);
  });

  test('z_R is the normal quantile of 1 - a_j plus delta', () => {
    const one = S.planThresholds({ dStar: 0.3, looks: [5], delta: 0.1 });
    near(one.zR[0], Z95 + 0.1, 1e-9);
    const two = S.planThresholds({ dStar: 0.3, looks: [3, 6], delta: 0.16 });
    near(S.normalCdf(two.zR[0] - 0.16), 1 - 0.003125, 1e-12);
    near(S.normalCdf(two.zR[1] - 0.16), 1 - 0.021875, 1e-12);
    assert.deepEqual(two.t, [0.5, 1]);
    assert.deepEqual(S.planThresholds({ dStar: 0.3, looks: [5], zR: [2.06] }).zR, [2.06]);
    assert.throws(() => S.planThresholds({ dStar: 0.3, looks: [5] }), /delta|zR/);
  });
});

describe('interactionFlag', () => {
  const stack = (stack, xT, xC, n = 10) => ({ stack, xT, nT: n, xC, nC: n });

  test('same sign in every stack is never an interaction', () => {
    assert.equal(S.interactionFlag([stack('a', 9, 1), stack('b', 6, 5)]), false);
  });

  test('a strong reversal is flagged; the contrast interval matches a hand computation', () => {
    const counts = [stack('a', 9, 3), stack('b', 3, 9)];
    assert.equal(S.interactionFlag(counts), true);
    const { z, pairs } = S.stackContrasts(counts);
    near(z, Z95, 1e-9);
    assert.equal(pairs.length, 1);
    near(pairs[0].contrast, 1.2, 1e-12);
    // Newcombe (0.1705, 0.8090) and its mirror, squared and added: 1.2 -/+ 0.4295 * sqrt(2)
    near(pairs[0].lower, 1.2 - Math.SQRT2 * (0.6 - 0.17052), 1e-4);
    near(pairs[0].upper, 1.2 + Math.SQRT2 * (0.80902 - 0.6), 1e-4);
    assert.equal(pairs[0].flagged, true);
  });

  test('a weak reversal is not flagged', () => {
    assert.equal(S.interactionFlag([stack('a', 6, 5), stack('b', 5, 6)]), false);
  });

  test('a zero difference is not an opposite sign', () => {
    assert.equal(S.interactionFlag([stack('a', 10, 0), stack('b', 5, 5)]), false);
  });

  test('three stacks use the Bonferroni constant for three pairs', () => {
    const { z, pairs } = S.stackContrasts([stack('a', 9, 3), stack('b', 3, 9), stack('c', 5, 5)]);
    near(S.normalCdf(z), 1 - 0.05 / 6, 1e-12);
    assert.equal(pairs.length, 3);
  });

  test('a stack with an empty arm is ignored; fewer than two stacks is never flagged', () => {
    assert.equal(S.interactionFlag([stack('a', 9, 1), { stack: 'b', xT: 0, nT: 0, xC: 9, nC: 10 }]), false);
    assert.equal(S.interactionFlag([stack('a', 9, 1)]), false);
    assert.equal(S.interactionFlag([]), false);
  });
});

describe('decide', () => {
  const stacks = ['django', 'nextjs'];
  const slots = ['discount', 'cart', 'signature', 'webhook', 'ledger'];
  // counts[stack][slot] for each arm, m runs per cell
  function cells(m, xT, xC) {
    const out = [];
    stacks.forEach((stack, k) => slots.forEach((slot, s) => {
      out.push({ stack, slot, xT: xT[k][s], nT: m, xC: xC[k][s], nC: m });
    }));
    return out;
  }
  const fill = (v) => [Array(5).fill(v), Array(5).fill(v)];
  const plan50 = { dStar: 0.5, looks: [2], delta: 0.48, stacks, slots };

  test('every run failed: undecidable by floor', () => {
    const r = S.decide(cells(2, fill(0), fill(0)), plan50, { index: 1 });
    assert.equal(r.verdict, 'undecidable');
    assert.match(r.cause, /floor/);
    assert.equal(r.stop, true);
  });

  test('every run passed: undecidable by ceiling', () => {
    const r = S.decide(cells(2, fill(2), fill(2)), plan50, { index: 1 });
    assert.equal(r.verdict, 'undecidable');
    assert.match(r.cause, /ceiling/);
  });

  test('no difference with enough runs is refuted; U matches a hand computation', () => {
    const r = S.decide(cells(2, fill(1), fill(1)), plan50, { index: 1 });
    assert.equal(r.verdict, 'refuted');
    // Wilson half-width at z = 2.44 for 10 of 20 is 0.23947; squared and added: 0.33866
    near(r.statistics.upperLimit, 0.33866, 2e-4);
    near(r.statistics.zR, Z95 + 0.48, 1e-9);
    assert.equal(r.statistics.pooled.difference, 0);
  });

  test('refutation is strict: an upper limit equal to d* is not below it, a hair above the limit is', () => {
    const data = cells(2, fill(1), fill(1));
    const upper = S.decide(data, plan50, { index: 1 }).statistics.upperLimit;
    const atBoundary = S.decide(data, { ...plan50, dStar: upper }, { index: 1 });
    assert.equal(atBoundary.statistics.upperLimit, upper);
    assert.notEqual(atBoundary.verdict, 'refuted');
    assert.equal(atBoundary.verdict, 'undecidable');
    const justAbove = S.decide(data, { ...plan50, dStar: upper + 1e-9 }, { index: 1 });
    assert.equal(justAbove.verdict, 'refuted');
  });

  test('a large difference in both stacks is supported; p_S equals the brute force', () => {
    const xC = [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0]];
    const data = cells(2, fill(2), xC);
    const r = S.decide(data, plan50, { index: 1 });
    assert.equal(r.verdict, 'supported');
    near(r.statistics.pS, bruteCmh(data).upper, 1e-12);
    assert.ok(r.statistics.pS <= r.statistics.alphaSpent);
    assert.equal(r.statistics.alphaSpent, 0.025);
    assert.equal(r.statistics.positiveInEveryStack, true);
  });

  test('"estimate >= d*" is reported and never required', () => {
    const plan = { dStar: 0.3, looks: [5], delta: 0.1, stacks, slots };
    const data = cells(5, [[3, 3, 3, 3, 2], [3, 3, 3, 3, 2]], [[2, 2, 1, 1, 2], [1, 2, 2, 1, 1]]);
    const r = S.decide(data, plan, { index: 1 });
    const pS = bruteCmh(data).upper;
    assert.ok(pS <= 0.025, `brute-force p_S ${pS}`);
    near(r.statistics.pS, pS, 1e-12);
    near(r.statistics.pooled.difference, 0.26, 1e-12);
    assert.equal(r.statistics.estimateAtLeastDStar, false);
    assert.equal(r.verdict, 'supported');
  });

  test('a small p_S is not support when one stack has no positive difference', () => {
    const data = cells(2, [Array(5).fill(2), Array(5).fill(1)], [Array(5).fill(0), Array(5).fill(1)]);
    const r = S.decide(data, plan50, { index: 1 });
    assert.ok(bruteCmh(data).upper <= 0.025);
    assert.equal(r.statistics.positiveInEveryStack, false);
    assert.equal(r.verdict, 'undecidable');
    assert.match(r.cause, /stack/);
  });

  test('a reversal between stacks is not refuted: the interaction flag blocks it', () => {
    const data = cells(2, [Array(5).fill(2), Array(5).fill(0)], [Array(5).fill(0), Array(5).fill(2)]);
    const r = S.decide(data, plan50, { index: 1 });
    assert.ok(r.statistics.upperLimit < 0.5);
    assert.equal(r.statistics.interaction, true);
    assert.equal(r.verdict, 'undecidable');
    assert.match(r.cause, /interaction/);
  });

  test('an interim look that crosses no boundary continues; the last look is undecidable', () => {
    const plan = { dStar: 0.3, looks: [3, 6], delta: 0.16, stacks, slots };
    const xT3 = [[2, 2, 2, 1, 2], [2, 1, 2, 2, 2]];
    const xC3 = [[1, 2, 1, 1, 1], [1, 1, 2, 1, 1]];
    const first = S.decide(cells(3, xT3, xC3), plan, { index: 1 });
    assert.equal(first.verdict, 'continue');
    assert.equal(first.stop, false);
    near(first.statistics.alphaSpent, 0.003125, 1e-15);
    const xT6 = [[4, 3, 4, 3, 4], [4, 3, 3, 4, 3]];
    const xC6 = [[3, 3, 2, 3, 3], [2, 3, 3, 3, 2]];
    const last = S.decide(cells(6, xT6, xC6), plan, { index: 2 });
    assert.equal(last.verdict, 'undecidable');
    assert.equal(last.stop, true);
    assert.match(last.cause, /boundary/);
    near(last.statistics.alphaSpent, 0.021875, 1e-15);
  });

  test('an early stop labels the estimate as biased', () => {
    const plan = { dStar: 0.3, looks: [3, 6], delta: 0.16, stacks, slots };
    const r = S.decide(cells(3, fill(3), [[0, 0, 1, 0, 0], [0, 0, 0, 0, 1]]), plan, { index: 1 });
    assert.equal(r.verdict, 'supported');
    assert.equal(r.statistics.earlyStop, true);
    assert.equal(r.statistics.estimateBias, 'upward');
    const full = S.decide(cells(2, fill(2), [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0]]), plan50, { index: 1 });
    assert.equal(full.statistics.earlyStop, false);
    assert.equal(full.statistics.estimateBias, null);
  });

  test('broken instrument: changed hash, incomplete block, unplanned look, missing cell', () => {
    const good = cells(2, fill(1), fill(1));
    const hash = S.decide(good, { ...plan50, hash: 'abc' }, { index: 1, hash: 'abd' });
    assert.equal(hash.verdict, 'undecidable');
    assert.match(hash.cause, /broken instrument.*hash/);

    const incomplete = good.map((c, i) => (i === 3 ? { ...c, nT: 1, xT: 1 } : c));
    const inc = S.decide(incomplete, plan50, { index: 1 });
    assert.equal(inc.verdict, 'undecidable');
    assert.match(inc.cause, /broken instrument.*incomplete block/);

    const unplannedIndex = S.decide(good, plan50, { index: 2 });
    assert.match(unplannedIndex.cause, /broken instrument.*unplanned look/);
    const unplannedSize = S.decide(cells(3, fill(1), fill(1)), plan50, { index: 1 });
    assert.equal(unplannedSize.verdict, 'undecidable');
    assert.match(unplannedSize.cause, /broken instrument.*unplanned look/);

    const missing = S.decide(good.slice(1), plan50, { index: 1 });
    assert.match(missing.cause, /broken instrument.*incomplete block/);
    assert.equal(S.decide(good, { ...plan50, hash: 'abc' }, { index: 1, hash: 'abc' }).verdict, 'refuted');
  });

  test('reports per stack, per slot and pooled, and flags a slot against the pooled direction', () => {
    const xT = [[2, 2, 2, 2, 0], [2, 2, 2, 2, 0]];
    const xC = [[0, 0, 0, 1, 2], [0, 0, 1, 0, 2]];
    const r = S.decide(cells(2, xT, xC), plan50, { index: 1 });
    const st = r.statistics;
    assert.equal(st.perStack.length, 2);
    assert.equal(st.perSlot.length, 5);
    assert.deepEqual(st.perStack.map((s) => [s.xT, s.nT, s.xC, s.nC]), [[8, 10, 3, 10], [8, 10, 3, 10]]);
    assert.deepEqual(st.opposingSlots, ['ledger']);
    assert.deepEqual([st.pooled.xT, st.pooled.nT, st.pooled.xC, st.pooled.nC], [16, 20, 6, 20]);
    // The pooled interval uses the z_R of the look, so it agrees with the verdict.
    const expected = S.newcombe(16, 20, 6, 20, Z95 + 0.48);
    near(st.pooled.interval.lower, expected.lower, 1e-9);
    near(st.pooled.interval.upper, expected.upper, 1e-9);
    assert.equal(st.upperLimit, st.pooled.interval.upper);
    near(st.perSlot[4].interval.lower, S.newcombe(0, 4, 4, 4).lower, 1e-12);
    assert.deepEqual(st.perSlot.map((s) => s.opposing), [false, false, false, false, true]);
    near(st.perStack[0].interval.upper, S.newcombe(8, 10, 3, 10).upper, 1e-12);
    assert.equal(st.runs, 40);
  });

  test('with one stratum the support test is the Fisher test', () => {
    const plan = { dStar: 0.4, looks: [25], delta: 0.1 };
    const r = S.decide([{ stack: 'only', slot: 'all', xT: 15, nT: 25, xC: 10, nC: 25 }], plan, { index: 1 });
    near(r.statistics.pTwoSided, 0.2578, 5e-5);
  });
});

describe('posteriorDifference', () => {
  test('anchor: P(Beta(4,3) > Beta(2,5)) = 29/33', () => {
    const r = S.posteriorDifference([{ stack: 'a', xT: 3, nT: 5, xC: 1, nC: 5 }], 0.3);
    near(r.pGreaterZero, 29 / 33, 5e-4);
    assert.deepEqual(r.perStack[0].treatment.a, 4);
    assert.deepEqual(r.perStack[0].treatment.b, 3);
    assert.deepEqual(r.perStack[0].control.a, 2);
    assert.deepEqual(r.perStack[0].control.b, 5);
  });

  test('no data: the difference of two uniforms is triangular', () => {
    const r = S.posteriorDifference([{ stack: 'a', xT: 0, nT: 0, xC: 0, nC: 0 }], 0.3);
    near(r.pGreaterZero, 0.5, 1e-9);
    near(r.pAtLeastDStar, (1 - 0.3) ** 2 / 2, 5e-4);
  });

  test('slots are pooled inside a stack and stacks are averaged with equal weight', () => {
    const split = S.posteriorDifference([
      { stack: 'a', slot: 'x', xT: 2, nT: 3, xC: 0, nC: 3 },
      { stack: 'a', slot: 'y', xT: 1, nT: 2, xC: 1, nC: 2 },
      { stack: 'b', slot: 'x', xT: 4, nT: 5, xC: 1, nC: 5 },
    ], 0.2);
    const pooled = S.posteriorDifference([
      { stack: 'a', xT: 3, nT: 5, xC: 1, nC: 5 },
      { stack: 'b', xT: 4, nT: 5, xC: 1, nC: 5 },
    ], 0.2);
    near(split.pGreaterZero, pooled.pGreaterZero, 1e-12);
    near(pooled.mean, ((4 / 7 - 2 / 7) + (5 / 7 - 2 / 7)) / 2, 1e-3);
    assert.ok(pooled.pAtLeastDStar < pooled.pGreaterZero);
    assert.ok(pooled.pGreaterZero > 29 / 33);
  });

  test('two stacks match a seeded Monte Carlo draw from the same posteriors', () => {
    const cells = [{ stack: 'a', xT: 6, nT: 10, xC: 3, nC: 10 }, { stack: 'b', xT: 4, nT: 10, xC: 4, nC: 10 }];
    const r = S.posteriorDifference(cells, 0.2);
    // Beta(a, b) with integer parameters is the a-th smallest of a+b-1 uniforms.
    const g = S.rng(99);
    const beta = (a, b) => Array.from({ length: a + b - 1 }, () => g()).sort((x, y) => x - y)[a - 1];
    let above0 = 0;
    let aboveD = 0;
    const draws = 60000;
    for (let i = 0; i < draws; i++) {
      const d = (beta(7, 5) - beta(4, 8) + beta(5, 7) - beta(5, 7)) / 2;
      if (d > 0) above0++;
      if (d >= 0.2) aboveD++;
    }
    near(r.pGreaterZero, above0 / draws, 0.008);
    near(r.pAtLeastDStar, aboveD / draws, 0.008);
  });
});

describe('bootstrapMean', () => {
  test('is reproducible and brackets the sample mean', () => {
    // Uneven values, so two seeds cannot land on the same resampled mean by a tie.
    const values = [3.14, 9.26, 4.53, 12.58, 7.97, 5.93, 30.23, 6.84, 8.46, 2.64, 11.33, 4.83];
    const a = S.bootstrapMean(values, 11);
    assert.deepEqual(a, S.bootstrapMean(values, 11));
    near(a.mean, values.reduce((x, y) => x + y, 0) / values.length, 1e-12);
    assert.ok(a.lower < a.mean && a.mean < a.upper);
    assert.notDeepEqual(a, S.bootstrapMean(values, 12));
  });

  test('constant values give a zero-width interval; no values give nulls', () => {
    assert.deepEqual(S.bootstrapMean([5, 5, 5], 1), { n: 3, mean: 5, lower: 5, upper: 5 });
    assert.deepEqual(S.bootstrapMean([], 1), { n: 0, mean: null, lower: null, upper: null });
  });

  test('for two values the limits are the exact binomial percentiles of the resampled mean', () => {
    // 40 draws of 0 or 1: the mean is Bin(40, 0.5)/40, whose 2.5% and 97.5% points are 14/40 and 26/40.
    const values = Array(20).fill(0).concat(Array(20).fill(1));
    const r = S.bootstrapMean(values, 5, 20000);
    near(r.lower, 14 / 40, 0.026);
    near(r.upper, 26 / 40, 0.026);
  });

  test('the level picks the percentile: 95% is the 2.5% and 97.5% points, 90% the 5% and 95% points', () => {
    // The mean is Bin(40, 0.5)/40 with steps of 1/40. P(X<=13)=0.0192 < 0.025 <= P(X<=14)=0.0403, so the
    // 2.5% point is exactly 14/40; P(X<=14) < 0.05 <= P(X<=15)=0.0769, so the 5% point is exactly 15/40.
    const values = Array(20).fill(0).concat(Array(20).fill(1));
    const wide = S.bootstrapMean(values, 5, 20000, 0.95);
    near(wide.lower, 14 / 40, 1e-9);
    near(wide.upper, 26 / 40, 1e-9);
    const narrow = S.bootstrapMean(values, 5, 20000, 0.9);
    near(narrow.lower, 15 / 40, 1e-9);
    near(narrow.upper, 25 / 40, 1e-9);
  });
});

describe('costPerCorrect', () => {
  const run = (tokens, correct) => ({ tokens, correct });

  test('estimate is total tokens over correct runs and equals m1 + m0(1-p)/p', () => {
    const runs = [run(100, true), run(300, true), run(900, false), run(500, false), run(700, false)];
    const r = S.costPerCorrect(runs, 1);
    assert.equal(r.n, 5);
    assert.equal(r.correct, 2);
    assert.equal(r.totalTokens, 2500);
    assert.equal(r.estimate, 1250);
    assert.equal(r.m1, 200);
    assert.equal(r.m0, 700);
    near(r.m1 + (r.m0 * (1 - 0.4)) / 0.4, r.estimate, 1e-9);
    assert.equal(r.wording, 'estimate');
    assert.ok(r.lower < r.estimate && r.estimate < r.upper);
  });

  test('constant tokens: the limits are c over the Clopper-Pearson limits', () => {
    const runs = [run(1000, true), run(1000, true), run(1000, false), run(1000, false)];
    const r = S.costPerCorrect(runs, 3);
    const cp = S.clopperPearson(2, 4);
    near(r.lower, 1000 / cp.upper, 1e-9);
    near(r.upper, 1000 / cp.lower, 1e-9);
  });

  test('zero correct runs: "at least" c_L / (1 - 0.025^(1/n)) and no upper limit', () => {
    const runs = Array.from({ length: 34 }, () => run(50000, false));
    const r = S.costPerCorrect(runs, 3);
    assert.equal(r.correct, 0);
    assert.equal(r.estimate, null);
    assert.equal(r.m1, null);
    assert.equal(r.m0, 50000);
    assert.equal(r.upper, Infinity);
    assert.equal(r.wording, 'at least');
    near(r.lower, 50000 / (1 - 0.025 ** (1 / 34)), 1e-6);
  });

  test('exactly one failed run: m0 is the tokens of that run and the estimate still adds up', () => {
    const runs = [run(100, true), run(200, true), run(300, true), run(400, true), run(7000, false)];
    const r = S.costPerCorrect(runs, 3);
    assert.equal(r.correct, 4);
    assert.equal(r.m0, 7000);
    assert.equal(r.m1, 250);
    assert.equal(r.estimate, 8000 / 4);
    near(r.m1 + (r.m0 * (1 - 0.8)) / 0.8, r.estimate, 1e-9);
  });

  test('all runs correct: finite limits, m0 is null', () => {
    const runs = Array.from({ length: 5 }, () => run(200, true));
    const r = S.costPerCorrect(runs, 3);
    assert.equal(r.estimate, 200);
    assert.equal(r.m0, null);
    near(r.lower, 200, 1e-9);
    near(r.upper, 200 / 0.025 ** (1 / 5), 1e-6);
  });

  test('no runs: not estimable; same seed, same answer', () => {
    assert.equal(S.costPerCorrect([], 1).wording, 'not estimable');
    assert.equal(S.costPerCorrect([], 1).estimate, null);
    const runs = [run(100, true), run(300, false), run(900, false), run(50, true), run(700, false)];
    assert.deepEqual(S.costPerCorrect(runs, 8), S.costPerCorrect(runs, 8));
  });
});

describe('costRatio', () => {
  const arm = (n, correct, tokens) => Array.from({ length: n }, (_, i) => ({ tokens, correct: i < correct }));

  test('splits the log ratio into a structural and a retry term', () => {
    const r = S.costRatio(arm(10, 8, 1000), arm(10, 4, 3000), 1);
    near(r.estimate, (1000 / 0.8) / (3000 / 0.4), 1e-12);
    near(r.structural, Math.log(1000 / 3000), 1e-12);
    near(r.retry, Math.log(0.4 / 0.8), 1e-12);
    near(r.structural + r.retry, Math.log(r.estimate), 1e-12);
    assert.equal(r.wording, 'estimate');
    assert.ok(r.lower < r.estimate && r.estimate < r.upper);
  });

  test('an arm with zero correct runs gives a one-sided bound and no estimate', () => {
    const control = S.costRatio(arm(10, 8, 1000), arm(10, 0, 3000), 1);
    assert.equal(control.estimate, null);
    assert.equal(control.wording, 'at most');
    assert.equal(control.lower, 0);
    assert.ok(Number.isFinite(control.upper));
    const treatment = S.costRatio(arm(10, 0, 1000), arm(10, 8, 3000), 1);
    assert.equal(treatment.wording, 'at least');
    assert.equal(treatment.upper, Infinity);
    assert.ok(treatment.lower > 0);
    const both = S.costRatio(arm(10, 0, 1000), arm(10, 0, 3000), 1);
    assert.equal(both.wording, 'not estimable');
    assert.equal(both.estimate, null);
  });
});

describe('gaugeTable', () => {
  const runs = (a, b, c, d, arm = 'kit-tests') => [
    ...Array.from({ length: a }, () => ({ arm, gaugePass: true, correct: true })),
    ...Array.from({ length: b }, () => ({ arm, gaugePass: true, correct: false })),
    ...Array.from({ length: c }, () => ({ arm, gaugePass: false, correct: true })),
    ...Array.from({ length: d }, () => ({ arm, gaugePass: false, correct: false })),
  ];

  test('cells and the three rates, positive meaning the judge fails', () => {
    const t = S.gaugeTable(runs(6, 3, 1, 10));
    assert.deepEqual([t.a, t.b, t.c, t.d, t.n], [6, 3, 1, 10, 20]);
    near(t.sensitivity.estimate, 10 / 13, 1e-12);
    near(t.specificity.estimate, 6 / 7, 1e-12);
    near(t.falseConfidence.estimate, 3 / 9, 1e-12);
    assert.deepEqual([t.falseConfidence.x, t.falseConfidence.n], [3, 9]);
    assert.deepEqual(t.falseConfidence.wilson, S.wilson(3, 9));
    assert.deepEqual(t.falseConfidence.clopperPearson, S.clopperPearson(3, 9));
    assert.equal(t.finalStateOnly, true);
  });

  test('an empty denominator is not estimable', () => {
    const t = S.gaugeTable(runs(0, 0, 2, 5));
    assert.equal(t.falseConfidence.estimable, false);
    assert.equal(t.falseConfidence.estimate, null);
    assert.equal(t.sensitivity.estimable, true);
    const none = S.gaugeTable([]);
    assert.equal(none.n, 0);
    assert.equal(none.sensitivity.estimable, false);
    assert.equal(none.specificity.estimable, false);
  });

  test('"at least half" holds for 9 of 10 and not for 8 of 10', () => {
    assert.equal(S.rateAtLeast(S.gaugeTable(runs(1, 9, 0, 0)).falseConfidence, 0.5), true);
    assert.equal(S.rateAtLeast(S.gaugeTable(runs(2, 8, 0, 0)).falseConfidence, 0.5), false);
    assert.equal(S.rateAtLeast(S.gaugeTable([]).falseConfidence, 0.5), false);
  });

  test('runs without a gauge result are counted as missing; arms are never pooled', () => {
    const t = S.gaugeTable([...runs(1, 1, 1, 1), { arm: 'kit-tests', gaugePass: null, correct: true }]);
    assert.equal(t.n, 4);
    assert.equal(t.missing, 1);
    assert.throws(() => S.gaugeTable([...runs(1, 1, 1, 1, 'x'), ...runs(1, 1, 1, 1, 'y')]), /arm/);
  });
});

describe('gaugeLoop', () => {
  test('matches a direct sum over attempts', () => {
    const [pi, se, sp, budget] = [0.3, 0.8, 0.9, 6];
    const r = S.gaugeLoop(pi, se, sp, budget);
    const g = pi * sp + (1 - pi) * (1 - se);
    near(r.gaugePassRate, g, 1e-12);
    near(r.falseConfidence, ((1 - pi) * (1 - se)) / g, 1e-12);
    let attempts = 0;
    for (let t = 1; t <= budget; t++) attempts += t * g * (1 - g) ** (t - 1);
    attempts += budget * (1 - g) ** budget;
    near(r.attempts, attempts, 1e-12);
    near(r.attemptsPerCorrect, 1 / (pi * sp), 1e-12);
    near(r.deliveryRate, 1 - (1 - g) ** budget, 1e-12);
  });

  test('a gauge that never passes uses the whole budget; a perfect gauge has no false confidence', () => {
    const never = S.gaugeLoop(0, 1, 1, 6);
    assert.equal(never.gaugePassRate, 0);
    assert.equal(never.attempts, 6);
    assert.equal(never.falseConfidence, null);
    assert.equal(never.attemptsPerCorrect, Infinity);
    const perfect = S.gaugeLoop(0.5, 1, 1, 4);
    assert.equal(perfect.falseConfidence, 0);
    assert.throws(() => S.gaugeLoop(1.2, 1, 1, 4), RangeError);
  });
});

describe('productLaw', () => {
  test('R and its interval follow the add-half log formula', () => {
    const q = [{ x: 8, n: 10 }, { x: 9, n: 10 }];
    const r = S.productLaw(q, 7, 10);
    near(r.estimate, 0.7 / (0.8 * 0.9), 1e-12);
    const logR = Math.log(7.5 / 10.5) - Math.log(8.5 / 10.5) - Math.log(9.5 / 10.5);
    const variance = 1 / 7.5 - 1 / 10.5 + (1 / 8.5 - 1 / 10.5) + (1 / 9.5 - 1 / 10.5);
    near(r.adjusted, Math.exp(logR), 1e-12);
    near(r.lower, Math.exp(logR - Z95 * Math.sqrt(variance)), 1e-9);
    near(r.upper, Math.exp(logR + Z95 * Math.sqrt(variance)), 1e-9);
    assert.equal(r.rejected, false);
    assert.equal(r.wording, 'not rejected');
    near(r.gamma, r.estimate, 1e-12); // two slots: gamma^(2-1) = R
  });

  test('a large shortfall is rejected and gamma is the (|S|-1)-th root of R', () => {
    const q = Array.from({ length: 5 }, () => ({ x: 45, n: 50 }));
    const r = S.productLaw(q, 3, 50);
    assert.equal(r.rejected, true);
    assert.equal(r.wording, 'rejected');
    assert.ok(r.upper < 1);
    near(r.gamma, r.estimate ** (1 / 4), 1e-12);
  });

  test('zero and full counts stay finite; an empty sample is not estimable', () => {
    const zeroAll = S.productLaw([{ x: 8, n: 10 }, { x: 9, n: 10 }], 0, 10);
    assert.equal(zeroAll.estimate, 0);
    assert.ok(zeroAll.lower > 0 && Number.isFinite(zeroAll.upper));
    const zeroSlot = S.productLaw([{ x: 0, n: 10 }, { x: 9, n: 10 }], 0, 10);
    assert.equal(zeroSlot.estimate, null);
    assert.ok(Number.isFinite(zeroSlot.adjusted));
    const full = S.productLaw([{ x: 10, n: 10 }, { x: 10, n: 10 }], 10, 10);
    assert.equal(full.estimate, 1);
    near(full.adjusted, 1, 1e-12);
    const empty = S.productLaw([{ x: 0, n: 0 }, { x: 9, n: 10 }], 5, 10);
    assert.equal(empty.wording, 'not estimable');
    assert.equal(empty.estimate, null);
    assert.equal(S.productLaw([], 5, 10).wording, 'not estimable');
  });
});

describe('breakEven', () => {
  test('uses N* = F / (CPC_W - CPC_L); no saving means no break-even', () => {
    assert.equal(S.breakEven(90000, 50000, 20000), 3);
    assert.equal(S.breakEven(90000, 20000, 20000), Infinity);
    assert.equal(S.breakEven(90000, 10000, 20000), Infinity);
  });
});

describe('readRuns', () => {
  const header = 'stack,arm,run,calls,prompt_tokens,completion_tokens,total_tokens,tokens_estimated,hidden_passed,hidden_total,stop_reason,built_final,wall_ms,model_ms,build_ms,hidden2_passed,hidden2_total';

  test('reads the columns the harness writes today', () => {
    const csv = [
      header,
      'django,bare,1,6,37659,14059,51718,false,0,21,budget,false,706845,306552,268203,0,26',
      'nextjs,tests,2,3,100,50,150,false,21,21,done,true,1,1,1,26,26',
      'nextjs,tests,3,3,100,50,150,false,21,21,done,true,1,1,1,25,26',
    ].join('\r\n') + '\r\n';
    const runs = S.readRuns(csv);
    assert.equal(runs.length, 3);
    assert.deepEqual(
      { ...runs[0], raw: undefined },
      {
        arm: 'bare', stack: 'django', slot: null, seed: null, run: 1, correct: false, gaugePass: null,
        tokens: 51718, tokensIn: 37659, tokensOut: 14059, calls: 6, hiddenPassed: 0, hiddenTotal: 47,
        hiddenFraction: 0, firstCorrect: null, firstCorrectAttempt: null, judgeAgrees: null, raw: undefined,
      },
    );
    assert.equal(runs[1].correct, true);
    assert.equal(runs[1].hiddenFraction, 1);
    assert.equal(runs[2].correct, false);
    near(runs[2].hiddenFraction, 46 / 47, 1e-12);
    assert.equal(runs[0].raw.stop_reason, 'budget');
  });

  test('reads slot, seed and gauge columns when they exist, and quoted fields', () => {
    const csv = [
      'stack,arm,slot,seed,total_tokens,hidden_passed,hidden_total,gauge_pass',
      'django,"kit, tests",discount,42,900,21,21,true',
      'django,kit-bare,cart,43,800,20,21,false',
      'django,kit-bare,cart,44,800,20,21,',
    ].join('\n');
    const runs = S.readRuns(csv);
    assert.equal(runs[0].arm, 'kit, tests');
    assert.equal(runs[0].slot, 'discount');
    assert.equal(runs[0].seed, 42);
    assert.equal(runs[0].gaugePass, true);
    assert.equal(runs[1].gaugePass, false);
    assert.equal(runs[2].gaugePass, null);
    assert.equal(runs[0].correct, true);
  });

  test('a kit arm written as arm.slot is read as the arm and its slot, so two kit arms compare by name', () => {
    const csv = [
      `${header},slot,gauge_pass,correct`,
      'nextjs,kit-tests.cart,1,2,100,50,150,false,21,21,visible_checks_pass,true,1,1,1,26,26,cart,1,1',
      'nextjs,kit-bare.cart,1,6,100,50,150,false,20,21,budget,true,1,1,1,26,26,cart,0,0',
      'nextjs,bare,1,6,100,50,150,false,0,21,budget,false,1,1,1,0,26,,0,0',
      'nextjs,v1.cart,1,6,100,50,150,false,0,21,budget,false,1,1,1,0,26,,0,0',
    ].join('\n');
    const runs = S.readRuns(csv);
    assert.deepEqual(
      runs.map((r) => [r.arm, r.slot, r.gaugePass, r.correct]),
      [['kit-tests', 'cart', true, true], ['kit-bare', 'cart', false, false], ['bare', null, false, false], ['v1.cart', null, false, false]],
    );
    assert.deepEqual(S.cellsFromRuns(runs, 'kit-tests', 'kit-bare'), [{ stack: 'nextjs', slot: 'cart', xT: 1, nT: 1, xC: 0, nC: 1 }]);
  });

  test('derives the gauge result from visible test counts', () => {
    const csv = 'stack,arm,total_tokens,hidden_passed,hidden_total,visible_passed,visible_total\nd,a,1,1,2,4,4\nd,a,1,2,2,3,4';
    const runs = S.readRuns(csv);
    assert.deepEqual(runs.map((r) => r.gaugePass), [true, false]);
  });

  test('an empty file gives no runs; a file without the needed columns is rejected', () => {
    assert.deepEqual(S.readRuns(''), []);
    assert.deepEqual(S.readRuns('stack,arm,total_tokens,hidden_passed,hidden_total\n'), []);
    assert.throws(() => S.readRuns('stack,run\nx,1'), /arm/);
  });
});

describe('cellsFromRuns', () => {
  test('counts correct runs per stratum for the two named arms', () => {
    const run = (arm, stack, slot, correct) => ({ arm, stack, slot, correct });
    const runs = [
      run('t', 'a', 'x', true), run('t', 'a', 'x', false), run('c', 'a', 'x', false), run('c', 'a', 'x', false),
      run('t', 'b', 'x', true), run('c', 'b', 'x', true), run('other', 'b', 'x', true),
    ];
    assert.deepEqual(S.cellsFromRuns(runs, 't', 'c'), [
      { stack: 'a', slot: 'x', xT: 1, nT: 2, xC: 0, nC: 2 },
      { stack: 'b', slot: 'x', xT: 1, nT: 1, xC: 1, nC: 1 },
    ]);
  });

  test('a missing slot becomes one stratum per stack', () => {
    const runs = [{ arm: 't', stack: 'a', slot: null, correct: true }, { arm: 'c', stack: 'a', slot: null, correct: false }];
    assert.deepEqual(S.cellsFromRuns(runs, 't', 'c'), [{ stack: 'a', slot: 'all', xT: 1, nT: 1, xC: 0, nC: 1 }]);
  });
});

describe('hypergeometric', () => {
  test('5 and 5 runs with 6 correct: 5, 50, 100, 50, 5 over 210, starting at 1', () => {
    const { low, pmf } = S.hypergeometric(5, 5, 6);
    assert.equal(low, 1);
    [5, 50, 100, 50, 5].forEach((count, i) => near(pmf[i], count / 210, 1e-15));
    assert.deepEqual(S.hypergeometric(3, 4, 0), { low: 0, pmf: [1] });
    assert.deepEqual(S.hypergeometric(3, 4, 7), { low: 3, pmf: [1] });
  });
});

describe('rng streams', () => {
  test('the same seed with another stream gives another sequence', () => {
    const a = S.rng(7, 0);
    const b = S.rng(7, 1);
    assert.notDeepEqual([a(), a(), a()], [b(), b(), b()]);
    const c = S.rng(7);
    const d = S.rng(7, 0);
    assert.deepEqual([c(), c()], [d(), d()]);
  });

  test('two uniforms in a row are not correlated', () => {
    const g = S.rng(2026);
    let sum = 0;
    const draws = 200000;
    for (let i = 0; i < draws; i++) sum += (g() - 0.5) * (g() - 0.5);
    near(sum / draws, 0, 4 / (12 * Math.sqrt(draws)), 'covariance of consecutive draws');
  });
});

describe('false support is at most alpha whatever the base rates (exact enumeration)', () => {
  // Probability of each verdict by listing every path of a small plan.
  function exact(plan, pT, pC) {
    const strata = pT.length;
    const rates = [...pT, ...pC];
    const out = { supported: 0, refuted: 0, undecidable: 0 };
    const walk = (lookIndex, counts, probability) => {
      const blocks = plan.looks[lookIndex];
      const add = blocks - (lookIndex === 0 ? 0 : plan.looks[lookIndex - 1]);
      const fillCell = (cell, current, weight) => {
        if (weight === 0) return;
        if (cell === rates.length) {
          const cells = pT.map((_, h) => ({ stack: 'only', slot: `slot${h}`, xT: current[h], nT: blocks, xC: current[strata + h], nC: blocks }));
          const result = S.decide(cells, plan, { index: lookIndex + 1 });
          if (result.verdict === 'continue') walk(lookIndex + 1, current, weight);
          else out[result.verdict] += weight;
          return;
        }
        for (let x = 0; x <= add; x++) {
          const next = current.slice();
          next[cell] += x;
          fillCell(cell + 1, next, weight * binomialPmf(add, x, rates[cell]));
        }
      };
      fillCell(0, counts, probability);
    };
    walk(0, new Array(rates.length).fill(0), 1);
    return out;
  }

  test('one stratum, one look of 8 runs per arm', () => {
    let largest = 0;
    for (let i = 1; i < 20; i++) {
      const p = i / 20;
      const r = exact({ dStar: 0.5, looks: [8], delta: 0.3 }, [p], [p]);
      near(r.supported + r.refuted + r.undecidable, 1, 1e-12);
      assert.ok(r.supported <= 0.025, `p = ${p}: ${r.supported}`);
      largest = Math.max(largest, r.supported);
    }
    assert.ok(largest > 0.005, `the test is not vacuous: ${largest}`);
  });

  test('two strata with different base rates, one look of 4 runs per cell', () => {
    for (const [a, b] of [[0.2, 0.8], [0.5, 0.5], [0.05, 0.6], [0.9, 0.95], [0.4, 0.7]]) {
      const r = exact({ dStar: 0.5, looks: [4], delta: 0.3 }, [a, b], [a, b]);
      assert.ok(r.supported <= 0.025, `${a}, ${b}: ${r.supported}`);
    }
  });

  test('one stratum, two looks at 4 and 8 runs per arm: the looks share the 2.5%', () => {
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const r = exact({ dStar: 0.5, looks: [4, 8], delta: 0.3 }, [p], [p]);
      assert.ok(r.supported <= 0.025, `p = ${p}: ${r.supported}`);
    }
  });

  test('a treatment that is worse is supported even less often', () => {
    const r = exact({ dStar: 0.5, looks: [8], delta: 0.3 }, [0.3], [0.6]);
    assert.ok(r.supported < 0.001);
    assert.ok(r.refuted > 0.5);
  });
});

describe('decide, further cases', () => {
  const cell = (xT, xC, n) => [{ stack: 'only', slot: 'all', xT, nT: n, xC, nC: n }];

  test('an early refutation labels the estimate as biased downward', () => {
    const plan = { dStar: 0.3, looks: [20, 40], delta: 0.1 };
    const r = S.decide(cell(2, 16, 20), plan, { index: 1 });
    assert.equal(r.verdict, 'refuted');
    assert.equal(r.statistics.earlyStop, true);
    assert.equal(r.statistics.estimateBias, 'downward');
  });

  test('a plan with a hash needs the hash of the look', () => {
    const plan = { dStar: 0.3, looks: [20], delta: 0.1, hash: 'abc' };
    const r = S.decide(cell(10, 10, 20), plan, { index: 1 });
    assert.equal(r.verdict, 'undecidable');
    assert.match(r.cause, /broken instrument.*hash/);
    assert.equal(r.statistics, null);
  });

  test('a p-value exactly at the threshold counts as support', () => {
    // 5 of 5 against 1 of 5: with 6 correct runs in all, P(5 in the treatment) = 5/210.
    const plan = { dStar: 0.5, looks: [5], delta: 0.3, alpha: 5 / 210 };
    const r = S.decide(cell(5, 1, 5), plan, { index: 1 });
    near(r.statistics.pS, 5 / 210, 1e-15);
    assert.equal(r.verdict, 'supported');
  });

  test('impossible counts are rejected', () => {
    assert.throws(() => S.decide(cell(6, 1, 5), { dStar: 0.5, looks: [5], delta: 0.3 }, { index: 1 }), RangeError);
  });
});

describe('summarizeCells and gaugeTables', () => {
  test('an arm without runs has no difference; the default interval is 95%', () => {
    const summary = S.summarizeCells([
      { stack: 'a', slot: 'x', xT: 3, nT: 5, xC: 1, nC: 5 },
      { stack: 'b', slot: 'x', xT: 2, nT: 4, xC: 0, nC: 0 },
    ]);
    assert.equal(summary.perStack[1].difference, null);
    assert.deepEqual(summary.perStack[1].interval, { lower: -1, upper: 1 });
    near(summary.perStack[0].interval.upper, S.newcombe(3, 5, 1, 5).upper, 1e-15);
    assert.deepEqual([summary.pooled.xT, summary.pooled.nT, summary.pooled.xC, summary.pooled.nC], [5, 9, 1, 5]);
    assert.equal(summary.pooled.intervalZ, Z95);
  });

  test('one gauge table per arm and slot', () => {
    const run = (arm, slot, gaugePass, correct) => ({ arm, slot, gaugePass, correct });
    const tables = S.gaugeTables([
      run('kit', 'cart', true, true), run('kit', 'cart', true, false), run('kit', 'ledger', false, false),
      run('bare', 'cart', true, false), run('bare', null, true, true),
    ]);
    assert.deepEqual(tables.map((t) => [t.arm, t.slot, t.a, t.b, t.c, t.d]), [
      ['kit', 'cart', 1, 1, 0, 0],
      ['kit', 'ledger', 0, 0, 0, 1],
      ['bare', 'cart', 0, 1, 0, 0],
      ['bare', 'all', 1, 0, 0, 0],
    ]);
    assert.equal(tables[0].falseConfidence.estimate, 0.5);
    assert.equal(tables[1].falseConfidence.estimable, false);
  });
});

describe('cost limits at another error level', () => {
  test('the error is split evenly between the mean and the rate', () => {
    const runs = Array.from({ length: 10 }, (_, i) => ({ tokens: 1000, correct: i < 4 }));
    const r = S.costPerCorrect(runs, 1, { error: 0.1 });
    const cp = S.clopperPearson(4, 10, 0.9);
    near(r.lower, 1000 / cp.upper, 1e-9);
    near(r.upper, 1000 / cp.lower, 1e-9);
    near(r.rate, 0.4, 1e-15);
    assert.deepEqual(r.meanLimits, { lower: 1000, upper: 1000 });
  });

  test('the ratio uses half the error in each arm', () => {
    const arm = (n, correct, tokens) => Array.from({ length: n }, (_, i) => ({ tokens, correct: i < correct }));
    const r = S.costRatio(arm(10, 8, 1000), arm(10, 4, 3000), 1);
    const t = S.clopperPearson(8, 10, 0.975);
    const c = S.clopperPearson(4, 10, 0.975);
    near(r.lower, (1000 / t.upper) / (3000 / c.lower), 1e-9);
    near(r.upper, (1000 / t.lower) / (3000 / c.upper), 1e-9);
  });
});

describe('edge cases with closed-form references: n of 1, unequal arms, empty strata', () => {
  const z2 = Z95 * Z95;

  test('n = 1: Wilson 1 of 1 starts at 1/(1+z^2), 0 of 1 ends at z^2/(1+z^2)', () => {
    const one = S.wilson(1, 1);
    near(one.lower, 1 / (1 + z2), 1e-12);
    assert.equal(one.upper, 1);
    const none = S.wilson(0, 1);
    assert.equal(none.lower, 0);
    near(none.upper, z2 / (1 + z2), 1e-12);
  });

  test('n = 1: Clopper-Pearson limits are alpha/2 and 1 - alpha/2 exactly', () => {
    near(S.clopperPearson(1, 1).lower, 0.025, 1e-9);
    near(S.clopperPearson(0, 1).upper, 0.975, 1e-9);
    assert.equal(S.clopperPearson(1, 1).upper, 1);
    assert.equal(S.clopperPearson(0, 1).lower, 0);
  });

  test('unequal arms: Newcombe for 3 of 3 against 0 of 10 by square-and-add of two closed-form limits', () => {
    const l1 = 3 / (3 + z2); // Wilson lower limit when every run passes
    const u2 = z2 / (10 + z2); // Wilson upper limit when no run passes
    const d = S.newcombe(3, 3, 0, 10);
    near(d.estimate, 1, 1e-12);
    near(d.lower, 1 - Math.sqrt((1 - l1) ** 2 + u2 ** 2), 1e-9);
    assert.equal(d.upper, 1);
  });

  test('one run per arm: 1 of 1 against 0 of 1 has Newcombe lower limit 1 - sqrt(2) (1-l)^2', () => {
    const l = 1 / (1 + z2);
    const u = z2 / (1 + z2);
    near(S.newcombe(1, 1, 0, 1).lower, 1 - Math.sqrt((1 - l) ** 2 + u ** 2), 1e-9);
  });

  test('unequal arms in Fisher: 3 of 3 against 2 of 7 is 1/12 by counting (10 of the 120 ways to place 5 passes among 3)', () => {
    // Margins: 5 passes among 10 runs, 3 in arm T. P(T = 3) = C(5,3) / C(10,3) = 10 / 120.
    const r = S.exactCmh([{ xT: 3, nT: 3, xC: 2, nC: 7 }]);
    near(r.pUpper, 10 / 120, 1e-12);
    near(r.pTwoSided, 20 / 120, 1e-12); // the other tail with probability <= 10/120: T = 0 has C(5,0)C(5,3)/120 = 10/120
  });

  test('an empty stratum is ignored and one run in a stratum carries no information', () => {
    const base = S.exactCmh([{ xT: 3, nT: 3, xC: 2, nC: 7 }]);
    const withEmpty = S.exactCmh([{ xT: 3, nT: 3, xC: 2, nC: 7 }, { xT: 0, nT: 0, xC: 0, nC: 0 }]);
    near(withEmpty.pUpper, base.pUpper, 1e-12);
    // A stratum of one run per arm: 1 of 1 against 0 of 1 has margins (1 pass, 1 in T): P(T=1) = 1/2.
    const single = S.exactCmh([{ xT: 1, nT: 1, xC: 0, nC: 1 }]);
    near(single.pUpper, 0.5, 1e-12);
    // Adding it to the previous stratum convolves a fair coin: P(sum >= 4) = P(3 and 1) = 10/120 * 1/2.
    const both = S.exactCmh([{ xT: 3, nT: 3, xC: 2, nC: 7 }, { xT: 1, nT: 1, xC: 0, nC: 1 }]);
    near(both.pUpper, 10 / 120 / 2, 1e-12);
  });

  test('every run passes in both arms, or none: no information, p = 1', () => {
    near(S.exactCmh([{ xT: 5, nT: 5, xC: 5, nC: 5 }]).pUpper, 1, 1e-12);
    near(S.exactCmh([{ xT: 0, nT: 5, xC: 0, nC: 5 }]).pUpper, 1, 1e-12);
  });

  test('zero successes and all successes: the one-sided bound is the closed form 1 - 0.05^(1/n)', () => {
    for (const n of [1, 2, 10, 34, 100]) near(S.zeroSuccessBound(n), 1 - 0.05 ** (1 / n), 1e-12);
  });
});

// ---- per-attempt results: fixtures built by hand, every number checked by hand ----

const readFixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('readRuns, first attempt and judge columns (A1)', () => {
  const header = 'stack,arm,slot,total_tokens,hidden_passed,hidden_total,first_correct,first_correct_attempt,judge_agrees';

  test('reads first_correct, first_correct_attempt and judge_agrees; an empty field is null', () => {
    const csv = [
      header,
      'django,kit-bare.cart,cart,10,21,21,1,1,1',
      'django,kit-bare.cart,cart,10,20,21,0,,0',
      'django,kit-bare.cart,cart,10,20,21,,,',
    ].join('\n');
    const runs = S.readRuns(csv);
    assert.deepEqual(runs.map((r) => [r.firstCorrect, r.firstCorrectAttempt, r.judgeAgrees]), [[true, 1, true], [false, null, false], [null, null, null]]);
    assert.deepEqual(runs.map((r) => r.correct), [true, false, false]);
  });

  test('a file without the columns gives null, and the other fields are unchanged', () => {
    const runs = S.readRuns('stack,arm,total_tokens,hidden_passed,hidden_total\ndjango,bare,5,21,21');
    assert.deepEqual([runs[0].firstCorrect, runs[0].firstCorrectAttempt, runs[0].judgeAgrees], [null, null, null]);
    assert.equal(runs[0].correct, true);
    assert.equal(runs[0].arm, 'bare');
  });

  test('the runs fixture reads as written', () => {
    const runs = S.readRuns(readFixture('runs-attempts-synthetic.csv'));
    assert.equal(runs.length, 12);
    assert.deepEqual(runs.slice(0, 3).map((r) => [r.arm, r.slot, r.firstCorrect, r.firstCorrectAttempt]), [['kit-bare', 'cart', false, 3], ['kit-bare', 'cart', false, null], ['kit-bare', 'cart', true, 1]]);
    assert.ok(runs.every((r) => r.judgeAgrees === true));
  });
});

describe('readAttempts (A2)', () => {
  test('reads one object per attempt and normalizes a kit arm exactly as readRuns does', () => {
    const attempts = S.readAttempts(readFixture('attempts-synthetic.csv'));
    assert.equal(attempts.length, 19);
    assert.deepEqual(attempts[0], {
      stack: 'nextjs', arm: 'kit-bare', slot: 'cart', run: 1, attempt: 1, built: true, gaugePass: false, judgeCorrect: false, tokensIn: 100, tokensOut: 50,
    });
    assert.equal(attempts[2].gaugePass, true);
    assert.equal(attempts[2].judgeCorrect, true);
    // The same names as the runs file gives for the same rows.
    const runArms = new Set(S.readRuns(readFixture('runs-attempts-synthetic.csv')).map((r) => `${r.arm}/${r.slot}`));
    assert.deepEqual(new Set(attempts.map((a) => `${a.arm}/${a.slot}`)), runArms);
  });

  test('a full-task arm has an empty slot, kept as null, and its name is untouched; old results have no judge result', () => {
    const csv = [
      'stack,arm,slot,run,attempt,built,visible_passed,visible_total,gauge_pass,judge_correct,prompt_tokens,completion_tokens',
      'django,bare,,1,1,0,0,0,0,,10,5',
      'django,v1.cart,,1,1,1,3,3,1,1,10,5',
    ].join('\r\n');
    const attempts = S.readAttempts(csv);
    assert.deepEqual(attempts.map((a) => [a.arm, a.slot, a.built, a.gaugePass, a.judgeCorrect]), [['bare', null, false, false, null], ['v1.cart', null, true, true, true]]);
  });

  test('missing required columns are an error that names them; an empty file gives no attempts', () => {
    assert.throws(() => S.readAttempts('stack,arm,run\nd,a,1'), /attempts\.csv is missing the column\(s\): attempt, gauge_pass, judge_correct/);
    assert.deepEqual(S.readAttempts(''), []);
  });
});

describe('attemptGaugeTable (A3)', () => {
  const attempts = S.readAttempts(readFixture('attempts-synthetic.csv'));
  const ofArm = (arm) => attempts.filter((a) => a.arm === arm);
  const opts = { seed: 7, resamples: 2000 };
  const attempt = (run, g, j, i = 1) => ({ stack: 's', arm: 'x', slot: null, run, attempt: i, built: true, gaugePass: g === 1, judgeCorrect: j === 1, tokensIn: 1, tokensOut: 1 });

  test('kit-bare: the four cells and three rates, by hand', () => {
    // Pairs (gauge, judge) of the 11 kit-bare attempts, cart then ledger:
    //   cart run 1 (0,0) (0,0) (1,1); run 2 (1,0); run 3 (1,1); ledger run 1 (0,0) x3; run 2 (0,1) (1,1); run 3 (1,1).
    //   a = gauge passes, judge correct = 4 (cart 1, cart 3, ledger 2 last, ledger 3). b = gauge passes, judge incorrect = 1 (cart 2).
    //   c = gauge fails, judge correct = 1 (ledger 2 first). d = both fail = 2 + 3 = 5.
    //   Sensitivity d/(b+d) = 5/6; specificity a/(a+c) = 4/5; false confidence b/(a+b) = 1/5.
    const t = S.attemptGaugeTable(ofArm('kit-bare'), opts);
    assert.deepEqual([t.a, t.b, t.c, t.d, t.n, t.unjudged], [4, 1, 1, 5, 11, 0]);
    assert.deepEqual([t.attempts, t.runs], [11, 6]);
    assert.deepEqual([t.sensitivity.x, t.sensitivity.n], [5, 6]);
    assert.deepEqual([t.specificity.x, t.specificity.n], [4, 5]);
    assert.deepEqual([t.falseConfidence.x, t.falseConfidence.n], [1, 5]);
    near(t.sensitivity.estimate, 5 / 6, 1e-12);
    near(t.specificity.estimate, 4 / 5, 1e-12);
    near(t.falseConfidence.estimate, 1 / 5, 1e-12);
    for (const r of [t.sensitivity, t.specificity, t.falseConfidence]) {
      assert.equal(r.estimable, true);
      assert.ok(r.lower >= 0 && r.upper <= 1 && r.lower <= r.upper, `${r.lower} ${r.upper}`);
    }
  });

  test('kit-tests: a perfect specificity, and a rate that is not estimable on a subset', () => {
    // kit-tests: a = 4 (cart x3, ledger 1), b = 1 (ledger 3), c = 0, d = 3 (ledger 2, three attempts).
    const t = S.attemptGaugeTable(ofArm('kit-tests'), opts);
    assert.deepEqual([t.a, t.b, t.c, t.d, t.n], [4, 1, 0, 3, 8]);
    near(t.sensitivity.estimate, 3 / 4, 1e-12);
    near(t.specificity.estimate, 1, 1e-12);
    // Only ledger run 2 of kit-tests: three attempts (0,0): d = 3 and a = b = c = 0,
    // so specificity a/(a+c) and false confidence b/(a+b) have an empty denominator.
    const only = S.attemptGaugeTable(ofArm('kit-tests').filter((a) => a.slot === 'ledger' && a.run === 2), opts);
    assert.deepEqual([only.a, only.b, only.c, only.d], [0, 0, 0, 3]);
    assert.equal(only.sensitivity.estimable, true);
    for (const r of [only.specificity, only.falseConfidence]) {
      assert.equal(r.estimable, false);
      assert.deepEqual([r.estimate, r.lower, r.upper], [null, null, null]);
    }
  });

  test('attempts with no judge result are left out and counted', () => {
    const bare = ofArm('kit-bare');
    const mixed = [...bare, { ...bare[0], run: 99, judgeCorrect: null }, { ...bare[1], run: 99, judgeCorrect: null }];
    const t = S.attemptGaugeTable(mixed, opts);
    assert.equal(t.unjudged, 2);
    assert.deepEqual([t.a, t.b, t.c, t.d, t.n], [4, 1, 1, 5, 11]);
    assert.equal(t.runs, 6);
  });

  test('an empty set gives an empty table with nothing estimable', () => {
    const t = S.attemptGaugeTable([], opts);
    assert.deepEqual([t.a, t.b, t.c, t.d, t.n, t.runs, t.unjudged], [0, 0, 0, 0, 0, 0, 0]);
    assert.equal(t.sensitivity.estimable, false);
  });

  test('the same seed gives the same output, and the limits are the order statistics of the repository generator', () => {
    const first = S.attemptGaugeTable(ofArm('kit-bare'), { seed: 11, resamples: 3000 });
    const second = S.attemptGaugeTable(ofArm('kit-bare'), { seed: 11, resamples: 3000 });
    assert.deepEqual(first, second);
    // Independent replay: draw 6 runs per resample with S.rng (one draw per run), keep the replicates whose denominator is positive,
    // take the k-th smallest and k-th largest with k = floor(0.025 (replicates + 1)).
    const byRun = new Map();
    for (const a of ofArm('kit-bare')) {
      const key = `${a.slot}/${a.run}`;
      if (!byRun.has(key)) byRun.set(key, { a: 0, b: 0, c: 0, d: 0 });
      byRun.get(key)[a.gaugePass ? (a.judgeCorrect ? 'a' : 'b') : (a.judgeCorrect ? 'c' : 'd')]++;
    }
    const clusters = [...byRun.values()];
    const next = S.rng(11);
    const fc = [];
    for (let i = 0; i < 3000; i++) {
      const s = { a: 0, b: 0 };
      for (let j = 0; j < clusters.length; j++) {
        const c = clusters[Math.floor(next() * clusters.length)];
        s.a += c.a;
        s.b += c.b;
      }
      if (s.a + s.b > 0) fc.push(s.b / (s.a + s.b));
    }
    fc.sort((x, y) => x - y);
    const k = Math.floor(0.025 * (fc.length + 1));
    near(first.falseConfidence.lower, fc[k - 1], 1e-12, 'false confidence lower');
    near(first.falseConfidence.upper, fc[fc.length - k], 1e-12, 'false confidence upper');
    assert.equal(first.falseConfidence.skipped, 3000 - fc.length);
  });

  test('another seed moves the limits of a table with spread', () => {
    const wide = [];
    for (let run = 1; run <= 12; run++) {
      const pairs = run % 3 === 0 ? [[1, 0]] : run % 3 === 1 ? [[0, 0], [1, 1]] : [[1, 1]];
      pairs.forEach(([g, j], i) => wide.push(attempt(run, g, j, i + 1)));
    }
    const one = S.attemptGaugeTable(wide, { seed: 1, resamples: 400 });
    const two = S.attemptGaugeTable(wide, { seed: 2, resamples: 400 });
    assert.notDeepEqual([one.falseConfidence.lower, one.falseConfidence.upper, one.sensitivity.lower], [two.falseConfidence.lower, two.falseConfidence.upper, two.sensitivity.lower]);
  });

  test('the bootstrap resamples whole runs: two runs of 20 attempts give the widest interval, not the one of 40 independent attempts', () => {
    // Run 1: 20 attempts (1,1), cell a. Run 2: 20 attempts (1,0), cell b. False confidence is 20/40 = 0.5.
    // By whole runs a resample holds run 1 twice (rate 0), both runs (0.5) or run 2 twice (1), with probabilities 1/4, 1/2, 1/4,
    // so the 2.5% and 97.5% limits are 0 and 1. Resampling the 40 attempts one by one would give roughly 0.35 to 0.65.
    const make = (run, j) => Array.from({ length: 20 }, (_, i) => attempt(run, 1, j, i + 1));
    const t = S.attemptGaugeTable([...make(1, 1), ...make(2, 0)], { seed: 3, resamples: 4000 });
    assert.equal(t.runs, 2);
    near(t.falseConfidence.estimate, 0.5, 1e-12);
    assert.equal(t.falseConfidence.lower, 0);
    assert.equal(t.falseConfidence.upper, 1);
  });

  test('a replicate with an empty denominator is skipped and counted, not turned into a zero', () => {
    // Run 1: 50 attempts (0,0), cell d. Run 2: 50 attempts (1,1), cell a. Both draws run 1 (1/4 of resamples) leave specificity and false
    // confidence with an empty denominator; both draws run 2 (1/4) leave sensitivity empty: about 2,500 of 10,000 skipped per rate.
    // Resampling single attempts would skip none.
    const make = (run, g, j) => Array.from({ length: 50 }, (_, i) => attempt(run, g, j, i + 1));
    const t = S.attemptGaugeTable([...make(1, 0, 0), ...make(2, 1, 1)], { seed: 5, resamples: 10000 });
    for (const r of [t.sensitivity, t.specificity, t.falseConfidence]) {
      assert.ok(r.skipped > 2300 && r.skipped < 2700, `skipped ${r.skipped}`);
    }
    // The values that remain are all 1 (sensitivity, specificity) or all 0 (false confidence).
    assert.deepEqual([t.sensitivity.lower, t.sensitivity.upper], [1, 1]);
    assert.deepEqual([t.specificity.lower, t.specificity.upper], [1, 1]);
    assert.deepEqual([t.falseConfidence.lower, t.falseConfidence.upper], [0, 0]);
  });

  test('attemptGaugeTables: one table per arm over all its slots, then one per slot', () => {
    const tables = S.attemptGaugeTables(attempts, opts);
    assert.deepEqual(tables.map((t) => [t.arm, t.slot]), [['kit-bare', 'all'], ['kit-bare', 'cart'], ['kit-bare', 'ledger'], ['kit-tests', 'all'], ['kit-tests', 'cart'], ['kit-tests', 'ledger']]);
    // kit-bare cart: (0,0) (0,0) (1,1) (1,0) (1,1): a = 2, b = 1, c = 0, d = 2.
    const cart = tables.find((t) => t.arm === 'kit-bare' && t.slot === 'cart');
    assert.deepEqual([cart.a, cart.b, cart.c, cart.d], [2, 1, 0, 2]);
    const none = S.attemptGaugeTables([attempt(1, 1, 1)], opts);
    assert.deepEqual(none.map((t) => [t.arm, t.slot]), [['x', 'all']]);
  });
});

describe('firstAttemptCells (A4)', () => {
  const runs = S.readRuns(readFixture('runs-attempts-synthetic.csv'));

  test('counts the runs correct at the first attempt, per stack and slot', () => {
    // First attempt, kit-tests: cart 3 of 3, ledger 1 of 3. kit-bare: cart 1 of 3 (run 3), ledger 2 of 3 (runs 2 and 3).
    assert.deepEqual(S.firstAttemptCells(runs, 'kit-tests', 'kit-bare'), [
      { stack: 'nextjs', slot: 'cart', xT: 3, nT: 3, xC: 1, nC: 3 },
      { stack: 'nextjs', slot: 'ledger', xT: 1, nT: 3, xC: 2, nC: 3 },
    ]);
    // The final results of the same runs (hidden suite): kit-bare is correct in cart runs 1 and 3 and ledger runs 2 and 3.
    assert.deepEqual(S.cellsFromRuns(runs, 'kit-tests', 'kit-bare'), [
      { stack: 'nextjs', slot: 'cart', xT: 3, nT: 3, xC: 2, nC: 3 },
      { stack: 'nextjs', slot: 'ledger', xT: 1, nT: 3, xC: 2, nC: 3 },
    ]);
  });

  test('a run with no first-attempt result makes the whole result not available, never zeros', () => {
    const old = S.readRuns('stack,arm,total_tokens,hidden_passed,hidden_total\nd,t,1,21,21\nd,c,1,0,21');
    assert.equal(S.firstAttemptCells(old, 't', 'c'), null);
    const partial = runs.map((r, i) => (i === 0 ? { ...r, firstCorrect: null } : r));
    assert.equal(S.firstAttemptCells(partial, 'kit-tests', 'kit-bare'), null);
    // Runs of other arms with no result do not matter.
    const otherArm = [...runs, { arm: 'bare', stack: 'nextjs', slot: null, correct: false, firstCorrect: null }];
    assert.notEqual(S.firstAttemptCells(otherArm, 'kit-tests', 'kit-bare'), null);
  });
});

describe('run classes and the outcome "the decision is right" (D4)', () => {
  const runs = S.readRuns(readFixture('runs-classes-synthetic.csv'));
  const only = (arm) => runs.filter((r) => r.arm === arm);

  test('runClass: the four classes, and null without a gauge result', () => {
    assert.equal(S.runClass({ gaugePass: true, correct: true }), 'delivered_correct');
    assert.equal(S.runClass({ gaugePass: false, correct: false }), 'known_failure');
    assert.equal(S.runClass({ gaugePass: true, correct: false }), 'silent_defect');
    assert.equal(S.runClass({ gaugePass: false, correct: true }), 'false_rejection');
    assert.equal(S.runClass({ gaugePass: null, correct: true }), null);
    assert.equal(S.runClass({ gaugePass: null, correct: false }), null);
  });

  test('classCounts: all four classes present, counted by hand from the fixture', () => {
    // kit-tests: cart DC, DC, KF, FR; ledger DC, DC, SD, KF -> DC 4, KF 2, SD 1, FR 1; right = 4 + 2 = 6 of 8.
    // kit-bare:  cart DC, SD, SD, KF; ledger SD, SD, DC, FR -> DC 2, KF 1, SD 4, FR 1; right = 2 + 1 = 3 of 8.
    const tests = S.classCounts(only('kit-tests'));
    assert.deepEqual([tests.delivered_correct, tests.known_failure, tests.silent_defect, tests.false_rejection, tests.unclassified], [4, 2, 1, 1, 0]);
    assert.deepEqual([tests.n, tests.classified, tests.right], [8, 8, 6]);
    assert.equal(tests.rate.estimate, 0.75);
    assert.deepEqual(tests.rate.wilson, S.wilson(6, 8));
    const bare = S.classCounts(only('kit-bare'));
    assert.deepEqual([bare.delivered_correct, bare.known_failure, bare.silent_defect, bare.false_rejection, bare.unclassified], [2, 1, 4, 1, 0]);
    assert.deepEqual([bare.n, bare.classified, bare.right], [8, 8, 3]);
    assert.deepEqual(bare.rate.wilson, S.wilson(3, 8));
  });

  test('classCounts: a run with no gauge result is unclassified, never a class and never in the rate', () => {
    const withGap = [...only('kit-tests'), { arm: 'kit-tests', stack: 'nextjs', slot: 'cart', correct: true, gaugePass: null }];
    const counts = S.classCounts(withGap);
    assert.equal(counts.unclassified, 1);
    assert.deepEqual([counts.n, counts.classified, counts.right], [9, 8, 6]);
    const none = S.classCounts([{ arm: 'a', correct: true, gaugePass: null }]);
    assert.equal(none.rate.estimable, false);
  });

  test('decisionRightCells: the strata of the outcome, different from the correct counts', () => {
    // Right decisions (DC or KF), kit-tests: cart 3 of 4 (the false rejection is wrong), ledger 3 of 4 (the silent defect is wrong).
    // kit-bare: cart 2 of 4 (DC and KF), ledger 1 of 4 (only the DC).
    assert.deepEqual(S.decisionRightCells(runs, 'kit-tests', 'kit-bare'), [
      { stack: 'nextjs', slot: 'cart', xT: 3, nT: 4, xC: 2, nC: 4 },
      { stack: 'nextjs', slot: 'ledger', xT: 3, nT: 4, xC: 1, nC: 4 },
    ]);
    // Correct runs, same runs: kit-tests cart 3 (DC, DC, FR), ledger 2; kit-bare cart 1, ledger 2 (DC, FR).
    assert.deepEqual(S.cellsFromRuns(runs, 'kit-tests', 'kit-bare'), [
      { stack: 'nextjs', slot: 'cart', xT: 3, nT: 4, xC: 1, nC: 4 },
      { stack: 'nextjs', slot: 'ledger', xT: 2, nT: 4, xC: 2, nC: 4 },
    ]);
  });

  test('decisionRightCells: null when a run of either compared arm has no gauge result; other arms do not matter', () => {
    const partial = runs.map((r, i) => (i === 0 ? { ...r, gaugePass: null } : r));
    assert.equal(S.decisionRightCells(partial, 'kit-tests', 'kit-bare'), null);
    const otherArm = [...runs, { arm: 'bare', stack: 'nextjs', slot: null, correct: false, gaugePass: null }];
    assert.notEqual(S.decisionRightCells(otherArm, 'kit-tests', 'kit-bare'), null);
  });
});
