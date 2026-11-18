// Statistics for OpenFabric experiments: pure functions, plain Node 22, no dependencies.
// The plain-English explanation and the formulas are in README.md, next to this file.
//
// Conventions used everywhere:
//   T is the treatment arm and C the control arm.
//   A stratum is one stack x slot pair, written { stack, slot, xT, nT, xC, nC }:
//   x is the number of correct runs out of n.
//   A function that cannot estimate something returns null for it. Nothing is divided by zero.

export const Z95 = 1.959963984540054;
const SQRT_2PI = Math.sqrt(2 * Math.PI);

// ---------------------------------------------------------------- random numbers

// Seeded generator behind every simulation and bootstrap: xoshiro128**, seeded with
// splitmix32. `stream` gives independent sequences for the same seed.
export function rng(seed = 1, stream = 0) {
  let state = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul((stream | 0) + 0x7f4a7c15, 0x85ebca6b)) | 0;
  const mix = () => {
    state = (state + 0x9e3779b9) | 0;
    let t = state ^ (state >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
  let a = mix();
  let b = mix();
  let c = mix();
  let d = mix();
  if ((a | b | c | d) === 0) a = 1;
  return function next() {
    let r = Math.imul(b, 5);
    r = Math.imul((r << 7) | (r >>> 25), 9);
    const t = b << 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = (d << 11) | (d >>> 21);
    return (r >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- normal distribution

// P(Z > z) for z >= 0.
function normalUpperTail(z) {
  const density = Math.exp(-0.5 * z * z) / SQRT_2PI;
  if (z < 2.5) {
    // Phi(z) - 1/2 = density * sum over k of z^(2k+1) / (1*3*...*(2k+1)); every term is positive.
    let term = z;
    let sum = z;
    for (let k = 1; k < 300; k++) {
      term *= (z * z) / (2 * k + 1);
      sum += term;
      if (term < sum * 1e-18) break;
    }
    return 0.5 - density * sum;
  }
  // Mills ratio as a continued fraction: density / (z + 1/(z + 2/(z + 3/(z + ...)))).
  let t = z;
  for (let k = 160; k >= 1; k--) t = z + k / t;
  return density / t;
}

export function normalCdf(x) {
  if (Number.isNaN(x)) return NaN;
  return x <= 0 ? normalUpperTail(-x) : 1 - normalUpperTail(x);
}

// Acklam's rational approximation; only a starting point, refined below.
function normalQuantileStart(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function normalQuantile(p) {
  if (!(p > 0 && p < 1)) throw new RangeError(`normalQuantile needs 0 < p < 1, got ${p}`);
  if (p > 0.5) return -normalQuantile(1 - p);
  let x = normalQuantileStart(p);
  for (let i = 0; i < 4; i++) {
    // Halley step on the lower tail, where the cdf keeps its relative precision.
    const error = normalCdf(x) - p;
    const u = error * SQRT_2PI * Math.exp(0.5 * x * x);
    x -= u / (1 + 0.5 * x * u);
  }
  return x;
}

// ---------------------------------------------------------------- beta distribution

// log Gamma(x) for x > 0: shift the argument above 15, then Stirling's series.
export function logGamma(x) {
  if (!(x > 0)) throw new RangeError(`logGamma needs x > 0, got ${x}`);
  let y = x;
  let shift = 0;
  while (y < 15) {
    shift += Math.log(y);
    y += 1;
  }
  const inv = 1 / y;
  const inv2 = inv * inv;
  const series = inv * (1 / 12 - inv2 * (1 / 360 - inv2 * (1 / 1260 - inv2 * (1 / 1680 - inv2 * (1 / 1188 - inv2 * (691 / 360360 - inv2 / 156))))));
  return (y - 0.5) * Math.log(y) - y + 0.5 * Math.log(2 * Math.PI) + series - shift;
}

function betaContinuedFraction(x, a, b) {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 20000; m++) {
    const m2 = 2 * m;
    let term = (m * (b - m) * x) / ((a - 1 + m2) * (a + m2));
    d = 1 + term * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + term / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    term = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + 1 + m2));
    d = 1 + term * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + term / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const step = d * c;
    h *= step;
    if (Math.abs(step - 1) < 1e-16) break;
  }
  return h;
}

// Regularized incomplete beta function I_x(a, b) = P(Beta(a, b) <= x).
export function betaCdf(x, a, b) {
  if (!(a > 0 && b > 0)) throw new RangeError(`betaCdf needs a > 0 and b > 0, got ${a}, ${b}`);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  if (x < (a + 1) / (a + b + 2)) return Math.min(1, (front * betaContinuedFraction(x, a, b)) / a);
  return Math.max(0, 1 - (front * betaContinuedFraction(1 - x, b, a)) / b);
}

export function betaQuantile(p, a, b) {
  if (!(p >= 0 && p <= 1)) throw new RangeError(`betaQuantile needs 0 <= p <= 1, got ${p}`);
  if (p === 0) return 0;
  if (p === 1) return 1;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 70; i++) {
    const middle = 0.5 * (low + high);
    if (betaCdf(middle, a, b) < p) low = middle;
    else high = middle;
  }
  return 0.5 * (low + high);
}

// ---------------------------------------------------------------- one proportion

function checkCount(x, n, label = 'count') {
  if (!Number.isInteger(x) || !Number.isInteger(n) || x < 0 || n < 0 || x > n) {
    throw new RangeError(`${label}: need integers with 0 <= x <= n, got x=${x}, n=${n}`);
  }
}

// Wilson score interval. With z = 1.96 it is the 95% interval method.md asks for.
export function wilson(x, n, z = Z95) {
  checkCount(x, n, 'wilson');
  if (n === 0) return { estimate: null, lower: 0, upper: 1 };
  const z2 = z * z;
  const centre = (x + z2 / 2) / (n + z2);
  const half = (z * Math.sqrt((x * (n - x)) / n + z2 / 4)) / (n + z2);
  return {
    estimate: x / n,
    lower: x === 0 ? 0 : Math.max(0, centre - half),
    upper: x === n ? 1 : Math.min(1, centre + half),
  };
}

// Clopper-Pearson interval: exact, never below its level. Each limit is one-sided at (1 + level) / 2.
export function clopperPearson(x, n, level = 0.95) {
  checkCount(x, n, 'clopperPearson');
  if (!(level > 0 && level < 1)) throw new RangeError(`clopperPearson needs 0 < level < 1, got ${level}`);
  if (n === 0) return { estimate: null, lower: 0, upper: 1 };
  const tail = (1 - level) / 2;
  let lower;
  let upper;
  if (x === 0) lower = 0;
  else if (x === n) lower = tail ** (1 / n);
  else lower = betaQuantile(tail, x, n - x + 1);
  if (x === n) upper = 1;
  else if (x === 0) upper = 1 - tail ** (1 / n);
  else upper = betaQuantile(1 - tail, x + 1, n - x);
  return { estimate: x / n, lower, upper };
}

// With 0 correct runs out of n, the rate is at most this, at the given one-sided level.
export function zeroSuccessBound(n, level = 0.95) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`zeroSuccessBound needs a whole number of runs, got ${n}`);
  if (n === 0) return 1;
  return 1 - (1 - level) ** (1 / n);
}

