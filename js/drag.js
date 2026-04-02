/**
 * Drag interaction module: direct curve manipulation.
 * Click/touch and drag anywhere on the chart area to reshape the patient curve.
 * Gaussian brush falloff for smooth deformation.
 * Touch support: uses native touch events as fallback for mobile.
 */

const DRAG_BRUSH_RADIUS = 8;

/**
 * Initialize drag interaction on all charts.
 */
function initDragHandles(allCharts, curves, onDragEnd) {
  for (const varName of TRAJECTORY_VAR_ORDER) {
    const chart = allCharts[varName];
    if (!chart || !curves[varName]) continue;
    setupLineDrag(allCharts, chart, varName, curves, onDragEnd);
  }
}

function applyBrush(curves, varName, chart, clientX, clientY) {
  const svgNode = chart.svg.node();
  const pt = svgNode.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(chart.g.node().getScreenCTM().inverse());

  const mx = Math.max(0, Math.min(CHART_INNER_W, svgPt.x));
  const my = Math.max(0, Math.min(CHART_INNER_H, svgPt.y));

  const tIdx = Math.round(chart.xScale.invert(mx));
  const targetValue = chart.yScale.invert(my);

  if (tIdx < 0 || tIdx >= 100) return;

  const values = curves[varName];
  const delta = targetValue - values[tIdx];

  for (let i = 0; i < 100; i++) {
    const dist = Math.abs(i - tIdx);
    if (dist > DRAG_BRUSH_RADIUS * 3) continue;
    const weight = Math.exp(-(dist * dist) / (2 * DRAG_BRUSH_RADIUS * DRAG_BRUSH_RADIUS));
    values[i] += delta * weight;
  }
}

function setupLineDrag(allCharts, chart, varName, curves, onDragEnd) {
  // Remove old overlays and listeners
  chart.g.selectAll('.drag-overlay').remove();
  const svgNode = chart.svg.node();
  if (svgNode._dragCleanup) {
    svgNode._dragCleanup();
  }

  // Invisible overlay for pointer events
  chart.g.append('rect')
    .attr('class', 'drag-overlay')
    .attr('width', CHART_INNER_W)
    .attr('height', CHART_INNER_H)
    .attr('fill', 'transparent')
    .style('pointer-events', 'all');

  // ---- D3 drag for mouse (desktop) ----
  const drag = d3.drag()
    .on('start', function (event) {
      if (event.sourceEvent) {
        event.sourceEvent.stopPropagation();
        event.sourceEvent.preventDefault();
      }
    })
    .on('drag', function (event) {
      const mx = Math.max(0, Math.min(CHART_INNER_W, event.x));
      const my = Math.max(0, Math.min(CHART_INNER_H, event.y));

      const tIdx = Math.round(chart.xScale.invert(mx));
      const targetValue = chart.yScale.invert(my);
      if (tIdx < 0 || tIdx >= 100) return;

      const values = curves[varName];
      const delta = targetValue - values[tIdx];
      for (let i = 0; i < 100; i++) {
        const dist = Math.abs(i - tIdx);
        if (dist > DRAG_BRUSH_RADIUS * 3) continue;
        const weight = Math.exp(-(dist * dist) / (2 * DRAG_BRUSH_RADIUS * DRAG_BRUSH_RADIUS));
        values[i] += delta * weight;
      }
      updatePatientCurve(allCharts, varName, values);
    })
    .on('end', function () {
      onDragEnd(curves);
    });

  chart.svg.select('.drag-overlay').call(drag);

  // ---- Native touch events (mobile fallback) ----
  let touching = false;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    touching = true;
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    applyBrush(curves, varName, chart, t.clientX, t.clientY);
    updatePatientCurve(allCharts, varName, curves[varName]);
  }

  function onTouchMove(e) {
    if (!touching || e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches[0];
    applyBrush(curves, varName, chart, t.clientX, t.clientY);
    updatePatientCurve(allCharts, varName, curves[varName]);
  }

  function onTouchEnd(e) {
    if (!touching) return;
    touching = false;
    e.preventDefault();
    onDragEnd(curves);
  }

  svgNode.addEventListener('touchstart', onTouchStart, { passive: false });
  svgNode.addEventListener('touchmove', onTouchMove, { passive: false });
  svgNode.addEventListener('touchend', onTouchEnd, { passive: false });

  svgNode._dragCleanup = () => {
    svgNode.removeEventListener('touchstart', onTouchStart);
    svgNode.removeEventListener('touchmove', onTouchMove);
    svgNode.removeEventListener('touchend', onTouchEnd);
  };
}

function updateDragHandles(allCharts, curves, onDragEnd) {
  initDragHandles(allCharts, curves, onDragEnd);
}
