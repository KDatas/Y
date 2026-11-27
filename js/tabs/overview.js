// =========================================================================
// 9. TAB 1: 📊 年間推移
// =========================================================================
let isKpiVisible = true;
function toggleKpiSection() {
  isKpiVisible = !isKpiVisible;
  const sec = document.getElementById('kpiSection');
  const chev = document.getElementById('kpiToggleChevron');
  const btn = document.getElementById('kpiToggleBtn');
  if (sec) sec.classList.toggle('hidden', !isKpiVisible);
  if (chev) chev.textContent = isKpiVisible ? '▲' : '▼';
  if (btn) {
    btn.className = isKpiVisible
      ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100 border border-purple-100 transition cursor-pointer'
      : 'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-400 hover:text-purple-700 hover:bg-purple-50 border border-transparent transition cursor-pointer';
  }
}

function toggleGuidePopover(evt) {
  if (evt) evt.stopPropagation();
  const pop = document.getElementById('guidePopover');
  if (pop) pop.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('guidePopoverWrap');
  const pop = document.getElementById('guidePopover');
  if (wrap && pop && !wrap.contains(e.target)) {
    pop.classList.add('hidden');
  }
});

function setOverviewChartMode(mode) {
  overviewChartMode = mode;
  document.getElementById('ovModeBtn-compare').className = mode === 'compare'
    ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer'
    : 'px-2.5 py-1 rounded-lg text-xs font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  document.getElementById('ovModeBtn-cumulative').className = mode === 'cumulative'
    ? 'px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer'
    : 'px-2.5 py-1 rounded-lg text-xs font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  const descEl = document.getElementById('overviewModeDesc');
  if (descEl) {
    descEl.textContent = mode === 'compare'
      ? '初期表示は対象年＋直近1年（凡例クリックで他の過去年も重ねて表示できます）'
      : '1月〜12月の年間累計推移（凡例クリックで他の過去年も重ねて表示できます）';
  }
  renderOverviewSection();
}

function buildMonthlyMatrix(years) {
  const matrix = {};
  years.forEach(y => {
    matrix[y] = {
      hoursSec: Array(12).fill(0),
      hours: Array(12).fill(0),
      streams: Array(12).fill(0),
      full: Array(12).fill(0),
      short: Array(12).fill(0),
      singing: Array(12).fill(0),
      songs: Array(12).fill(0),
      events: Array(12).fill(0),
      radarEvents: Array(12).fill(0)
    };
  });

  appData.streams.forEach(s => {
    if (!matrix[s.year] || s.month < 1 || s.month > 12) return;
    const mi = s.month - 1;
    matrix[s.year].hoursSec[mi] += getStreamSeconds(s);
    if (!s.isError) matrix[s.year].streams[mi] += 1;
    if (isSingingStream(s)) matrix[s.year].singing[mi] += 1;
  });
  years.forEach(y => {
    for (let i = 0; i < 12; i++) {
      matrix[y].hours[i] = Math.round((matrix[y].hoursSec[i] / 3600) * 10) / 10;
    }
  });
  appData.fullVideos.forEach(v => {
    if (!isFullVideoExcluded(v) && matrix[v.year] && v.month >= 1 && v.month <= 12) {
      matrix[v.year].full[v.month - 1] += 1;
    }
  });
  appData.shortVideos.forEach(v => {
    if (!v.isExcluded && matrix[v.year] && v.month >= 1 && v.month <= 12) matrix[v.year].short[v.month - 1] += 1;
  });
  appData.setlist.forEach(r => {
    if (!isSetlistRowExcluded(r) && matrix[r.year] && r.month >= 1 && r.month <= 12) matrix[r.year].songs[r.month - 1] += 1;
  });
  appData.events.forEach(e => {
    if (matrix[e.year] && e.month >= 1 && e.month <= 12) {
      matrix[e.year].events[e.month - 1] += 1;
      if (isRadarTargetEvent(e)) matrix[e.year].radarEvents[e.month - 1] += 1;
    }
  });

  return matrix;
}