// ---------------------------------------------------------------- two proportions

// Newcombe's interval for p1 - p2 (square and add the Wilson limits).
export function newcombe(x1, n1, x2, n2, z = Z95) {
  checkCount(x1, n1, 'newcombe arm 1');
  checkCount(x2, n2, 'newcombe arm 2');
  if (n1 === 0 || n2 === 0) return { estimate: null, lower: -1, upper: 1 };
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const w1 = wilson(x1, n1, z);
  const w2 = wilson(x2, n2, z);
  const estimate = p1 - p2;
  return {
    estimate,
    lower: Math.max(-1, estimate - Math.hypot(p1 - w1.lower, w2.upper - p2)),
    upper: Math.min(1, estimate + Math.hypot(w1.upper - p1, p2 - w2.lower)),
  };
}

// Distribution of the treatment successes in one stratum once both margins are fixed.
const hypergeometricCache = new Map();
export function hypergeometric(nT, nC, r) {
  const key = `${nT},${nC},${r}`;
  const cached = hypergeometricCache.get(key);
  if (cached) return cached;
  const low = Math.max(0, r - nC);
  const high = Math.min(nT, r);
  const pmf = new Array(high - low + 1).fill(0);
  const mode = Math.min(high, Math.max(low, Math.floor(((r + 1) * (nT + 1)) / (nT + nC + 2))));
  pmf[mode - low] = 1;
  for (let x = mode; x < high; x++) pmf[x + 1 - low] = (pmf[x - low] * (nT - x) * (r - x)) / ((x + 1) * (nC - r + x + 1));
  for (let x = mode; x > low; x--) pmf[x - 1 - low] = (pmf[x - low] * x * (nC - r + x)) / ((nT - x + 1) * (r - x + 1));
  let total = 0;
  for (const v of pmf) total += v;
  for (let i = 0; i < pmf.length; i++) pmf[i] /= total;
  const result = { low, pmf };
  if (hypergeometricCache.size < 20000) hypergeometricCache.set(key, result);
  return result;
}

// Exact conditional Cochran-Mantel-Haenszel test. The statistic is the number of correct
// treatment runs summed over strata; its null distribution is the convolution of one
// hypergeometric per stratum. With one stratum this is Fisher's exact test.
// A stratum with an empty arm, or with no correct run or no failed run, carries no information.
export function exactCmh(strata) {
  let distribution = [1];
  let offset = 0;
  let observed = 0;
  let expected = 0;
  let informativeStrata = 0;
  for (const { xT, nT, xC, nC } of strata) {
    checkCount(xT, nT, 'exactCmh treatment');
    checkCount(xC, nC, 'exactCmh control');
    const r = xT + xC;
    if (nT === 0 || nC === 0 || r === 0 || r === nT + nC) continue;
    informativeStrata++;
    observed += xT;
    expected += (nT * r) / (nT + nC);
    const { low, pmf } = hypergeometric(nT, nC, r);
    offset += low;
    const next = new Array(distribution.length + pmf.length - 1).fill(0);
    for (let i = 0; i < distribution.length; i++) {
      const weight = distribution[i];
      if (weight === 0) continue;
      for (let j = 0; j < pmf.length; j++) next[i + j] += weight * pmf[j];
    }
    distribution = next;
  }
  if (informativeStrata === 0) return { pUpper: 1, pLower: 1, pTwoSided: 1, observed: 0, expected: 0, informativeStrata: 0 };
  const at = observed - offset;
  let pUpper = 0;
  for (let i = distribution.length - 1; i >= at; i--) pUpper += distribution[i];
  let pLower = 0;
  for (let i = 0; i <= at; i++) pLower += distribution[i];
  // Two-sided: every outcome that is no more likely than the observed one.
  const limit = distribution[at] * (1 + 1e-9);
  let pTwoSided = 0;
  for (const v of distribution) if (v <= limit) pTwoSided += v;
  return {
    pUpper: Math.min(1, pUpper),
    pLower: Math.min(1, pLower),
    pTwoSided: Math.min(1, pTwoSided),
    observed,
    expected,
    informativeStrata,
  };
}

