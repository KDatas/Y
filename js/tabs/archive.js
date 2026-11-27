// =========================================================================
// 14. TAB 6: ⚖️ 比較（月別比較＋6軸レーダー＋活動スタイル変化）
// =========================================================================
function renderArchiveSection() {
  renderArchiveComparison();
}

function setRadarScaleMode(mode) {
  radarScaleMode = mode;
  document.getElementById('radarScaleBtn-all').className = mode === 'all'
    ? 'px-2 py-0.5 rounded-md bg-purple-700 text-white shadow-sm transition cursor-pointer'
    : 'px-2 py-0.5 rounded-md text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  document.getElementById('radarScaleBtn-pair').className = mode === 'pair'
    ? 'px-2 py-0.5 rounded-md bg-purple-700 text-white shadow-sm transition cursor-pointer'
    : 'px-2 py-0.5 rounded-md text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  renderArchiveComparison();
}

function setStyleShiftMode(mode) {
  styleShiftMode = mode;
  const modes = ['time', 'duration', 'streamCat', 'eventChannel', 'fullType'];
  modes.forEach(m => {
    const btn = document.getElementById(`styleBtn-${m}`);
    if (!btn) return;
    btn.className = m === mode
      ? 'px-2.5 py-1 rounded-lg bg-purple-700 text-white shadow-sm transition cursor-pointer'
      : 'px-2.5 py-1 rounded-lg text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  });
  renderArchiveComparison();
}

function renderArchiveComparison() {
  const years = getAvailableYears();
  if (!years.length) return;
  const matrix = buildMonthlyMatrix(years);

  const selA = document.getElementById('cmpYearA');
  const selB = document.getElementById('cmpYearB');
  const selMetric = document.getElementById('cmpMetric');
  if (!selA || !selB || !selMetric) return;

  const yA = Number(selA.value) || years[0];
  const valB = selB.value || (years.length > 1 ? String(years[1]) : String(years[0]));
  const metric = selMetric.value || 'hours';

  let poolB = [];
  let labelB = '';
  if (valB === 'avg_all') {
    poolB = years.filter(y => y !== yA);
    if (!poolB.length) poolB = [yA];
    labelB = '過去全年平均';
  } else if (valB === 'avg_3y') {
    const prevs = years.filter(y => y < yA).slice(0, 3);
    poolB = prevs.length ? prevs : years.filter(y => y !== yA).slice(0, 3);
    if (!poolB.length) poolB = [yA];
    labelB = `直近${poolB.length}年平均`;
  } else {
    const yBNum = Number(valB);
    poolB = [years.includes(yBNum) ? yBNum : years[0]];
    labelB = `${poolB[0]}年`;
  }

  const metricMeta = {
    hours:   { label: '配信時間',     unit: 'h',  fixed1: true  },
    streams: { label: '配信回数',     unit: '回', fixed1: false },
    full:    { label: 'Full動画',     unit: '本', fixed1: false },
    short:   { label: 'Short動画',    unit: '本', fixed1: false },
    singing: { label: '歌枠回数',     unit: '回', fixed1: false },
    songs:   { label: '歌唱曲数',     unit: '曲', fixed1: false },
    events:  { label: 'イベント回数', unit: '回', fixed1: false }
  }[metric] || { label: '配信時間', unit: 'h', fixed1: true };

  const arrA = (matrix[yA] && matrix[yA][metric]) ? matrix[yA][metric].slice() : Array(12).fill(0);
  const arrB = Array.from({ length: 12 }, (_, mi) => {
    const sum = poolB.reduce((acc, y) => acc + ((matrix[y] && matrix[y][metric] && matrix[y][metric][mi]) || 0), 0);
    return Math.round((sum / Math.max(1, poolB.length)) * 10) / 10;
  });

  let lastActiveM = 0;
  for (let i = 11; i >= 0; i--) {
    if ((matrix[yA]?.hoursSec[i] || 0) > 0 || (matrix[yA]?.streams[i] || 0) > 0 || (matrix[yA]?.full[i] || 0) > 0 || (matrix[yA]?.events[i] || 0) > 0) {
      lastActiveM = i + 1;
      break;
    }
  }
  const cmpMonths = lastActiveM || 12;
  const sumA = arrA.slice(0, cmpMonths).reduce((a, b) => a + b, 0);
  const sumBSame = arrB.slice(0, cmpMonths).reduce((a, b) => a + b, 0);
  const sumBAll = arrB.reduce((a, b) => a + b, 0);
  const fmtVal = v => metricMeta.fixed1 ? v.toFixed(1) : (Number.isInteger(v) ? String(v) : v.toFixed(1));

  let pctText = '-';
  let pctColor = 'text-slate-500';
  if (sumBSame > 0) {
    const pct = ((sumA - sumBSame) / sumBSame) * 100;
    pctText = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    pctColor = pct >= 0 ? 'text-emerald-600' : 'text-rose-500';
  } else if (sumA > 0) {
    pctText = '+100%↑';
    pctColor = 'text-emerald-600';
  }

  const statsBar = document.getElementById('cmpStatsBar');
  if (statsBar) {
    statsBar.innerHTML = `
      <div>
        <div class="text-[10px] text-slate-400 font-bold">${yA}年</div>
        <div class="text-sm font-black text-purple-700">${fmtVal(sumA)}${metricMeta.unit}</div>
      </div>
      <div>
        <div class="text-[10px] text-slate-400 font-bold">${escapeHtml(labelB)}</div>
        <div class="text-sm font-black text-sky-600">${fmtVal(sumBAll)}${metricMeta.unit}</div>
      </div>
      <div>
        <div class="text-[10px] text-slate-400 font-bold">同期間 比</div>
        <div class="text-sm font-black ${pctColor}">${pctText}</div>
      </div>
    `;
  }

  const monthsLabel = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  createChart('archiveCompare', 'chartArchiveCompare', {
    type: 'bar',
    data: {
      labels: monthsLabel,
      datasets: [
        { label: `${yA}年`, data: arrA, backgroundColor: '#9333ea', borderRadius: 4, maxBarThickness: 18 },
        { label: labelB, data: arrB, backgroundColor: '#0ea5e9', borderRadius: 4, maxBarThickness: 18 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        const dsIdx = elems[0].datasetIndex;
        const targetYears = dsIdx === 0 ? [yA] : poolB;
        const targetLbl = dsIdx === 0 ? `${yA}年${m}月` : `${labelB} ${m}月`;
        if (metric === 'full') {
          showVideoDetailModal(`🎬 ${targetLbl} Full動画一覧`, appData.fullVideos.filter(v => targetYears.includes(v.year) && v.month === m), 'full');
        } else if (metric === 'short') {
          showVideoDetailModal(`📱 ${targetLbl} Short動画一覧`, appData.shortVideos.filter(v => targetYears.includes(v.year) && v.month === m), 'short');
        } else if (metric === 'singing') {
          showStreamDetailModal(`🎤 ${targetLbl} 歌枠一覧`, appData.streams.filter(s => targetYears.includes(s.year) && s.month === m && isSingingStream(s)));
        } else if (metric === 'songs') {
          showSetlistDetailModal(`🎵 ${targetLbl} 歌唱曲一覧`, appData.setlist.filter(r => !isSetlistRowExcluded(r) && targetYears.includes(r.year) && r.month === m));
        } else if (metric === 'events') {
          showEventDetailModal(`🎪 ${targetLbl} イベント一覧`, appData.events.filter(e => targetYears.includes(e.year) && e.month === m));
        } else {
          showStreamDetailModal(`🎙️ ${targetLbl} 配信一覧`, appData.streams.filter(s => targetYears.includes(s.year) && s.month === m));
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  const radarAxes = [
    { key: 'hours',       label: '配信時間',              unit: 'h',  fixed1: true  },
    { key: 'streams',     label: '配信回数',              unit: '回', fixed1: false },
    { key: 'full',        label: 'Full動画',              unit: '本', fixed1: false },
    { key: 'short',       label: 'Short動画',             unit: '本', fixed1: false },
    { key: 'songs',       label: '歌枠・歌唱曲数',         unit: '曲', fixed1: false },
    { key: 'radarEvents', label: 'イベント', unit: '回', fixed1: false }
  ];

  const getYearTotal = (y, k) => {
    if (!matrix[y] || !matrix[y][k]) return 0;
    const s = matrix[y][k].reduce((a, b) => a + b, 0);
    return Math.round(s * 10) / 10;
  };

  const rawA = radarAxes.map(ax => getYearTotal(yA, ax.key));
  const rawB = radarAxes.map(ax => {
    const s = poolB.reduce((acc, y) => acc + getYearTotal(y, ax.key), 0);
    return Math.round((s / Math.max(1, poolB.length)) * 10) / 10;
  });
  const maxAll = radarAxes.map(ax => Math.max(1, ...years.map(y => getYearTotal(y, ax.key))));
  const maxPair = radarAxes.map((_, idx) => Math.max(1, rawA[idx], rawB[idx]));
  const baseMax = radarScaleMode === 'pair' ? maxPair : maxAll;

  const scoreA = rawA.map((v, i) => Math.min(100, Math.round((v / baseMax[i]) * 100)));
  const scoreB = rawB.map((v, i) => Math.min(100, Math.round((v / baseMax[i]) * 100)));

  createChart('archiveRadar', 'chartArchiveRadar', {
    type: 'radar',
    data: {
      labels: radarAxes.map(a => a.label),
      datasets: [
        {
          label: `${yA}年`,
          data: scoreA,
          borderColor: '#9333ea',
          backgroundColor: 'rgba(147, 51, 234, 0.22)',
          borderWidth: 2,
          pointBackgroundColor: '#9333ea',
          pointRadius: 3
        },
        {
          label: labelB,
          data: scoreB,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.16)',
          borderWidth: 2,
          borderDash: [4, 3],
          pointBackgroundColor: '#0ea5e9',
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const idx = elems[0].index;
        const dsIdx = elems[0].datasetIndex;
        const ax = radarAxes[idx];
        const targetYears = dsIdx === 0 ? [yA] : poolB;
        const targetLbl = dsIdx === 0 ? `${yA}年` : labelB;
        if (ax.key === 'full') {
          showVideoDetailModal(`🎬 ${targetLbl} Full動画一覧`, appData.fullVideos.filter(v => targetYears.includes(v.year)), 'full');
        } else if (ax.key === 'short') {
          showVideoDetailModal(`📱 ${targetLbl} Short動画一覧`, appData.shortVideos.filter(v => targetYears.includes(v.year)), 'short');
        } else if (ax.key === 'songs') {
          showSetlistDetailModal(`🎵 ${targetLbl} 歌唱曲一覧`, appData.setlist.filter(r => !isSetlistRowExcluded(r) && targetYears.includes(r.year)));
        } else if (ax.key === 'radarEvents') {
          showEventDetailModal(`🎪 ${targetLbl} イベント一覧`, appData.events.filter(e => targetYears.includes(e.year) && isRadarTargetEvent(e)));
        } else {
          showStreamDetailModal(`🎙️ ${targetLbl} 配信一覧`, appData.streams.filter(s => targetYears.includes(s.year)));
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const idx = ctx.dataIndex;
              const ax = radarAxes[idx];
              const val = ctx.datasetIndex === 0 ? rawA[idx] : rawB[idx];
              const valStr = ax.fixed1 ? val.toFixed(1) : (Number.isInteger(val) ? val : val.toFixed(1));
              return `${ctx.dataset.label}: ${ctx.parsed.r}%（${valStr}${ax.unit}）`;
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 100,
          ticks: { stepSize: 25, font: { size: 9 }, backdropColor: 'transparent' },
          pointLabels: { font: { size: 10, weight: 'bold' }, color: '#334155' },
          grid: { color: '#e2e8f0' },
          angleLines: { color: '#e2e8f0' }
        }
      }
    }
  });

  renderStyleShiftCharts(years, yA, poolB, labelB);
}

function renderStyleShiftCharts(yearsDesc, yA, poolB, labelB) {
  const yearsAsc = yearsDesc.slice().sort((a, b) => a - b);
  const badgeEl = document.getElementById('stylePairBadge');
  if (badgeEl) badgeEl.textContent = `${yA}年 vs ${labelB}`;

  let categories = [];
  let unit = '回';
  const countByYearCat = {};
  yearsAsc.forEach(y => { countByYearCat[y] = {}; });

  if (styleShiftMode === 'time') {
    unit = '回';
    const orderedBands = TIME_BANDS.slice().reverse();
    categories = orderedBands.map(tb => ({ key: tb.key, label: tb.label, color: tb.color }));
    appData.streams.forEach(s => {
      if (s.isError || !countByYearCat[s.year]) return;
      const k = getTimeBandKey(s.hour);
      countByYearCat[s.year][k] = (countByYearCat[s.year][k] || 0) + 1;
    });
  } else if (styleShiftMode === 'duration') {
    unit = '回';
    const globalDurCnt = {};
    appData.streams.forEach(s => {
      if (s.isError || !countByYearCat[s.year]) return;
      const k = getDurationBandKey(getStreamSeconds(s));
      globalDurCnt[k] = (globalDurCnt[k] || 0) + 1;
      countByYearCat[s.year][k] = (countByYearCat[s.year][k] || 0) + 1;
    });
    const activeBands = DURATION_BANDS.filter(b => (globalDurCnt[b.key] || 0) > 0);
    categories = (activeBands.length ? activeBands : DURATION_BANDS.slice(0, 5)).map(b => ({
      key: b.key, label: b.label, color: b.color
    }));
  } else if (styleShiftMode === 'streamCat') {
    unit = '件';
    const globalTagCnt = {};
    appData.streams.forEach(s => {
      if (s.isError || !countByYearCat[s.year]) return;
      const tags = (s.tags && s.tags.length ? s.tags : ['雑談']);
      tags.forEach(t => {
        const k = String(t || '').trim() || '雑談';
        globalTagCnt[k] = (globalTagCnt[k] || 0) + 1;
        countByYearCat[s.year][k] = (countByYearCat[s.year][k] || 0) + 1;
      });
    });
    const allTags = Object.entries(globalTagCnt)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
    categories = (allTags.length ? allTags : ['雑談']).map(t => ({
      key: t, label: t, color: getStreamCatColor(t)
    }));
  } else if (styleShiftMode === 'eventChannel') {
    unit = '回';
    const globalEvTypeCnt = {};
    appData.events.forEach(e => {
      if (!countByYearCat[e.year]) return;
      const tp = String(e.type || '').trim() || 'その他';
      globalEvTypeCnt[tp] = (globalEvTypeCnt[tp] || 0) + 1;
      countByYearCat[e.year][tp] = (countByYearCat[e.year][tp] || 0) + 1;
    });
    const allEvTypes = Object.entries(globalEvTypeCnt)
      .sort((a, b) => b[1] - a[1])
      .map(([tp]) => tp);
    categories = (allEvTypes.length ? allEvTypes : ['ライブ', 'リリイベ', 'ファンミ', '特典会']).map(tp => ({
      key: tp, label: tp, color: getEventTypeColor(tp)
    }));
  } else if (styleShiftMode === 'fullType') {
    unit = '本';
    const globalTypeCnt = {};
    appData.fullVideos.forEach(v => {
      if (isFullVideoExcluded(v) || !countByYearCat[v.year]) return;
      const tp = (v.type || 'Solo').trim();
      globalTypeCnt[tp] = (globalTypeCnt[tp] || 0) + 1;
      countByYearCat[v.year][tp] = (countByYearCat[v.year][tp] || 0) + 1;
    });
    const sortedTypes = Object.entries(globalTypeCnt).sort((a, b) => b[1] - a[1]).map(([tp]) => tp);
    categories = (sortedTypes.length ? sortedTypes : ['Solo', 'Collab', 'Original', 'Live action']).map(tp => ({
      key: tp, label: tp, color: getFullTypeColor(tp)
    }));
  }

  const calcPoolStats = (yrList) => {
    const rawCounts = categories.map(cat =>
      yrList.reduce((sum, y) => sum + ((countByYearCat[y] && countByYearCat[y][cat.key]) || 0), 0)
    );
    const total = rawCounts.reduce((a, b) => a + b, 0);
    const pcts = rawCounts.map(c => (total > 0 ? Math.round((c / total) * 1000) / 10 : 0));
    const avgCounts = rawCounts.map(c => Math.round((c / Math.max(1, yrList.length)) * 10) / 10);
    return { pcts, rawCounts, avgCounts, total };
  };

  const statsA = calcPoolStats([yA]);
  const statsB = calcPoolStats(poolB);
  const valsA = statsA.rawCounts;
  const valsB = poolB.length > 1 ? statsB.avgCounts : statsB.rawCounts;

  const pairWrap = document.getElementById('styleComparePairWrap');
  if (pairWrap) {
    pairWrap.style.height = `${Math.max(224, categories.length * 30)}px`;
  }

  const openStyleDetail = (targetYears, targetLabel, catObj) => {
    const titleSuffix = catObj ? `「${catObj.label}」` : '';
    if (styleShiftMode === 'time') {
      const list = appData.streams.filter(s =>
        !s.isError && targetYears.includes(s.year) && (!catObj || getTimeBandKey(s.hour) === catObj.key)
      );
      showStreamDetailModal(`🕐 ${targetLabel} 時間帯${titleSuffix} 配信一覧`, list);
    } else if (styleShiftMode === 'duration') {
      const list = appData.streams.filter(s =>
        !s.isError && targetYears.includes(s.year) && (!catObj || getDurationBandKey(getStreamSeconds(s)) === catObj.key)
      );
      showStreamDetailModal(`⏱️ ${targetLabel} 配信時間${titleSuffix} 配信一覧`, list);
    } else if (styleShiftMode === 'streamCat') {
      const list = appData.streams.filter(s => {
        if (s.isError || !targetYears.includes(s.year)) return false;
        if (!catObj) return true;
        const tags = (s.tags && s.tags.length ? s.tags : ['雑談']).map(t => String(t || '').trim() || '雑談');
        return tags.includes(catObj.key);
      });
      showStreamDetailModal(`🎙️ ${targetLabel} カテゴリ${titleSuffix} 配信一覧`, list);
    } else if (styleShiftMode === 'eventChannel') {
      const list = appData.events.filter(e => {
        if (!targetYears.includes(e.year)) return false;
        if (!catObj) return true;
        const tp = String(e.type || '').trim() || 'その他';
        return tp === catObj.key;
      });
      showEventDetailModal(`🎪 ${targetLabel} イベント種別${titleSuffix} 一覧`, list);
    } else if (styleShiftMode === 'fullType') {
      const list = appData.fullVideos.filter(v =>
        targetYears.includes(v.year) && (!catObj || (v.type || 'Solo').trim() === catObj.key)
      );
      showVideoDetailModal(`🎬 ${targetLabel} Full動画${titleSuffix} 一覧`, list, 'full');
    }
  };

  createChart('styleComparePair', 'chartStyleComparePair', {
    type: 'bar',
    data: {
      labels: categories.map(c => c.label),
      datasets: [
        { label: `${yA}年`, data: valsA, backgroundColor: '#9333ea', borderRadius: 4, maxBarThickness: 14 },
        { label: labelB, data: valsB, backgroundColor: '#0ea5e9', borderRadius: 4, maxBarThickness: 14 }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const catIdx = elems[0].index;
        const dsIdx = elems[0].datasetIndex;
        const targetYears = dsIdx === 0 ? [yA] : poolB;
        const targetLabel = dsIdx === 0 ? `${yA}年` : labelB;
        openStyleDetail(targetYears, targetLabel, categories[catIdx]);
      },
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const idx = ctx.dataIndex;
              const val = Number(ctx.parsed.x) || 0;
              if (ctx.datasetIndex === 0) {
                const diff = Math.round((valsA[idx] - valsB[idx]) * 10) / 10;
                const diffStr = `${diff >= 0 ? '+' : ''}${diff}${unit}`;
                return `${ctx.dataset.label}: ${val}${unit}（差 ${diffStr} / 割合 ${statsA.pcts[idx]}%）`;
              }
              const prefix = poolB.length > 1 ? '年平均 ' : '';
              return `${ctx.dataset.label}: ${prefix}${val}${unit}（割合 ${statsB.pcts[idx]}%）`;
            }
          }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { font: { size: 10 }, callback: v => `${v}${unit}` }, grid: { color: '#e2e8f0' } },
        y: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#334155', autoSkip: false } }
      }
    }
  });

  const yearlyTotals = yearsAsc.map(y =>
    categories.reduce((sum, cat) => sum + ((countByYearCat[y] && countByYearCat[y][cat.key]) || 0), 0)
  );
  const trendCategories = styleShiftMode === 'time' ? categories.slice().reverse() : categories;
  const trendDatasets = trendCategories.map(cat => ({
    label: cat.label,
    data: yearsAsc.map(y => (countByYearCat[y] && countByYearCat[y][cat.key]) || 0),
    backgroundColor: cat.color,
    borderRadius: 2,
    maxBarThickness: 32
  }));

  createChart('styleYearlyTrend', 'chartStyleYearlyTrend', {
    type: 'bar',
    data: { labels: yearsAsc.map(y => `${y}年`), datasets: trendDatasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const y = yearsAsc[elems[0].index];
        const catObj = trendCategories[elems[0].datasetIndex];
        openStyleDetail([y], `${y}年`, catObj);
      },
      plugins: {
        legend: { position: 'bottom', reverse: styleShiftMode === 'time', labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const yi = ctx.dataIndex;
              const tot = yearlyTotals[yi];
              const raw = Number(ctx.parsed.y) || 0;
              const pct = tot > 0 ? Math.round((raw / tot) * 1000) / 10 : 0;
              return `${ctx.dataset.label}: ${raw}${unit}（${pct}%）`;
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 }, callback: v => `${v}${unit}` }, grid: { color: '#e2e8f0' } }
      }
    }
  });
}

