/**
 * Standard multivariate DTW distance computation.
 * Input: two 2D arrays of shape (T, D) where T = timepoints, D = dimensions.
 * Returns the DTW distance (scalar).
 */
function dtwDistance(series1, series2) {
  const n = series1.length;
  const m = series2.length;
  const D = series1[0].length;

  // Cost matrix
  const dp = Array.from({ length: n + 1 }, () =>
    new Float64Array(m + 1).fill(Infinity)
  );
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let cost = 0;
      for (let d = 0; d < D; d++) {
        const diff = series1[i - 1][d] - series2[j - 1][d];
        cost += diff * diff;
      }
      cost = Math.sqrt(cost);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m];
}

/**
 * Classify a patient PCA trajectory against 4 subcluster centroids.
 * Returns { assigned: 'SC2', distances: { SC1: 123.4, SC2: 89.1, ... } }
 */
function classifyTrajectory(patientPCA, centroids) {
  const distances = {};
  let minDist = Infinity;
  let assigned = null;

  for (const [sc, centroid] of Object.entries(centroids)) {
    const dist = dtwDistance(patientPCA, centroid);
    distances[sc] = Math.round(dist * 100) / 100;
    if (dist < minDist) {
      minDist = dist;
      assigned = sc;
    }
  }

  return { assigned, distances };
}