export function fisherExact(xT, nT, xC, nC) {
  return exactCmh([{ xT, nT, xC, nC }]);
}

// ---------------------------------------------------------------- fixed-sample planning

// Runs per arm to detect p1 against p2 (normal approximation with the pooled null variance).
export function sampleSizeNormal(p1, p2, { alpha = 0.05, power = 0.8 } = {}) {
  if (p1 === p2) return Infinity;
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zPower = normalQuantile(power);
  const mean = (p1 + p2) / 2;
  const root = zAlpha * Math.sqrt(2 * mean * (1 - mean)) + zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((root * root) / ((p1 - p2) * (p1 - p2)) - 1e-9);
}

function binomialPmf(n, p) {
  const pmf = new Array(n + 1).fill(0);
  if (p <= 0) {
    pmf[0] = 1;
    return pmf;
  }
  if (p >= 1) {
    pmf[n] = 1;
    return pmf;
  }
  const mode = Math.min(n, Math.floor((n + 1) * p));
  pmf[mode] = 1;
  const odds = p / (1 - p);
  for (let k = mode; k < n; k++) pmf[k + 1] = (pmf[k] * (n - k) * odds) / (k + 1);
  for (let k = mode; k > 0; k--) pmf[k - 1] = (pmf[k] * k) / ((n - k + 1) * odds);
  let total = 0;
  for (const v of pmf) total += v;
  for (let k = 0; k <= n; k++) pmf[k] /= total;
  return pmf;
}

// Exact power of the two-sided Fisher test with n runs per arm: the probability, under the
// two true rates, of a table whose p-value is at most alpha.
export function fisherPower(n, p1, p2, alpha = 0.05) {
  const first = binomialPmf(n, p1);
  const second = binomialPmf(n, p2);
  let power = 0;
  for (let r = 0; r <= 2 * n; r++) {
    const { low, pmf } = hypergeometric(n, n, r);
    for (let i = 0; i < pmf.length; i++) {
      const limit = pmf[i] * (1 + 1e-9);
      let p = 0;
      for (const v of pmf) if (v <= limit) p += v;
      if (Math.min(1, p) <= alpha) power += first[low + i] * second[r - low - i];
    }
  }
  return power;
}

// Smallest n per arm at which the exact Fisher test reaches the requested power.
// The power of an exact test is not monotone in n: it can fall back below the target just
// after reaching it. `stable` asks for that many consecutive sizes at or above the target
// and returns the first of them; the default, 1, is the first size that reaches it.
export function sampleSizeFisher(p1, p2, { alpha = 0.05, power = 0.8, stable = 1, max = 2000 } = {}) {
  if (p1 === p2) return Infinity;
  let candidate = null;
  for (let n = 2; n <= max; n++) {
    if (fisherPower(n, p1, p2, alpha) >= power) {
      if (candidate === null) candidate = n;
      if (n - candidate + 1 >= stable) return candidate;
    } else {
      candidate = null;
    }
  }
  return Infinity;
}

// ---------------------------------------------------------------- the plan and its thresholds

// a_j = alpha * (t_j^3 - t_(j-1)^3): the error a look is allowed to spend. `looks` holds the
// number of complete blocks (runs per cell) after which each look happens.
export function spendingThresholds(looks, alpha = 0.025) {
  if (!Array.isArray(looks) || looks.length === 0) throw new RangeError('a plan needs at least one look');
  let previous = 0;
  for (const m of looks) {
    if (!Number.isInteger(m) || m <= previous) throw new RangeError(`looks must be increasing whole numbers of blocks, got ${looks.join(', ')}`);
    previous = m;
  }
  const last = looks[looks.length - 1];
  let spent = 0;
  return looks.map((m) => {
    const cumulative = alpha * (m / last) ** 3;
    const a = cumulative - spent;
    spent = cumulative;
    return a;
  });
}

// Information fractions, alpha per look and the refutation constant z_R per look.
export function planThresholds(plan) {
  const alpha = plan.alpha ?? 0.025;
  const spent = spendingThresholds(plan.looks, alpha);
  const last = plan.looks[plan.looks.length - 1];
  let zR;
  if (Array.isArray(plan.zR)) {
    if (plan.zR.length !== plan.looks.length) throw new RangeError('plan.zR needs one value per look');
    zR = [...plan.zR];
  } else if (typeof plan.delta === 'number') {
    zR = spent.map((a) => normalQuantile(1 - a) + plan.delta);
  } else {
    throw new RangeError('a plan needs delta (the calibrated margin) or zR (one constant per look)');
  }
  return { alpha, t: plan.looks.map((m) => m / last), alphaSpent: spent, zR };
}

// ---------------------------------------------------------------- strata helpers

