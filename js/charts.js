// =========================================================================
// 2. Chart.js カスタムプラグイン＆描画ヘルパー
// =========================================================================
const centerTextPlugin = {
  id: 'centerText',
  beforeDatasetsDraw(chart, args, opts) {
    try {
      if (!opts || !opts.label) return;
      const ds = chart.data.datasets[0];
      if (!ds || !ds.data) return;
      const isEmpty = chart.data.labels && chart.data.labels.length === 1 && chart.data.labels[0] === 'データなし';
      const total = isEmpty
        ? 0
        : ds.data.reduce((sum, val, idx) => {
            const visible = typeof chart.getDataVisibility === 'function' ? chart.getDataVisibility(idx) : true;
            return sum + (visible ? (Number(val) || 0) : 0);
          }, 0);
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDarkMode() ? '#94a3b8' : '#64748b';
      ctx.font = '700 10px "Inter", "Noto Sans JP", sans-serif';
      ctx.fillText(opts.label, cx, cy - 10);
      ctx.fillStyle = isDarkMode() ? '#f8fafc' : '#1e1b2e';
      ctx.font = '900 16px "Inter", "Noto Sans JP", sans-serif';
      ctx.fillText(`${total}${opts.unit || ''}`, cx, cy + 8);
      ctx.restore();
    } catch (e) {}
  }
};

const barTotalPlugin = {
  id: 'barTotal',
  afterDatasetsDraw(chart, args, opts) {
    try {
      if (!opts || !opts.enabled) return;
      const { ctx, data } = chart;
      const len = (data.labels || []).length;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = isDarkMode() ? '#cbd5e1' : '#475569';
      ctx.font = '700 10px "Inter", "Noto Sans JP", sans-serif';

      let grandTotal = 0;

      for (let i = 0; i < len; i++) {
        let sum = 0;
        let topY = null;
        let xPos = null;
        data.datasets.forEach((ds, dsIdx) => {
          const meta = chart.getDatasetMeta(dsIdx);
          if (meta.hidden || meta.type !== 'bar') return;
          const val = Number(ds.data[i]) || 0;
          sum += val;
          const barEl = meta.data[i];
          if (barEl && val > 0) {
            if (topY === null || barEl.y < topY) topY = barEl.y;
            xPos = barEl.x;
          }
        });
        grandTotal += sum;
        if (sum > 0 && topY !== null && xPos !== null) {
          const drawY = Math.max(12, topY - 4);
          const textVal = opts.fixed1 ? sum.toFixed(1) : String(Math.round(sum * 10) / 10);
          ctx.fillText(textVal, xPos, drawY);
        }
      }
      ctx.restore();

      if (opts.summaryElId) {
        const badge = document.getElementById(opts.summaryElId);
        if (badge) {
          const rounded = opts.fixed1 ? grandTotal.toFixed(1) : Math.round(grandTotal * 10) / 10;
          const unit = opts.unit || '';
          if (opts.monthDiv && opts.monthDiv > 0) {
            badge.textContent = `合計：${rounded}${unit} / 月平均：${(grandTotal / opts.monthDiv).toFixed(1)}${unit}`;
          } else {
            badge.textContent = `合計 ${rounded}${unit}`;
          }
        }
      }
    } catch (e) {}
  }
};

const barCenterLabelPlugin = {
  id: 'barCenterLabel',
  afterDatasetsDraw(chart, args, opts) {
    try {
      if (!opts || !opts.enabled) return;
      const { ctx, data } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(15, 23, 42, 0.45)';
      ctx.shadowBlur = 3;

      data.datasets.forEach((ds, dsIdx) => {
        const meta = chart.getDatasetMeta(dsIdx);
        if (meta.hidden || meta.type !== 'bar') return;
        meta.data.forEach((barEl, i) => {
          const val = Number(ds.data[i]) || 0;
          if (!barEl || val <= 0) return;
          const barHeight = Math.abs(barEl.base - barEl.y);
          if (barHeight < 13) return;
          const centerY = (barEl.y + barEl.base) / 2;
          const fontSize = barHeight < 18 ? 8.5 : 10;
          ctx.font = `800 ${fontSize}px "Inter", "Noto Sans JP", sans-serif`;
          const textVal = opts.fixed1 ? val.toFixed(1) : String(Math.round(val * 10) / 10);
          ctx.fillText(textVal, barEl.x, centerY);
        });
      });
      ctx.restore();
    } catch (e) {}
  }
};

Chart.register(centerTextPlugin, barTotalPlugin, barCenterLabelPlugin);

function softenColorForLightMode(col) {
  if (typeof col !== 'string') return col;
  const m = col.trim().match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (!m) return col;
  const hex = m[1];
  const alphaHex = m[2] || '';
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  // グレー系はそのまま返す
  if (s < 0.15) return col;
  // 濁りを抑え、白背景でクリアに見える明るめパステル〜ミディアムトーンへ補正
  const deg = h * 360;
  let newS = Math.min(Math.max(s * 0.82, 0.52), 0.76);
  let newL = Math.max(0.62, Math.min(0.70, l * 0.45 + 0.42));
  // 黄色〜オレンジ系は暗くすると茶色く濁るため、明るさと鮮やかさを維持
  if (deg >= 25 && deg <= 75) {
    newS = Math.min(Math.max(s * 0.85, 0.65), 0.78);
    newL = 0.66;
  } else if (deg >= 110 && deg <= 175) {
    // 緑・シアン系は爽やかなセージ〜ミント寄り
    newS = Math.min(Math.max(s * 0.75, 0.48), 0.65);
    newL = 0.62;
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
  const p = 2 * newL - q;
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p, q, h + 1 / 3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1 / 3))}${alphaHex}`;
}

function applyLightSoftColors(val) {
  if (Array.isArray(val)) return val.map(softenColorForLightMode);
  if (typeof val === 'string') return softenColorForLightMode(val);
  return val;
}

const chartInstances = {};
function createChart(key, canvasId, config) {
  try {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      delete chartInstances[key];
    }
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    if (!isDarkMode() && config && config.data && Array.isArray(config.data.datasets)) {
      config.data.datasets.forEach(ds => {
        if (ds.backgroundColor) ds.backgroundColor = applyLightSoftColors(ds.backgroundColor);
        if (ds.borderColor) ds.borderColor = applyLightSoftColors(ds.borderColor);
        if (ds.pointBackgroundColor) ds.pointBackgroundColor = applyLightSoftColors(ds.pointBackgroundColor);
      });
    }

    if (isDarkMode() && config) {
      const tickColor = '#cbd5e1';
      const gridColor = '#2a2342';
      if (config.options && config.options.scales) {
        Object.values(config.options.scales).forEach(sc => {
          if (!sc) return;
          if (sc.ticks) sc.ticks.color = tickColor;
          if (sc.grid && sc.grid.display !== false) sc.grid.color = gridColor;
          if (sc.angleLines) sc.angleLines.color = gridColor;
          if (sc.pointLabels) sc.pointLabels.color = '#e2e8f0';
        });
      }
      if (config.options && config.options.plugins && config.options.plugins.legend && config.options.plugins.legend.labels) {
        config.options.plugins.legend.labels.color = '#cbd5e1';
      }
      if (config.type === 'doughnut' && config.data && Array.isArray(config.data.datasets)) {
        config.data.datasets.forEach(ds => {
          ds.borderColor = '#181428';
        });
      }
    }

    chartInstances[key] = new Chart(canvas, config);
    return chartInstances[key];
  } catch (e) {
    console.warn('Chart draw error:', key, e);
    return null;
  }
}

