/**
 * Main application entry point.
 * Loads data, initializes charts, wires up interactions.
 */

let APP = {
  metadata: null,
  trajectories: null,
  centroids: null,      // PCA-space centroids (for CSV with all 16 vars)
  centroids6var: null,   // 6-variable z-score centroids (for drag interaction)
  pcaModel: null,
  prepStats: null,
  charts: null,
  curves: null,  // Current editable curves { varName: [100 values] }
};

async function loadJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.status}`);
  return resp.json();
}

async function init() {
  try {
    // Load all data in parallel
    const [metadata, trajectories, centroids, pcaModel, prepStats] = await Promise.all([
      loadJSON('data/metadata.json'),
      loadJSON('data/trajectories.json'),
      loadJSON('data/centroids_pca.json'),
      loadJSON('data/pca_model.json'),
      loadJSON('data/preprocessing_stats.json'),
    ]);

    APP.metadata = metadata;
    APP.trajectories = trajectories;
    APP.centroids = centroids;
    APP.pcaModel = pcaModel;
    APP.prepStats = prepStats;

    // Set variable order from metadata BEFORE anything uses it
    TRAJECTORY_VAR_ORDER = metadata.pca_variable_order;

    // Build 16-variable z-score centroids from trajectory means
    APP.centroids6var = build6VarCentroids(trajectories, prepStats);

    // Setup UI
    populateHeader(metadata);
    createLegend('legend', metadata);
    stylePresetButtons(metadata);

    // Create charts
    APP.charts = createCharts('charts', trajectories, metadata);

    // Initialize editable curves from SC1 mean
    loadPreset('SC1');

    // Wire up controls
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => loadPreset(btn.dataset.sc));
    });
    document.getElementById('btn-perturb').addEventListener('click', perturbCurves);
    document.getElementById('csv-upload').addEventListener('change', handleCSVUpload);
    document.getElementById('btn-sample').addEventListener('click', downloadSampleCSV);

  } catch (err) {
    console.error('Initialization error:', err);
    document.getElementById('charts').innerHTML =
      `<p style="color: red; padding: 20px;">Error loading data: ${err.message}</p>`;
  }
}

/**
 * Load a subcluster preset as the starting curve.
 */
function loadPreset(sc) {
  const traj = APP.trajectories[sc];
  APP.curves = {};

  for (const varName of TRAJECTORY_VAR_ORDER) {
    APP.curves[varName] = [...traj[varName].mean];
    updatePatientCurve(APP.charts, varName, APP.curves[varName]);
  }

  // Highlight active preset button
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sc === sc);
  });

  initDragHandles(APP.charts, APP.curves, onCurvesChanged);
  classifyCurrentCurves();
}

/**
 * Add random perturbation to current curves (within ±0.5 SD).
 */
function perturbCurves() {
  for (const varName of TRAJECTORY_VAR_ORDER) {
    const curve = APP.curves[varName];
    // Find the SC whose mean is closest for SD reference
    const scKey = document.getElementById('result-sc-value').textContent || 'SC1';
    const stdArr = APP.trajectories[scKey]?.[varName]?.std
      || APP.trajectories['SC1'][varName].std;

    for (let i = 0; i < curve.length; i++) {
      curve[i] += (Math.random() - 0.5) * stdArr[i] * 0.6;
    }
    updatePatientCurve(APP.charts, varName, curve);
  }

  // Clear active preset indicator
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));

  initDragHandles(APP.charts, APP.curves, onCurvesChanged);
  classifyCurrentCurves();
}

/**
 * Called when any curve is changed via drag.
 */
function onCurvesChanged(curves) {
  APP.curves = curves;
  // Clear active preset since user has manually edited
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
  classifyCurrentCurves();
}

/**
 * Run classification on current curves using 6-variable z-score DTW.
 */
function classifyCurrentCurves() {
  const patientZscore = curvesTo6VarZscore(APP.curves, APP.prepStats);
  const result = classifyTrajectory(patientZscore, APP.centroids6var);
  displayResult(result, APP.metadata);
}

/**
 * Handle CSV file upload.
 */
function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const { data, errors } = parseCSV(text, APP.metadata);

    if (errors.length > 0) {
      showError(errors.join(' '));
      return;
    }

    // Interpolate uploaded data to 100 points and set as curves
    const trajectoryVars = Object.keys(APP.metadata.trajectory_vars);
    for (const varName of trajectoryVars) {
      if (data[varName] && data[varName].length > 0) {
        APP.curves[varName] = interpolateArray(data[varName], TARGET_LENGTH);
        updatePatientCurve(APP.charts, varName, APP.curves[varName]);
      }
    }

    // Clear active preset
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));

    // Classify using 6-var DTW (same as drag)
    classifyCurrentCurves();

    // Update drag handles
    initDragHandles(APP.charts, APP.curves, onCurvesChanged);
  };

  reader.readAsText(file);
  event.target.value = '';
}

/**
 * Download a sample CSV file.
 */
function downloadSampleCSV() {
  const csv = generateSampleCSV(APP.trajectories, APP.metadata);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_intraoperative_data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Start
document.addEventListener('DOMContentLoaded', init);