const keyOf = (value, fallback) => (value === null || value === undefined || value === '' ? fallback : String(value));

function addCounts(target, cell) {
  target.xT += cell.xT;
  target.nT += cell.nT;
  target.xC += cell.xC;
  target.nC += cell.nC;
}

function groupCells(cells, field, fallback, order) {
  const groups = new Map();
  if (order) for (const name of order) groups.set(String(name), { [field]: String(name), xT: 0, nT: 0, xC: 0, nC: 0 });
  for (const cell of cells) {
    const name = keyOf(cell[field], fallback);
    if (!groups.has(name)) groups.set(name, { [field]: name, xT: 0, nT: 0, xC: 0, nC: 0 });
    addCounts(groups.get(name), cell);
  }
  return [...groups.values()];
}

export function stackTotals(cells, order) {
  return groupCells(cells, 'stack', 'all', order);
}

export function slotTotals(cells, order) {
  return groupCells(cells, 'slot', 'all', order);
}

export function pooledTotals(cells) {
  const total = { xT: 0, nT: 0, xC: 0, nC: 0 };
  for (const cell of cells) addCounts(total, cell);
  return total;
}

const difference = (c) => (c.nT > 0 && c.nC > 0 ? c.xT / c.nT - c.xC / c.nC : null);

// Counts of correct runs per stratum for the two arms being compared.
export function cellsFromRuns(runs, treatmentArm, controlArm) {
  const strata = new Map();
  for (const run of runs) {
    if (run.arm !== treatmentArm && run.arm !== controlArm) continue;
    const stack = keyOf(run.stack, 'all');
    const slot = keyOf(run.slot, 'all');
    const key = JSON.stringify([stack, slot]);
    if (!strata.has(key)) strata.set(key, { stack, slot, xT: 0, nT: 0, xC: 0, nC: 0 });
    const cell = strata.get(key);
    if (run.arm === treatmentArm) {
      cell.nT++;
      if (run.correct) cell.xT++;
    } else {
      cell.nC++;
      if (run.correct) cell.xC++;
    }
  }
  return [...strata.values()];
}

// Per stack, per slot and pooled, each with its Newcombe interval. A slot whose observed
// difference goes against the pooled one is flagged; the flag is information, never a gate.
export function summarizeCells(cells, { z = Z95, pooledZ = z, stacks, slots } = {}) {
  const withInterval = (c, zValue) => ({ ...c, difference: difference(c), interval: pick(newcombe(c.xT, c.nT, c.xC, c.nC, zValue)) });
  const pooledCounts = pooledTotals(cells);
  const pooled = {
    ...pooledCounts,
    pT: pooledCounts.nT > 0 ? pooledCounts.xT / pooledCounts.nT : null,
    pC: pooledCounts.nC > 0 ? pooledCounts.xC / pooledCounts.nC : null,
    difference: difference(pooledCounts),
    interval: pick(newcombe(pooledCounts.xT, pooledCounts.nT, pooledCounts.xC, pooledCounts.nC, pooledZ)),
    intervalZ: pooledZ,
  };
  const perStack = stackTotals(cells, stacks).map((c) => withInterval(c, z));
  const perSlot = slotTotals(cells, slots).map((c) => {
    const row = withInterval(c, z);
    row.opposing = row.difference !== null && pooled.difference !== null && row.difference * pooled.difference < 0;
    return row;
  });
  return { perStack, perSlot, pooled, opposingSlots: perSlot.filter((s) => s.opposing).map((s) => s.slot) };
}

function pick({ lower, upper }) {
  return { lower, upper };
}

// ---------------------------------------------------------------- interaction between stacks

// Every pair of stacks with the contrast D_k - D_k' and its square-and-add interval, built from
// the per-stack Newcombe limits. The level is 95% overall, shared between pairs (Bonferroni).
// A pair is flagged when the observed signs are opposite and the interval excludes 0.
export function stackContrasts(stackCounts, level = 0.95) {
  const usable = stackCounts.filter((s) => s.nT > 0 && s.nC > 0);
  const pairCount = (usable.length * (usable.length - 1)) / 2;
  if (pairCount === 0) return { z: null, pairs: [] };
  const z = normalQuantile(1 - (1 - level) / (2 * pairCount));
  const rows = usable.map((s) => ({ stack: s.stack, ...newcombe(s.xT, s.nT, s.xC, s.nC, z) }));
  const pairs = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const contrast = a.estimate - b.estimate;
      const lower = contrast - Math.hypot(a.estimate - a.lower, b.upper - b.estimate);
      const upper = contrast + Math.hypot(a.upper - a.estimate, b.estimate - b.lower);
      const oppositeSigns = a.estimate * b.estimate < 0;
      pairs.push({ stacks: [a.stack, b.stack], contrast, lower, upper, oppositeSigns, flagged: oppositeSigns && (lower > 0 || upper < 0) });
    }
  }
  return { z, pairs };
}

export function interactionFlag(stackCounts, level = 0.95) {
  return stackContrasts(stackCounts, level).pairs.some((pair) => pair.flagged);
}

// ---------------------------------------------------------------- the decision rule