function renderOverviewSection() {
  const years = getAvailableYears();
  const matrix = buildMonthlyMatrix(years);
  const targetYear = selectedYear === 'all' ? years[0] : Number(selectedYear);
  const yearsAsc = years.slice().sort((a, b) => a - b);
  const pastYearsAsc = yearsAsc.filter(y => y !== targetYear);
  const monthsLabel = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

  const yearLineColors = {
    2020: '#06b6d4',
    2021: '#10b981',
    2022: '#f59e0b',
    2023: '#ef4444',
    2024: '#3b82f6',
    2025: '#8b5cf6',
    2026: '#ec4899'
  };
  const getYearLineColor = (y) => yearLineColors[y] || hashColor(`${y}年`);
  const hasYearData = (y, key) => matrix[y] && matrix[y][key].some(v => v > 0);

  const configs = [
    { key: 'hours',   canvas: 'chartOvHours',   badge: 'ovHoursBadge',   color: '#9333ea', unit: 'h', fixed1: true,  title: '配信時間' },
    { key: 'streams', canvas: 'chartOvStreams', badge: 'ovStreamsBadge', color: '#6366f1', unit: '回', fixed1: false, title: '配信回数' },
    { key: 'full',    canvas: 'chartOvFull',    badge: 'ovFullBadge',    color: '#d946ef', unit: '本', fixed1: false, title: 'Full動画' },
    { key: 'singing', canvas: 'chartOvSinging', badge: 'ovSingingBadge', color: '#ec4899', unit: '回', fixed1: false, title: '歌枠回数' }
  ];

  configs.forEach(cfg => {
    const curArr = (selectedYear === 'all')
      ? Array.from({ length: 12 }, (_, mi) => Math.round(years.reduce((s, y) => s + matrix[y][cfg.key][mi], 0) * 10) / 10)
      : matrix[targetYear][cfg.key].slice();

    const sumCur = curArr.reduce((a, b) => a + b, 0);
    const badgeEl = document.getElementById(cfg.badge);
    if (badgeEl) {
      const mDiv = getActiveMonthDivisor(
        filterBySelectedYear(appData.streams),
        filterBySelectedYear(appData.fullVideos),
        filterBySelectedYear(appData.shortVideos),
        filterBySelectedYear(appData.setlist),
        filterBySelectedYear(appData.events)
      );
      const sumStr = cfg.fixed1 ? sumCur.toFixed(1) : String(Math.round(sumCur * 10) / 10);
      const avgStr = (sumCur / Math.max(1, mDiv)).toFixed(1);
      badgeEl.textContent = `合計：${sumStr}${cfg.unit} / 月平均：${avgStr}${cfg.unit}`;
    }

    const datasets = [];
    if (overviewChartMode === 'compare') {
      datasets.push({
        type: 'bar',
        label: selectedYear === 'all' ? '全期間合計' : `${targetYear}年`,
        data: curArr,
        backgroundColor: cfg.color,
        borderRadius: 5,
        maxBarThickness: 26,
        order: 2
      });

      const lineYears = selectedYear === 'all'
        ? yearsAsc.filter(y => hasYearData(y, cfg.key))
        : pastYearsAsc.filter(y => hasYearData(y, cfg.key));
      const defaultVisibleYear = lineYears.length ? lineYears[lineYears.length - 1] : null;

      lineYears.forEach((y, idx) => {
        const lc = getYearLineColor(y);
        const isDefaultVisible = y === defaultVisibleYear;
        datasets.push({
          type: 'line',
          label: `${y}年`,
          data: matrix[y][cfg.key],
          borderColor: lc,
          backgroundColor: lc,
          borderWidth: isDefaultVisible ? 2.2 : 1.8,
          borderDash: isDefaultVisible ? [4, 3] : [],
          pointRadius: 2.5,
          pointHoverRadius: 4,
          pointBackgroundColor: lc,
          tension: 0,
          fill: false,
          hidden: !isDefaultVisible,
          order: 1,
          _dsIdx: idx
        });
      });
    } else {
      const toCum = arr => { let acc = 0; return arr.map(v => { acc += v; return Math.round(acc * 10) / 10; }); };
      if (selectedYear === 'all') {
        datasets.push({
          type: 'line',
          label: '全期間累計',
          data: toCum(curArr),
          borderColor: cfg.color,
          backgroundColor: `${cfg.color}20`,
          borderWidth: 2.5,
          pointRadius: 3,
          tension: 0,
          fill: true,
          order: 0
        });
        const activeAllYears = yearsAsc.filter(y => hasYearData(y, cfg.key));
        const latestAllYear = activeAllYears.length ? activeAllYears[activeAllYears.length - 1] : null;
        activeAllYears.forEach(y => {
          const lc = getYearLineColor(y);
          datasets.push({
            type: 'line',
            label: `${y}年 累計`,
            data: toCum(matrix[y][cfg.key]),
            borderColor: lc,
            backgroundColor: lc,
            borderWidth: 1.8,
            borderDash: [4, 3],
            pointRadius: 2,
            tension: 0,
            fill: false,
            hidden: y !== latestAllYear,
            order: 1
          });
        });
      } else {
        const activeYearsAsc = yearsAsc.filter(y => y === targetYear || hasYearData(y, cfg.key));
        const pastActiveAsc = activeYearsAsc.filter(y => y !== targetYear);
        const defaultVisiblePast = pastActiveAsc.length ? pastActiveAsc[pastActiveAsc.length - 1] : null;
        activeYearsAsc.forEach(y => {
          const isTarget = y === targetYear;
          const isDefaultVisible = isTarget || y === defaultVisiblePast;
          const lc = isTarget ? cfg.color : getYearLineColor(y);
          datasets.push({
            type: 'line',
            label: `${y}年 累計`,
            data: toCum(matrix[y][cfg.key]),
            borderColor: lc,
            backgroundColor: isTarget ? `${cfg.color}22` : lc,
            borderWidth: isTarget ? 2.8 : 2,
            borderDash: isTarget ? [] : [4, 3],
            pointRadius: isTarget ? 3 : 2.5,
            pointHoverRadius: 4,
            tension: 0,
            fill: isTarget,
            hidden: !isDefaultVisible,
            order: isTarget ? 0 : 1
          });
        });
      }
    }

    createChart(`ov_${cfg.key}`, cfg.canvas, {
      type: 'bar',
      data: { labels: monthsLabel, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (evt, elems) => {
          if (!elems.length) return;
          const m = elems[0].index + 1;
          const targetYears = selectedYear === 'all' ? years : [targetYear];
          const lbl = selectedYear === 'all' ? `全期間 ${m}月` : `${targetYear}年${m}月`;
          if (cfg.key === 'full') {
            showVideoDetailModal(`🎬 ${lbl} Full動画一覧`, appData.fullVideos.filter(v => targetYears.includes(v.year) && v.month === m), 'full');
          } else if (cfg.key === 'singing') {
            showStreamDetailModal(`🎤 ${lbl} 歌枠一覧`, appData.streams.filter(s => targetYears.includes(s.year) && s.month === m && isSingingStream(s)));
          } else {
            showStreamDetailModal(`🎙️ ${lbl} 配信一覧`, appData.streams.filter(s => targetYears.includes(s.year) && s.month === m));
          }
        },
        plugins: {
          barCenterLabel: {
            enabled: overviewChartMode === 'compare',
            fixed1: cfg.fixed1
          },
          legend: {
            position: 'bottom',
            labels: { font: { size: 10 }, boxWidth: 10 }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }
        }
      }
    });
  });
}

