/**
 * UI module: result display, legend, distance bars.
 */

function populateHeader(metadata) {
  document.getElementById('paper-title').textContent = metadata.title;
  document.getElementById('abstract-content').textContent = metadata.abstract;
}

/**
 * Color preset buttons with their SC colors.
 */
function stylePresetButtons(metadata) {
  document.querySelectorAll('.btn-preset').forEach(btn => {
    const sc = btn.dataset.sc;
    const color = metadata.subclusters[sc].color;
    btn.style.setProperty('--sc-color', color);
    btn.style.borderColor = color;
    btn.style.color = color;
    // Active state sets bg via CSS class, but we need JS for dynamic color
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('active')) {
        btn.style.backgroundColor = color + '15';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('active')) {
        btn.style.backgroundColor = '';
      }
    });
  });
}

/**
 * Update active preset button styling.
 */
function updatePresetButtonStyles() {
  document.querySelectorAll('.btn-preset').forEach(btn => {
    const sc = btn.dataset.sc;
    if (btn.classList.contains('active')) {
      const color = btn.style.getPropertyValue('--sc-color');
      btn.style.backgroundColor = color;
      btn.style.color = '#fff';
    } else {
      btn.style.backgroundColor = '';
      const color = btn.style.getPropertyValue('--sc-color');
      btn.style.color = color;
    }
  });
}

// Observe class changes on preset buttons
const presetObserver = new MutationObserver(() => updatePresetButtonStyles());

function createLegend(containerId, metadata) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  for (const sc of ['SC1', 'SC2', 'SC3', 'SC4']) {
    const info = metadata.subclusters[sc];
    const item = document.createElement('div');
    item.className = 'legend-item';

    const swatch = document.createElement('div');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = info.color;

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = `${sc} (n=${info.n}) — ${info.phenotype}`;

    item.appendChild(swatch);
    item.appendChild(label);
    container.appendChild(item);
  }

  // Start observing preset buttons after legend is created
  document.querySelectorAll('.btn-preset').forEach(btn => {
    presetObserver.observe(btn, { attributes: true, attributeFilter: ['class'] });
  });
}

function displayResult(result, metadata) {
  const scValueEl = document.getElementById('result-sc-value');
  const detailsEl = document.getElementById('result-details');
  const barsEl = document.getElementById('distance-bars');

  if (!result) {
    scValueEl.textContent = '--';
    scValueEl.style.backgroundColor = '';
    scValueEl.style.color = '';
    detailsEl.innerHTML = '';
    barsEl.innerHTML = '';
    return;
  }

  const sc = result.assigned;
  const info = metadata.subclusters[sc];

  scValueEl.textContent = sc;
  scValueEl.style.backgroundColor = info.color;
  scValueEl.style.color = '#fff';

  detailsEl.innerHTML =
    `<span style="font-size:12px">${info.phenotype} — AKI rate: ${info.aki.rate}% (${info.aki.label})</span>`;

  // Distance bar chart
  const maxDist = Math.max(...Object.values(result.distances));
  barsEl.innerHTML = '';

  for (const scKey of ['SC1', 'SC2', 'SC3', 'SC4']) {
    const dist = result.distances[scKey];
    const color = metadata.subclusters[scKey].color;
    const pct = maxDist > 0 ? ((1 - dist / maxDist) * 100) : 0;
    // Invert: closest = longest bar (similarity)
    const similarity = maxDist > 0 ? Math.max(5, (1 - dist / maxDist) * 100) : 50;

    const row = document.createElement('div');
    row.className = 'dist-bar-row';
    row.innerHTML =
      `<span class="dist-bar-label" style="color:${color}">${scKey}</span>` +
      `<div class="dist-bar-track">` +
        `<div class="dist-bar-fill" style="width:${similarity}%;background:${color}"></div>` +
      `</div>` +
      `<span class="dist-bar-value">${dist.toFixed(1)}</span>`;
    barsEl.appendChild(row);
  }
}

function showError(message) {
  const detailsEl = document.getElementById('result-details');
  detailsEl.innerHTML = `<div style="color: #c0392b; font-weight: 600;">${message}</div>`;
}