// One look of the preregistered rule.
//   cells: one { stack, slot, xT, nT, xC, nC } per stratum, cumulative counts at this look.
//   plan:  { dStar, looks, delta | zR, alpha?, stacks?, slots?, hash? }.
//   look:  { index (1 for the first look), hash? }.
// Returns { verdict, cause, stop, statistics }. The verdict is 'supported', 'refuted',
// 'undecidable' or, at a look that is not the last and crosses nothing, 'continue'.
export function decide(cells, plan, look = {}) {
  const thresholds = planThresholds(plan);
  const lookCount = plan.looks.length;
  const index = look.index ?? lookCount;
  const broken = (reason) => ({ verdict: 'undecidable', cause: `broken instrument: ${reason}`, stop: true, statistics: null });

  // Step 1: the instrument.
  if (plan.hash !== undefined && plan.hash !== null && look.hash !== plan.hash) {
    return broken(look.hash === undefined || look.hash === null ? 'the harness hash was not recorded at this look' : 'the harness hash changed');
  }
  if (!Number.isInteger(index) || index < 1 || index > lookCount) {
    return broken(`unplanned look (look ${index} of a plan with ${lookCount})`);
  }
  const strata = new Map();
  for (const cell of cells) {
    checkCount(cell.xT, cell.nT, 'decide treatment');
    checkCount(cell.xC, cell.nC, 'decide control');
    const stack = keyOf(cell.stack, 'all');
    const slot = keyOf(cell.slot, 'all');
    const key = JSON.stringify([stack, slot]);
    if (!strata.has(key)) strata.set(key, { stack, slot, xT: 0, nT: 0, xC: 0, nC: 0 });
    addCounts(strata.get(key), cell);
  }
  if (plan.stacks && plan.slots) {
    const planned = new Set();
    for (const stack of plan.stacks) {
      for (const slot of plan.slots) {
        const key = JSON.stringify([String(stack), String(slot)]);
        planned.add(key);
        if (!strata.has(key)) return broken(`incomplete block (no runs for ${stack} / ${slot})`);
      }
    }
    for (const [key, cell] of strata) {
      if (!planned.has(key)) return broken(`a cell outside the plan has runs (${cell.stack} / ${cell.slot})`);
    }
  }
  const list = [...strata.values()];
  if (list.length === 0) return broken('incomplete block (no runs)');
  const sizes = new Set();
  for (const cell of list) sizes.add(cell.nT).add(cell.nC);
  if (sizes.size !== 1) return broken('incomplete block (cells have different numbers of runs)');
  const runsPerCell = list[0].nT;
  const planned = plan.looks[index - 1];
  if (runsPerCell !== planned) {
    return broken(`unplanned look (${runsPerCell} runs per cell; look ${index} is planned at ${planned})`);
  }

  // Statistics.
  const zR = thresholds.zR[index - 1];
  const alphaSpent = thresholds.alphaSpent[index - 1];
  const summary = summarizeCells(list, { pooledZ: zR, stacks: plan.stacks, slots: plan.slots });
  const { pooled, perStack } = summary;
  const test = exactCmh(list);
  const contrasts = stackContrasts(perStack);
  const interaction = contrasts.pairs.some((pair) => pair.flagged);
  const positiveInEveryStack = perStack.every((s) => s.difference > 0);
  const upperLimit = pooled.interval.upper;
  const last = index === lookCount;
  const statistics = {
    look: index,
    looks: lookCount,
    runsPerCell,
    runs: pooled.nT + pooled.nC,
    dStar: plan.dStar,
    alphaSpent,
    zR,
    pooled,
    upperLimit,
    pS: test.pUpper,
    pTwoSided: test.pTwoSided,
    informativeStrata: test.informativeStrata,
    positiveInEveryStack,
    estimateAtLeastDStar: pooled.difference >= plan.dStar,
    interaction,
    contrasts: contrasts.pairs,
    perStack,
    perSlot: summary.perSlot,
    opposingSlots: summary.opposingSlots,
    earlyStop: false,
    estimateBias: null,
  };
  const finish = (verdict, cause) => {
    const stop = verdict !== 'continue';
    statistics.earlyStop = stop && !last;
    // Stopping early on a boundary selects extreme samples: the estimate overstates the
    // difference after early support and understates it after early refutation.
    if (statistics.earlyStop && verdict === 'supported') statistics.estimateBias = 'upward';
    if (statistics.earlyStop && verdict === 'refuted') statistics.estimateBias = 'downward';
    return { verdict, cause, stop, statistics };
  };

  // Step 2: floor or ceiling.
  const correct = pooled.xT + pooled.xC;
  if (correct === 0) return finish('undecidable', 'floor: every run failed');
  if (correct === pooled.nT + pooled.nC) return finish('undecidable', 'ceiling: every run passed');

  // Step 3: refutation.
  const belowDStar = upperLimit < plan.dStar;
  if (belowDStar && !interaction) return finish('refuted', `the upper limit of the difference (${upperLimit.toFixed(4)}) is below d* (${plan.dStar})`);

  // Step 4: support. The factor only absorbs rounding: a p exactly at the threshold counts.
  const significant = test.pUpper <= alphaSpent * (1 + 1e-9);
  if (significant && positiveInEveryStack) return finish('supported', `exact stratified p (${test.pUpper.toPrecision(3)}) is at most ${alphaSpent} and the difference is positive in every stack`);

  // Step 5: continue, or close as undecidable with the cause.
  if (!last) return finish('continue', null);
  if (belowDStar) return finish('undecidable', 'interaction: the upper limit is below d* but the stacks disagree in sign');
  if (significant) return finish('undecidable', 'the difference is not positive in every stack');
  return finish('undecidable', 'no boundary crossed after the last look: too few runs to tell');
}

