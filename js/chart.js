/**
 * D3.js chart module: renders trajectory panels grouped by category.
 */

const CHART_MARGIN = { top: 20, right: 8, bottom: 24, left: 40 };
const CHART_INNER_W = 240;
const CHART_INNER_H = 140;

// All 16 PCA variables — populated from metadata at init
let TRAJECTORY_VAR_ORDER = [];

/**
 * Create all chart panels, grouped by variable category.
 * Returns { varName: { svg, xScale, yScale, g, patientPath } }
 */
function createCharts(containerId, trajectories, metadata) {
  const container = d3.select(`#${containerId}`);
  container.selectAll('*').remove();

  // Set global var order from metadata
  TRAJECTORY_VAR_ORDER = metadata.pca_variable_order;

  const charts = {};
  const scKeys = ['SC1', 'SC2', 'SC3', 'SC4'];
  const w = CHART_INNER_W + CHART_MARGIN.left + CHART_MARGIN.right;
  const h = CHART_INNER_H + CHART_MARGIN.top + CHART_MARGIN.bottom;

  // Group by category
  const categories = metadata.variable_categories || [
    { name: 'All Variables', vars: TRAJECTORY_VAR_ORDER }
  ];

  // One-line legend for the % shown under each chart title
  container.append('div')
    .attr('class', 'chart-impact-legend')
    .text('% under each title = clustering impact (contribution to subcluster assignment via PCA).');

  for (const cat of categories) {
    container.append('div')
      .attr('class', 'chart-category-header')
      .text(cat.name);

    const grid = container.append('div')
      .attr('class', 'chart-grid');

    for (const varName of cat.vars) {
      const varInfo = metadata.trajectory_vars[varName];
      if (!varInfo) continue;

      // Check if trajectory data exists for this variable
      const hasData = trajectories['SC1']?.[varName];
      if (!hasData) continue;

      const panel = grid.append('div').attr('class', 'chart-panel');
      const titleText = varInfo.unit ? `${varInfo.en} (${varInfo.unit})` : varInfo.en;
      const imp = metadata.variable_importance?.[varName];
      panel.append('div').attr('class', 'chart-title').text(titleText);
      if (imp !== undefined) {
        panel.append('div')
          .attr('class', imp < 1 ? 'chart-impact negligible' : 'chart-impact')
          .text(`${imp}%`);
      }

      const svg = panel.append('svg')
        .attr('width', w)
        .attr('height', h)
        .attr('viewBox', `0 0 ${w} ${h}`);

      const g = svg.append('g')
        .attr('transform', `translate(${CHART_MARGIN.left},${CHART_MARGIN.top})`);

      // Compute y-domain
      let yMin = Infinity, yMax = -Infinity;
      for (const sc of scKeys) {
        const d = trajectories[sc]?.[varName];
        if (!d) continue;
        for (let i = 0; i < d.mean.length; i++) {
          const lo = d.mean[i] - d.std[i];
          const hi = d.mean[i] + d.std[i];
          if (lo < yMin) yMin = lo;
          if (hi > yMax) yMax = hi;
        }
      }
      const yPad = (yMax - yMin) * 0.1;

      const xScale = d3.scaleLinear().domain([0, 99]).range([0, CHART_INNER_W]);
      const yScale = d3.scaleLinear()
        .domain([yMin - yPad, yMax + yPad])
        .range([CHART_INNER_H, 0]);

      // Axes
      g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${CHART_INNER_H})`)
        .call(d3.axisBottom(xScale).ticks(4).tickFormat(d => `${d}%`));

      g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).ticks(4));

      const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d))
        .curve(d3.curveMonotoneX);

      const area = d3.area()
        .x((d, i) => xScale(i))
        .y0(d => yScale(d.lo))
        .y1(d => yScale(d.hi))
        .curve(d3.curveMonotoneX);

      // Draw SC bands and lines
      for (const sc of scKeys) {
        const d = trajectories[sc]?.[varName];
        if (!d) continue;
        const color = metadata.subclusters[sc].color;

        const bandData = d.mean.map((m, i) => ({ lo: m - d.std[i], hi: m + d.std[i] }));
        g.append('path')
          .datum(bandData)
          .attr('class', `trajectory-band band-${sc}`)
          .attr('d', area)
          .attr('fill', color);

        g.append('path')
          .datum(d.mean)
          .attr('class', `trajectory-line line-${sc}`)
          .attr('d', line)
          .attr('stroke', color);
      }

      // Patient curve (editable)
      const patientPath = g.append('path')
        .attr('class', 'patient-line')
        .style('display', 'none');

      charts[varName] = { svg, g, xScale, yScale, patientPath, line, yMin, yMax, yPad };
    }
  }

  return charts;
}

/**
 * Update the patient curve on a chart from an array of 100 values.
 */
function updatePatientCurve(charts, varName, values) {
  const chart = charts[varName];
  if (!chart || !values) return;

  const line = d3.line()
    .x((d, i) => chart.xScale(i))
    .y(d => chart.yScale(d))
    .curve(d3.curveMonotoneX);

  chart.patientPath
    .datum(values)
    .attr('d', line)
    .style('display', null);
}

/**
 * Hide the patient curve on all charts.
 */
function hidePatientCurves(charts) {
  for (const varName of TRAJECTORY_VAR_ORDER) {
    const chart = charts[varName];
    if (chart) {
      chart.patientPath.style('display', 'none');
      chart.g.selectAll('.drag-overlay').remove();
    }
  }
}
