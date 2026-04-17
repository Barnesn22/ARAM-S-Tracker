export function computeGapTiers (data, {
  scoreKey = "score",
  tierLabels = ["S", "A", "B", "C", "D"],
  minSize = 20,
  gapMultiplier = 1.5
} = {}) {
  if (!data || data.length === 0) return [];

  // 1. Extract and sort scores
  const sorted = [...data]
    .map(d => d[scoreKey])
    .filter(v => typeof v === "number" && !isNaN(v))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return data;

  // 2. Fallback for small datasets (avoid noisy splits)
  if (sorted.length < minSize) {
    const enriched = data.map(d => ({ ...d, tier: "B" }));
    return enriched;
  }

  // 3. Compute gaps between adjacent scores
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }

  // 4. Compute mean + std of gaps
  const meanGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  const stdGap = Math.sqrt(
    gaps.reduce((s, g) => s + Math.pow(g - meanGap, 2), 0) / gaps.length
  );

  const threshold = meanGap + gapMultiplier * stdGap;

  // 5. Find breakpoints
  const breakPoints = [];
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] > threshold) {
      breakPoints.push(i + 1);
    }
  }

  // Ensure at least 1 tier split
  if (breakPoints.length === 0) {
    breakPoints.push(Math.floor(sorted.length / 2));
  }

  // 6. Build segments
  const segments = [];
  let start = 0;

  for (const bp of breakPoints) {
    segments.push(sorted.slice(start, bp));
    start = bp;
  }
  segments.push(sorted.slice(start));

  // 7. Assign tiers (highest segment = S)
  const tierMap = new Map();

  const reversed = segments.slice().reverse();

  reversed.forEach((segment, i) => {
    const tier = tierLabels[i] || "D";
    for (const val of segment) {
      tierMap.set(val, tier);
    }
  });

  // 8. Attach tiers back to original data
  return data.map(d => ({
    ...d,
    tier: tierMap.get(d[scoreKey]) || "D"
  }));
}

function variance1(values, start, end) {
  let sum = 0;
  let sumSq = 0;
  let count = end - start;

  if (count === 0) return 0;

  for (let i = start; i < end; i++) {
    sum += values[i];
    sumSq += values[i] * values[i];
  }

  const mean = sum / count;
  return sumSq - mean * sum * count;
}

export function jenks(data, valueKey = "score", numClasses = 5) {
  if (!data || data.length === 0) return [];

  // 1. Extract and sort values
  const values = data
    .map(d => d[valueKey])
    .filter(v => typeof v === "number" && !isNaN(v))
    .sort((a, b) => a - b);

  const n = values.length;
  if (n === 0) return [];

  numClasses = Math.min(numClasses, n);

  // 2. Initialize matrices
  const lower = Array.from({ length: n + 1 }, () => Array(numClasses + 1).fill(0));
  const variance = Array.from({ length: n + 1 }, () => Array(numClasses + 1).fill(Infinity));

  for (let i = 1; i <= numClasses; i++) {
    lower[1][i] = 1;
    variance[1][i] = 0;
  }

  for (let i = 1; i <= n; i++) {
    lower[i][1] = 1;
    variance[i][1] = variance1(values, 0, i);
  }

  // 3. Fill matrices (dynamic programming)
  for (let k = 2; k <= numClasses; k++) {
    for (let i = k; i <= n; i++) {
      let best = Infinity;
      let bestIndex = -1;

      for (let j = k - 1; j < i; j++) {
        const v = variance[j][k - 1] + variance1(values, j, i);

        if (v < best) {
          best = v;
          bestIndex = j;
        }
      }

      lower[i][k] = bestIndex;
      variance[i][k] = best;
    }
  }

  // 4. Build class breaks
  const breaks = Array(numClasses + 1).fill(0);
  breaks[numClasses] = n;
  breaks[0] = 0;

  let k = numClasses;
  let i = n;

  while (k > 1) {
    const idx = lower[i][k];
    breaks[k - 1] = idx;
    i = idx;
    k--;
  }

  // 5. Assign class labels
  const result = Array(n).fill(0);

  for (let c = 1; c <= numClasses; c++) {
    const start = breaks[c - 1];
    const end = breaks[c];

    for (let i = start; i < end; i++) {
      result[i] = c;
    }
  }

  // 6. Map back to original data
  const valueToClass = new Map();

  for (let i = 0; i < n; i++) {
    valueToClass.set(values[i], result[i]);
  }

  return data.map(d => ({
    ...d,
    jenksClass: valueToClass.get(d[valueKey]) || 1
  }));
}