// ---------------------------------------------------------------- Bayesian summary (secondary)

// Beta(1,1) prior on the rate of each stack and arm, slots pooled inside the stack.
// D is the equal-weight mean over stacks of p_T - p_C. Each posterior is cut into `bins`
// equal bins, and the distribution of D is the convolution of the binned posteriors.
export function posteriorDifference(cells, dStar, { bins = 200 } = {}) {
  const stacks = stackTotals(cells);
  if (stacks.length === 0) throw new RangeError('posteriorDifference needs at least one cell');
  const binned = (a, b) => {
    const masses = new Array(bins);
    let previous = 0;
    for (let i = 0; i < bins; i++) {
      const next = i === bins - 1 ? 1 : betaCdf((i + 1) / bins, a, b);
      masses[i] = next - previous;
      previous = next;
    }
    return masses;
  };
  const convolve = (first, second) => {
    const out = new Array(first.length + second.length - 1).fill(0);
    for (let i = 0; i < first.length; i++) {
      if (first[i] === 0) continue;
      for (let j = 0; j < second.length; j++) out[i + j] += first[i] * second[j];
    }
    return out;
  };
  const perStack = [];
  let sum = [1];
  let mean = 0;
  for (const s of stacks) {
    const treatment = { a: s.xT + 1, b: s.nT - s.xT + 1 };
    const control = { a: s.xC + 1, b: s.nC - s.xC + 1 };
    perStack.push({ stack: s.stack, treatment, control });
    mean += treatment.a / (treatment.a + treatment.b) - control.a / (control.a + control.b);
    // p_T - p_C on the grid: index i - j + (bins - 1), in steps of 1 / bins.
    const stackDifference = convolve(binned(treatment.a, treatment.b), binned(control.a, control.b).reverse());
    sum = convolve(sum, stackDifference);
  }
  const k = stacks.length;
  const centre = k * (bins - 1);
  // Mass at grid point j is spread evenly over [j - 1/2, j + 1/2] grid steps.
  const above = (threshold) => {
    const cut = threshold * k * bins;
    let total = 0;
    for (let i = sum.length - 1; i >= 0; i--) {
      const share = Math.min(1, Math.max(0, i - centre + 0.5 - cut));
      if (share === 0) break;
      total += sum[i] * share;
    }
    return Math.min(1, total);
  };
  return { pGreaterZero: above(0), pAtLeastDStar: above(dStar), mean: mean / k, dStar, bins, perStack };
}

// ---------------------------------------------------------------- bootstrap and cost

// Percentile bootstrap for a mean. The limits are the k-th smallest and k-th largest
// resampled means, with k = floor((1 - level) / 2 * (resamples + 1)).
export function bootstrapMean(values, seed, resamples = 10000, level = 0.95) {
  const n = values.length;
  if (n === 0) return { n: 0, mean: null, lower: null, upper: null };
  let total = 0;
  for (const v of values) total += v;
  const next = rng(seed);
  const means = new Float64Array(resamples);
  for (let b = 0; b < resamples; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[Math.floor(next() * n)];
    means[b] = sum / n;
  }
  means.sort();
  const k = Math.max(1, Math.floor(((1 - level) / 2) * (resamples + 1)));
  return { n, mean: total / n, lower: means[k - 1], upper: means[resamples - k] };
}

// Cost per correct run of one arm: total tokens over correct runs, which estimates
// CPC = c / p = m1 + m0 (1 - p) / p.
// Limits: [c_L / p_U, c_U / p_L]. Each of the four pieces misses with probability
// `error` / 2, so each limit of the cost holds on its own with confidence 1 - error whatever
// the dependence between tokens and success (Bonferroni), and both hold together with
// confidence 1 - 2 * error. With no correct run the upper limit is infinite: "at least".
export function costPerCorrect(runs, seed, { error = 0.05, resamples = 10000 } = {}) {
  const n = runs.length;
  const empty = { n, correct: 0, totalTokens: 0, meanTokens: null, rate: null, estimate: null, m1: null, m0: null, lower: null, upper: null, wording: 'not estimable', meanLimits: null, rateLimits: null };
  if (n === 0) return empty;
  let correct = 0;
  let totalTokens = 0;
  let correctTokens = 0;
  for (const run of runs) {
    totalTokens += run.tokens;
    if (run.correct) {
      correct++;
      correctTokens += run.tokens;
    }
  }
  const level = 1 - error;
  const meanInterval = bootstrapMean(runs.map((r) => r.tokens), seed, resamples, level);
  const rateInterval = clopperPearson(correct, n, level);
  return {
    n,
    correct,
    totalTokens,
    meanTokens: totalTokens / n,
    rate: correct / n,
    estimate: correct > 0 ? totalTokens / correct : null,
    m1: correct > 0 ? correctTokens / correct : null,
    m0: correct < n ? (totalTokens - correctTokens) / (n - correct) : null,
    lower: meanInterval.lower / rateInterval.upper,
    upper: rateInterval.lower > 0 ? meanInterval.upper / rateInterval.lower : Infinity,
    wording: correct > 0 ? 'estimate' : 'at least',
    meanLimits: { lower: meanInterval.lower, upper: meanInterval.upper },
    rateLimits: { lower: rateInterval.lower, upper: rateInterval.upper },
  };
}

