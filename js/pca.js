/**
 * PCA transformation pipeline:
 * 1. Z-score normalize raw values using preprocessing stats
 * 2. Interpolate to 100 timepoints
 * 3. Project onto PCA space
 */

const TARGET_LENGTH = 100;

/**
 * Z-score normalize a single value.
 */
function zNormalize(value, mean, std) {
  return std === 0 ? 0 : (value - mean) / std;
}

/**
 * Linear interpolation of an array to targetLength points.
 */
function interpolateArray(arr, targetLength) {
  const n = arr.length;
  if (n < 2) return new Array(targetLength).fill(arr[0] || 0);

  const result = new Array(targetLength);
  for (let i = 0; i < targetLength; i++) {
    const t = i / (targetLength - 1) * (n - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, n - 1);
    const frac = t - lo;
    result[i] = arr[lo] * (1 - frac) + arr[hi] * frac;
  }
  return result;
}

/**
 * Transform raw patient data (object of variable -> array of raw values)
 * into a PCA trajectory (100 x 10 array).
 *
 * @param {Object} rawData - { 'HR(心拍数)': [70, 72, ...], 'ART(M)': [80, ...], ... }
 * @param {Object} prepStats - { 'HR(心拍数)': { mean, std }, ... }
 * @param {Object} pcaModel - { components: [[...], ...], mean: [...], variable_names: [...] }
 * @returns {Array} 100x10 array (100 timepoints, 10 PCA components)
 */
function transformToPCA(rawData, prepStats, pcaModel) {
  const vars = pcaModel.variable_names;
  const nVars = vars.length;
  const nComp = pcaModel.n_components;

  // Step 1: Z-score normalize each variable, then interpolate to 100 points
  const zNormed = [];
  for (const v of vars) {
    const raw = rawData[v];
    if (!raw || raw.length === 0) {
      // Missing variable: fill with zeros (matches training behavior)
      zNormed.push(new Array(TARGET_LENGTH).fill(0));
    } else {
      const { mean, std } = prepStats[v];
      const normalized = raw.map(val => zNormalize(val, mean, std));
      zNormed.push(interpolateArray(normalized, TARGET_LENGTH));
    }
  }

  // Step 2: PCA projection at each timepoint
  // zNormed[varIdx][timeIdx] -> pcaResult[timeIdx][compIdx]
  const result = [];
  for (let t = 0; t < TARGET_LENGTH; t++) {
    const point = new Array(nComp).fill(0);
    for (let c = 0; c < nComp; c++) {
      let val = 0;
      for (let v = 0; v < nVars; v++) {
        val += (zNormed[v][t] - pcaModel.mean[v]) * pcaModel.components[c][v];
      }
      point[c] = val;
    }
    result.push(point);
  }

  return result;
}

/**
 * Convert 6 draggable curves (denormalized values) to full 16-variable raw data.
 * Missing variables are filled with their global mean (z=0 after normalization).
 */
function curvesToRawData(curves, prepStats, pcaModel) {
  const rawData = {};
  for (const v of pcaModel.variable_names) {
    if (curves[v]) {
      rawData[v] = curves[v];
    } else {
      // Fill with global mean (will become z=0)
      rawData[v] = new Array(TARGET_LENGTH).fill(prepStats[v].mean);
    }
  }
  return rawData;
}

/**
 * Build 6-variable z-score centroids from trajectory means.
 * Returns { SC1: [[z1,z2,...z6], ...100 rows], SC2: ..., SC3: ..., SC4: ... }
 */
function build6VarCentroids(trajectories, prepStats) {
  const vars = TRAJECTORY_VAR_ORDER;
  const centroids = {};
  for (const sc of ['SC1', 'SC2', 'SC3', 'SC4']) {
    const centroid = [];
    for (let t = 0; t < TARGET_LENGTH; t++) {
      const point = vars.map(v => {
        const raw = trajectories[sc][v].mean[t];
        return zNormalize(raw, prepStats[v].mean, prepStats[v].std);
      });
      centroid.push(point);
    }
    centroids[sc] = centroid;
  }
  return centroids;
}

/**
 * Convert current 6 editable curves (denormalized) to z-score trajectory.
 * Returns (100, 6) array for DTW comparison.
 */
function curvesTo6VarZscore(curves, prepStats) {
  const vars = TRAJECTORY_VAR_ORDER;
  const result = [];
  for (let t = 0; t < TARGET_LENGTH; t++) {
    const point = vars.map(v => {
      const raw = curves[v][t];
      return zNormalize(raw, prepStats[v].mean, prepStats[v].std);
    });
    result.push(point);
  }
  return result;
}
