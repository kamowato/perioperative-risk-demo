/**
 * Parse uploaded CSV and map columns to internal variable names.
 * Returns { data: { 'HR(心拍数)': [70, 72, ...], ... }, errors: [] }
 */
function parseCSV(text, metadata) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    return { data: null, errors: ['CSV must have at least a header and one data row.'] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const aliases = metadata.variable_aliases;
  const errors = [];

  // Map CSV columns to internal variable names
  const columnMap = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (aliases[h]) {
      columnMap[i] = aliases[h];
    }
  }

  // Check for required trajectory variables
  const mappedVars = new Set(Object.values(columnMap));
  const trajectoryVars = Object.keys(metadata.trajectory_vars);
  const missing = trajectoryVars.filter(v => !mappedVars.has(v));
  if (missing.length > 0) {
    const missingLabels = missing.map(v => metadata.trajectory_vars[v]?.en || v);
    errors.push(`Missing columns: ${missingLabels.join(', ')}. ` +
      'Accepted column names: HR, MAP, SpO2, EtCO2, TNASO, TBLAD (or Japanese equivalents).');
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  // Parse data rows
  const data = {};
  for (const v of mappedVars) {
    data[v] = [];
  }

  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(',');
    for (const [colIdx, varName] of Object.entries(columnMap)) {
      const val = parseFloat(cells[colIdx]);
      if (!isNaN(val)) {
        data[varName].push(val);
      }
    }
  }

  // Validate minimum data length
  const lengths = Object.values(data).map(arr => arr.length);
  const minLen = Math.min(...lengths);
  if (minLen < 10) {
    return { data: null, errors: ['CSV must have at least 10 data rows.'] };
  }

  return { data, errors: [] };
}

/**
 * Generate a sample CSV string for download.
 * Uses SC1 mean trajectory as base with slight random noise.
 */
function generateSampleCSV(trajectories, metadata) {
  const vars = Object.keys(metadata.trajectory_vars);
  const headers = vars.map(v => metadata.trajectory_vars[v].en.replace(/[₂]/g, '2'));
  const aliasHeaders = ['HR', 'MAP', 'SpO2', 'EtCO2', 'TNASO', 'TBLAD'];

  let csv = aliasHeaders.join(',') + '\n';
  const sc1 = trajectories['SC1'];

  // Generate 200 timepoints (simulating ~200 min surgery)
  for (let t = 0; t < 100; t++) {
    const row = vars.map(v => {
      const base = sc1[v].mean[t];
      const noise = (Math.random() - 0.5) * sc1[v].std[t] * 0.3;
      return (base + noise).toFixed(2);
    });
    csv += row.join(',') + '\n';
  }

  return csv;
}