// Ratio of the cost per correct run, treatment over control, and its split into a structural
// term log(c_T / c_C) and a retry term log(p_C / p_T).
// Each limit of the ratio holds with confidence 1 - error. When one arm has no correct run the
// ratio has no estimate and only one side is bounded; when both have none nothing is estimable.
export function costRatio(treatmentRuns, controlRuns, seed, { error = 0.05, resamples = 10000 } = {}) {
  const t = costPerCorrect(treatmentRuns, seed, { error: error / 2, resamples });
  const c = costPerCorrect(controlRuns, seed + 1, { error: error / 2, resamples });
  const result = { estimate: null, structural: null, retry: null, lower: null, upper: null, wording: 'not estimable', treatment: t, control: c };
  if (t.n === 0 || c.n === 0) return result;
  result.structural = Math.log(t.meanTokens / c.meanTokens);
  if (t.correct === 0 && c.correct === 0) return result;
  if (c.correct === 0) return { ...result, lower: 0, upper: t.upper / c.lower, wording: 'at most' };
  if (t.correct === 0) return { ...result, lower: t.lower / c.upper, upper: Infinity, wording: 'at least' };
  return {
    ...result,
    estimate: t.estimate / c.estimate,
    retry: Math.log(c.rate / t.rate),
    lower: t.lower / c.upper,
    upper: t.upper / c.lower,
    wording: 'estimate',
  };
}

// Uses of a piece after which authoring it pays back: N* = F / (CPC_W - CPC_L).
export function breakEven(authoringCost, costWorkshop, costLine) {
  const saving = costWorkshop - costLine;
  return saving > 0 ? authoringCost / saving : Infinity;
}

// ---------------------------------------------------------------- gauge against judge

function rate(x, n) {
  if (n === 0) return { x, n, estimate: null, estimable: false, wilson: null, clopperPearson: null };
  return { x, n, estimate: x / n, estimable: true, wilson: wilson(x, n), clopperPearson: clopperPearson(x, n) };
}

// The 2x2 table of one arm. Positive means the judge fails.
//   a: both pass.  b: gauge passes, judge fails.  c: gauge fails, judge passes.  d: both fail.
// These are final-state tables: the loop stops when the gauge passes, so only the false
// confidence rate can be read from them. Sensitivity and specificity need per-attempt results.
export function gaugeTable(runs) {
  const arms = new Set(runs.map((r) => r.arm));
  if (arms.size > 1) throw new RangeError(`gaugeTable takes the runs of one arm, got ${[...arms].join(', ')}: tables are never pooled across arms`);
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  let missing = 0;
  for (const run of runs) {
    if (run.gaugePass !== true && run.gaugePass !== false) missing++;
    else if (run.gaugePass && run.correct) a++;
    else if (run.gaugePass) b++;
    else if (run.correct) c++;
    else d++;
  }
  return {
    a,
    b,
    c,
    d,
    n: a + b + c + d,
    missing,
    sensitivity: rate(d, b + d),
    specificity: rate(a, a + c),
    falseConfidence: rate(b, a + b),
    finalStateOnly: true,
  };
}

// One table per arm and slot.
export function gaugeTables(runs) {
  const groups = new Map();
  for (const run of runs) {
    const slot = keyOf(run.slot, 'all');
    const key = JSON.stringify([run.arm, slot]);
    if (!groups.has(key)) groups.set(key, { arm: run.arm, slot, runs: [] });
    groups.get(key).runs.push(run);
  }
  return [...groups.values()].map((g) => ({ arm: g.arm, slot: g.slot, ...gaugeTable(g.runs) }));
}

// "At least `threshold`" holds only when the Clopper-Pearson lower limit reaches it.
export function rateAtLeast(rateResult, threshold) {
  return Boolean(rateResult && rateResult.estimable && rateResult.clopperPearson.lower >= threshold);
}

// ---------------------------------------------------------------- model of the claim

function checkProbability(value, name) {
  if (!(value >= 0 && value <= 1)) throw new RangeError(`${name} must be between 0 and 1, got ${value}`);
}

// The loop that retries until the gauge passes, per attempt.
//   pi: P(the judge passes an attempt). se, sp: gauge sensitivity and specificity, positive = judge fails.
export function gaugeLoop(pi, se, sp, budget) {
  checkProbability(pi, 'pi');
  checkProbability(se, 'se');
  checkProbability(sp, 'sp');
  if (!Number.isInteger(budget) || budget < 1) throw new RangeError(`budget must be a positive whole number, got ${budget}`);
  const wrongPass = (1 - pi) * (1 - se);
  const rightPass = pi * sp;
  const gaugePassRate = rightPass + wrongPass;
  const neverPassed = (1 - gaugePassRate) ** budget;
  return {
    gaugePassRate,
    falseConfidence: gaugePassRate > 0 ? wrongPass / gaugePassRate : null,
    attempts: gaugePassRate > 0 ? (1 - neverPassed) / gaugePassRate : budget,
    attemptsPerCorrect: rightPass > 0 ? 1 / rightPass : Infinity,
    deliveryRate: 1 - neverPassed,
  };
}

// Composition check. The product law says P(all slots correct) = product of the single-slot
// rates, so R = P_all / product of q_j should be 1. The interval is on the log scale with
// 1/2 added to every count. A result is "not rejected" or "rejected", never "the law holds".
//   q: one { x, n } per slot (runs with only that slot open). xAll, nAll: runs with all open.
export function productLaw(q, xAll, nAll, z = Z95) {
  const notEstimable = { estimate: null, adjusted: null, lower: null, upper: null, gamma: null, rejected: false, wording: 'not estimable', slots: q.length };
  checkCount(xAll, nAll, 'productLaw all slots');
  for (const slot of q) checkCount(slot.x, slot.n, 'productLaw slot');
  if (q.length === 0 || nAll === 0 || q.some((slot) => slot.n === 0)) return notEstimable;
  let product = 1;
  let logRatio = Math.log((xAll + 0.5) / (nAll + 0.5));
  let variance = 1 / (xAll + 0.5) - 1 / (nAll + 0.5);
  for (const { x, n } of q) {
    product *= x / n;
    logRatio -= Math.log((x + 0.5) / (n + 0.5));
    variance += 1 / (x + 0.5) - 1 / (n + 0.5);
  }
  const estimate = product > 0 ? xAll / nAll / product : null;
  const half = z * Math.sqrt(Math.max(0, variance));
  const lower = Math.exp(logRatio - half);
  const upper = Math.exp(logRatio + half);
  const rejected = upper < 1 || lower > 1;
  return {
    estimate,
    adjusted: Math.exp(logRatio),
    lower,
    upper,
    // gamma^(|S| - 1) = R: the per-join loss if the law fails by a constant factor.
    gamma: estimate !== null && q.length > 1 ? estimate ** (1 / (q.length - 1)) : null,
    rejected,
    wording: rejected ? 'rejected' : 'not rejected',
    slots: q.length,
  };
}

// ---------------------------------------------------------------- reading runs.csv

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let started = false;
  const endField = () => {
    row.push(field);
    field = '';
    started = false;
  };
  const endRow = () => {
    if (row.length > 0 || started || field !== '') {
      endField();
      rows.push(row);
    }
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      quoted = true;
      started = true;
    } else if (ch === ',') {
      endField();
      started = true;
    } else if (ch === '\n') endRow();
    else if (ch !== '\r') {
      field += ch;
      started = true;
    }
  }
  endRow();
  return rows;
}

const toNumber = (value) => (value === undefined || value === '' ? null : Number(value));

function toBoolean(value) {
  if (value === undefined) return null;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'pass' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'fail' || v === 'no') return false;
  return null;
}

// Runs from the text of a runs.csv. A run is correct when it passes every test of every
// hidden suite (columns hidden_passed/hidden_total, hidden2_passed/hidden2_total, ...).
// slot, seed and the gauge result are null when the file has no such columns. The gauge
// result is read from gauge_pass, or from gauge_passed/gauge_total, or visible_passed/visible_total.
export function readRuns(csv) {
  const rows = parseCsv(csv.replace(/^﻿/, ''));
  if (rows.length === 0) return [];
  const header = rows[0].map((name) => name.trim());
  const required = ['stack', 'arm', 'total_tokens', 'hidden_passed', 'hidden_total'];
  const missing = required.filter((name) => !header.includes(name));
  if (missing.length > 0) throw new Error(`runs.csv is missing the column(s): ${missing.join(', ')}`);
  const suites = header.filter((name) => /^hidden\d*_passed$/.test(name)).map((name) => name.replace(/_passed$/, ''));
  for (const suite of suites) {
    if (!header.includes(`${suite}_total`)) throw new Error(`runs.csv is missing the column(s): ${suite}_total`);
  }
  const gaugePair = ['gauge', 'visible'].find((name) => header.includes(`${name}_passed`) && header.includes(`${name}_total`));
  const runs = [];
  for (const values of rows.slice(1)) {
    if (values.length === 1 && values[0].trim() === '') continue;
    const raw = {};
    header.forEach((name, i) => {
      raw[name] = values[i] ?? '';
    });
    let hiddenPassed = 0;
    let hiddenTotal = 0;
    let correct = true;
    for (const suite of suites) {
      const passed = Number(raw[`${suite}_passed`]);
      const total = Number(raw[`${suite}_total`]);
      hiddenPassed += passed;
      hiddenTotal += total;
      if (!(total > 0) || passed !== total) correct = false;
    }
    let gaugePass = null;
    if (header.includes('gauge_pass')) gaugePass = toBoolean(raw.gauge_pass);
    else if (gaugePair && raw[`${gaugePair}_total`] !== '') {
      const total = Number(raw[`${gaugePair}_total`]);
      gaugePass = total > 0 ? Number(raw[`${gaugePair}_passed`]) === total : null;
    }
    runs.push({
      arm: raw.arm,
      stack: raw.stack,
      slot: raw.slot === undefined || raw.slot === '' ? null : raw.slot,
      seed: toNumber(raw.seed),
      run: toNumber(raw.run),
      correct,
      gaugePass,
      tokens: Number(raw.total_tokens),
      tokensIn: toNumber(raw.prompt_tokens),
      tokensOut: toNumber(raw.completion_tokens),
      calls: toNumber(raw.calls),
      hiddenPassed,
      hiddenTotal,
      hiddenFraction: hiddenTotal > 0 ? hiddenPassed / hiddenTotal : null,
      raw,
    });
  }
  return runs;
}
