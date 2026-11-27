// =========================================================================
// 12. TAB 4: 🎙️ 配信
// =========================================================================
function setStreamViewMode(mode) {
  streamViewMode = mode;
  streamLegendAllHidden = false;
  updateStreamLegendBulkBtn();
  ['total', 'time', 'duration'].forEach(m => {
    const btn = document.getElementById(`stModeBtn-${m}`);
    if (!btn) return;
    btn.className = m === mode
      ? 'px-2.5 py-1 rounded-lg bg-purple-700 text-white shadow-sm transition cursor-pointer'
      : 'px-2.5 py-1 rounded-lg text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  });
  renderStreamingSection();
}

function updateStreamLegendBulkBtn() {
  const btn = document.getElementById('btnStreamLegendBulk');
  if (!btn) return;
  if (streamLegendAllHidden) {
    btn.textContent = '✨ すべて表示';
    btn.className = 'px-2.5 py-1 rounded-xl bg-purple-700 hover:bg-purple-800 text-white border border-purple-700 shadow-sm transition cursor-pointer';
  } else {
    btn.textContent = '🙈 一括非表示';
    btn.className = 'px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer';
  }
}

function toggleAllStreamBarDatasets() {
  streamLegendAllHidden = !streamLegendAllHidden;
  const visible = !streamLegendAllHidden;
  ['streamMonthly', 'streamHoursMonthly'].forEach(key => {
    const ch = chartInstances[key];
    if (!ch || !ch.data || !ch.data.datasets) return;
    ch.data.datasets.forEach((_, idx) => {
      ch.setDatasetVisibility(idx, visible);
    });
    ch.update();
  });

  // 円グラフ（構成比）とカスタム凡例にも連動反映
  const donut = chartInstances['streamCat'];
  if (donut && donut.data && donut.data.labels) {
    donut.data.labels.forEach((_, idx) => {
      const curVis = typeof donut.getDataVisibility === 'function' ? donut.getDataVisibility(idx) : true;
      if (curVis !== visible) {
        donut.toggleDataVisibility(idx);
      }
    });
    donut.update();
    const legendEl = document.getElementById('legendStreamCat');
    if (legendEl) {
      legendEl.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('opacity-40', !visible);
        btn.classList.toggle('line-through', !visible);
      });
    }
  }

  updateStreamLegendBulkBtn();
}

function onHeatmapAxisChange(changedSide) {
  const rowSel = document.getElementById('hmRowAxisSelect');
  const colSel = document.getElementById('hmColAxisSelect');
  if (!rowSel || !colSel) return;

  const newRow = rowSel.value;
  const newCol = colSel.value;
  if (newRow === newCol) {
    // 同じ軸を選んだ場合は自動で入れ替え
    if (changedSide === 'row') {
      colSel.value = streamHeatmapRowAxis;
    } else {
      rowSel.value = streamHeatmapColAxis;
    }
  }
  streamHeatmapRowAxis = rowSel.value;
  streamHeatmapColAxis = colSel.value;

  const streams = filterBySelectedYear(appData.streams);
  const validStreams = streams.filter(s => !s.isError);
  const catMap = {};
  validStreams.forEach(s => {
    (s.tags && s.tags.length ? s.tags : ['その他']).forEach(t => { catMap[t] = (catMap[t] || 0) + 1; });
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  renderStreamHeatmap(validStreams, catEntries);
}

function renderStreamingSection() {
  const streams = filterBySelectedYear(appData.streams);
  const validStreams = streams.filter(s => !s.isError);
  const mDiv = getActiveMonthDivisor(streams, [], [], [], []);
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

  const bulkWrap = document.getElementById('streamLegendBulkWrap');
  if (bulkWrap) bulkWrap.classList.toggle('hidden', streamViewMode === 'total');

  const modeLabels = {
    total: '総数',
    time: '時間帯別',
    category: '配信種別',
    duration: '配信あたりの時間別'
  };
  const modeLabel = modeLabels[streamViewMode] || '総数';

  const countTitleEl = document.getElementById('streamCountChartTitle');
  const hoursTitleEl = document.getElementById('streamHoursChartTitle');
  if (countTitleEl) countTitleEl.textContent = `📊 月別 配信回数（${modeLabel}）`;
  if (hoursTitleEl) hoursTitleEl.textContent = `⏱️ 月別 配信時間 (h)（${modeLabel}）`;

  // タグ集計（ログフィルター用＆種別モード用）
  const catMap = {};
  validStreams.forEach(s => {
    (s.tags && s.tags.length ? s.tags : ['その他']).forEach(t => { catMap[t] = (catMap[t] || 0) + 1; });
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // -----------------------------------------------------------------------
  // 1段目：左＝月別 配信回数 ／ 右＝月別 配信時間 (h)
  // -----------------------------------------------------------------------
  let countDS = [];
  let hoursDS = [];
  let isStacked = true;
  let reverseLegend = false;

  if (streamViewMode === 'total') {
    isStacked = false;
    countDS = [{
      label: '配信回数',
      data: Array.from({ length: 12 }, (_, mi) => validStreams.filter(s => s.month === mi + 1).length),
      backgroundColor: '#9333ea',
      borderRadius: 4,
      maxBarThickness: 28,
      _filterFn: null
    }];
    hoursDS = [{
      label: '配信時間 (h)',
      data: Array.from({ length: 12 }, (_, mi) => {
        const sec = streams.filter(s => s.month === mi + 1).reduce((a, b) => a + getStreamSeconds(b), 0);
        return Math.round((sec / 3600) * 10) / 10;
      }),
      backgroundColor: '#6366f1',
      borderRadius: 4,
      maxBarThickness: 28,
      _filterFn: null
    }];
  } else if (streamViewMode === 'time') {
    reverseLegend = true;
    const activeTimeBands = TIME_BANDS.filter(tb =>
      streams.some(s => getTimeBandKey(s.hour) === tb.key)
    );
    countDS = activeTimeBands.map(tb => ({
      label: tb.label,
      data: Array.from({ length: 12 }, (_, mi) =>
        validStreams.filter(s => s.month === mi + 1 && getTimeBandKey(s.hour) === tb.key).length
      ),
      backgroundColor: tb.color,
      borderRadius: 2,
      _filterFn: s => getTimeBandKey(s.hour) === tb.key
    }));
    hoursDS = activeTimeBands.map(tb => ({
      label: tb.label,
      data: Array.from({ length: 12 }, (_, mi) => {
        const sec = streams
          .filter(s => s.month === mi + 1 && getTimeBandKey(s.hour) === tb.key)
          .reduce((a, b) => a + getStreamSeconds(b), 0);
        return Math.round((sec / 3600) * 10) / 10;
      }),
      backgroundColor: tb.color,
      borderRadius: 2,
      _filterFn: s => getTimeBandKey(s.hour) === tb.key
    }));
  } else if (streamViewMode === 'category') {
    // その他でまとめず、該当する全種別を表示（主タグベースで件数・時間を集計）
    const primaryCountMap = {};
    streams.forEach(s => {
      const p = (s.tags && s.tags.length ? s.tags[0] : 'その他');
      primaryCountMap[p] = (primaryCountMap[p] || 0) + 1;
    });
    const allPrimaryTags = Object.entries(primaryCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(x => x[0]);
    const tagGroups = allPrimaryTags.length ? allPrimaryTags : ['雑談'];

    countDS = tagGroups.map(grp => ({
      label: grp,
      data: Array.from({ length: 12 }, (_, mi) =>
        validStreams.filter(s => s.month === mi + 1 && (s.tags && s.tags.length ? s.tags[0] : 'その他') === grp).length
      ),
      backgroundColor: getStreamCatColor(grp),
      borderRadius: 2,
      _filterFn: s => (s.tags && s.tags.length ? s.tags[0] : 'その他') === grp
    }));
    hoursDS = tagGroups.map(grp => ({
      label: grp,
      data: Array.from({ length: 12 }, (_, mi) => {
        const sec = streams
          .filter(s => s.month === mi + 1 && (s.tags && s.tags.length ? s.tags[0] : 'その他') === grp)
          .reduce((a, b) => a + getStreamSeconds(b), 0);
        return Math.round((sec / 3600) * 10) / 10;
      }),
      backgroundColor: getStreamCatColor(grp),
      borderRadius: 2,
      _filterFn: s => (s.tags && s.tags.length ? s.tags[0] : 'その他') === grp
    }));
  } else if (streamViewMode === 'duration') {
    const activeBands = DURATION_BANDS.filter(b =>
      streams.some(s => getDurationBandKey(getStreamSeconds(s)) === b.key)
    );
    countDS = activeBands.map(db => ({
      label: db.label,
      data: Array.from({ length: 12 }, (_, mi) =>
        validStreams.filter(s => s.month === mi + 1 && getDurationBandKey(getStreamSeconds(s)) === db.key).length
      ),
      backgroundColor: db.color,
      borderRadius: 2,
      _filterFn: s => getDurationBandKey(getStreamSeconds(s)) === db.key
    }));
    hoursDS = activeBands.map(db => ({
      label: db.label,
      data: Array.from({ length: 12 }, (_, mi) => {
        const sec = streams
          .filter(s => s.month === mi + 1 && getDurationBandKey(getStreamSeconds(s)) === db.key)
          .reduce((a, b) => a + getStreamSeconds(b), 0);
        return Math.round((sec / 3600) * 10) / 10;
      }),
      backgroundColor: db.color,
      borderRadius: 2,
      _filterFn: s => getDurationBandKey(getStreamSeconds(s)) === db.key
    }));
  }

  createChart('streamMonthly', 'chartStreamMonthly', {
    type: 'bar',
    data: { labels: months, datasets: countDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        const ds = countDS[elems[0].datasetIndex];
        let filtered = validStreams.filter(s => s.month === m);
        let title = `📊 ${m}月 配信一覧`;
        if (ds && typeof ds._filterFn === 'function') {
          filtered = filtered.filter(ds._filterFn);
          title = `📊 ${m}月「${ds.label}」配信一覧`;
        }
        showStreamDetailModal(title, filtered);
      },
      plugins: {
        barTotal: { enabled: true, unit: '回', summaryElId: 'streamMonthlySummary', monthDiv: mDiv },
        legend: {
          display: streamViewMode !== 'total',
          position: 'bottom',
          reverse: reverseLegend,
          labels: { font: { size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: { stacked: isStacked, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: isStacked, beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  createChart('streamHoursMonthly', 'chartStreamHoursMonthly', {
    type: 'bar',
    data: { labels: months, datasets: hoursDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        const ds = hoursDS[elems[0].datasetIndex];
        let filtered = streams.filter(s => s.month === m);
        let title = `⏱️ ${m}月 配信一覧`;
        if (ds && typeof ds._filterFn === 'function') {
          filtered = filtered.filter(ds._filterFn);
          title = `⏱️ ${m}月「${ds.label}」配信一覧`;
        }
        showStreamDetailModal(title, filtered);
      },
      plugins: {
        barTotal: { enabled: true, fixed1: true, unit: 'h', summaryElId: 'streamHoursSummary', monthDiv: mDiv },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${(Number(ctx.parsed.y) || 0).toFixed(1)}h`
          }
        },
        legend: {
          display: streamViewMode !== 'total',
          position: 'bottom',
          reverse: reverseLegend,
          labels: { font: { size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: { stacked: isStacked, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: isStacked, beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  // -----------------------------------------------------------------------
  // 2段目左：構成比ドーナツチャート（モード連動）
  // -----------------------------------------------------------------------
  const catTitleEl = document.getElementById('streamCatTitle');
  let donutLabels = [];
  let donutVals = [];
  let donutCols = [];
  let donutCenterLabel = '合計';
  let donutUnit = '回';
  let onDonutClick = null;

  if (streamViewMode === 'time') {
    if (catTitleEl) catTitleEl.textContent = '🕐 時間帯別 配信構成比';
    const ordered = TIME_BANDS.slice().reverse();
    const entries = ordered
      .map(tb => [tb.label, validStreams.filter(s => getTimeBandKey(s.hour) === tb.key).length, tb.color, tb.key])
      .filter(e => e[1] > 0);
    const hasAny = entries.length > 0;
    donutLabels = hasAny ? entries.map(e => e[0]) : ['データなし'];
    donutVals = hasAny ? entries.map(e => e[1]) : [1];
    donutCols = hasAny ? entries.map(e => e[2]) : ['#e2e8f0'];
    onDonutClick = idx => {
      if (!hasAny) return;
      const e = entries[idx];
      showStreamDetailModal(`🕐 時間帯「${e[0]}」配信一覧`, validStreams.filter(s => getTimeBandKey(s.hour) === e[3]));
    };
  } else if (streamViewMode === 'duration') {
    if (catTitleEl) catTitleEl.textContent = '⏱️ 配信あたりの時間 構成比';
    const activeBands = DURATION_BANDS.filter(b =>
      validStreams.some(s => getDurationBandKey(getStreamSeconds(s)) === b.key)
    );
    const entries = activeBands.map(db => [db.label, validStreams.filter(s => getDurationBandKey(getStreamSeconds(s)) === db.key).length, db.color, db.key]);
    const hasAny = entries.length > 0;
    donutLabels = hasAny ? entries.map(e => e[0]) : ['データなし'];
    donutVals = hasAny ? entries.map(e => e[1]) : [1];
    donutCols = hasAny ? entries.map(e => e[2]) : ['#e2e8f0'];
    onDonutClick = idx => {
      if (!hasAny) return;
      const e = entries[idx];
      showStreamDetailModal(`⏱️ 配信時間「${e[0]}」一覧`, validStreams.filter(s => getDurationBandKey(getStreamSeconds(s)) === e[3]));
    };
  } else {
    if (catTitleEl) catTitleEl.textContent = '🏷️ 配信カテゴリ構成比';
    donutCenterLabel = '延べ';
    donutUnit = '件';
    donutLabels = catEntries.length ? catEntries.map(x => x[0]) : ['データなし'];
    donutVals = catEntries.length ? catEntries.map(x => x[1]) : [1];
    donutCols = catEntries.length ? donutLabels.map(getStreamCatColor) : ['#e2e8f0'];
    onDonutClick = idx => {
      if (!catEntries.length) return;
      const tag = donutLabels[idx];
      showStreamDetailModal(`🏷️ 配信カテゴリ「${tag}」一覧`, validStreams.filter(s => (s.tags || []).includes(tag)));
    };
  }

  createChart('streamCat', 'chartStreamCat', {
    type: 'doughnut',
    data: { labels: donutLabels, datasets: [{ data: donutVals, backgroundColor: donutCols, borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      onClick: (evt, elems) => {
        if (!elems.length || !onDonutClick) return;
        onDonutClick(elems[0].index);
      },
      plugins: { centerText: { label: donutCenterLabel, unit: donutUnit }, legend: { display: false } }
    }
  });
  renderCustomLegend('legendStreamCat', 'streamCat', donutLabels, donutVals, donutCols);

  // -----------------------------------------------------------------------
  // 2段目右：ヒートマップ（モード連動 ＋ 総数モード時は軸を自由切替）
  // -----------------------------------------------------------------------
  renderStreamHeatmap(validStreams, catEntries);

  // -----------------------------------------------------------------------
  // 3段目：配信詳細ログ
  // -----------------------------------------------------------------------
  const tagSel = document.getElementById('logTagFilter');
  if (tagSel) {
    const cur = tagSel.value;
    tagSel.innerHTML = `<option value="all">すべての種別</option>` +
      catEntries.map(([t, c]) => `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${c})</option>`).join('');
    if (cur === 'all' || catMap[cur]) tagSel.value = cur;
  }

  renderStreamLogsTable();
}

function getHeatmapAxisItems(axisKey, validStreams, catEntries) {
  if (axisKey === 'dow') {
    const dows = [
      { key: '1', label: '月', short: '月', dowIdx: 1 },
      { key: '2', label: '火', short: '火', dowIdx: 2 },
      { key: '3', label: '水', short: '水', dowIdx: 3 },
      { key: '4', label: '木', short: '木', dowIdx: 4 },
      { key: '5', label: '金', short: '金', dowIdx: 5 },
      { key: '6', label: '土', short: '土', dowIdx: 6, isSat: true },
      { key: '0', label: '日', short: '日', dowIdx: 0, isSun: true }
    ];
    return {
      axisName: '曜日',
      items: dows.map(d => ({
        key: d.key,
        label: d.label,
        isSat: !!d.isSat,
        isSun: !!d.isSun,
        match: s => s.dow === d.dowIdx
      }))
    };
  }
  if (axisKey === 'time') {
    const active = TIME_BANDS.slice().reverse().filter(b =>
      validStreams.some(s => getTimeBandKey(s.hour) === b.key)
    );
    return {
      axisName: '時間帯',
      items: active.map(b => ({
        key: b.key,
        label: b.label,
        match: s => getTimeBandKey(s.hour) === b.key
      }))
    };
  }
  if (axisKey === 'duration') {
    const active = DURATION_BANDS.filter(b =>
      validStreams.some(s => getDurationBandKey(getStreamSeconds(s)) === b.key)
    );
    return {
      axisName: '配信時間',
      items: active.map(db => ({
        key: db.key,
        label: db.label,
        match: s => getDurationBandKey(getStreamSeconds(s)) === db.key
      }))
    };
  }
  // category
  const allTags = (catEntries || []).map(x => x[0]);
  return {
    axisName: '配信種別',
    items: (allTags.length ? allTags : ['雑談']).map(t => ({
      key: t,
      label: t,
      match: s => (s.tags && s.tags.length ? s.tags : ['その他']).includes(t)
    }))
  };
}

function renderStreamHeatmap(validStreams, catEntries) {
  const container = document.getElementById('heatmapContainer');
  const titleEl = document.getElementById('streamHeatmapTitle');
  const axisWrap = document.getElementById('streamHeatmapAxisWrap');
  if (!container) return;

  let rowAxisKey = 'time';
  let colAxisKey = 'dow';

  if (streamViewMode === 'total') {
    if (axisWrap) axisWrap.classList.remove('hidden');
    const rowSel = document.getElementById('hmRowAxisSelect');
    const colSel = document.getElementById('hmColAxisSelect');
    if (rowSel) rowSel.value = streamHeatmapRowAxis;
    if (colSel) colSel.value = streamHeatmapColAxis;
    rowAxisKey = streamHeatmapRowAxis;
    colAxisKey = streamHeatmapColAxis;
  } else {
    if (axisWrap) axisWrap.classList.add('hidden');
    colAxisKey = 'dow';
    rowAxisKey = streamViewMode === 'category' ? 'category' : (streamViewMode === 'duration' ? 'duration' : 'time');
  }

  const rowDef = getHeatmapAxisItems(rowAxisKey, validStreams, catEntries);
  const colDef = getHeatmapAxisItems(colAxisKey, validStreams, catEntries);

  if (titleEl) {
    titleEl.textContent = streamViewMode === 'total'
      ? '🔥 配信ヒートマップ'
      : `🔥 ${colDef.axisName} × ${rowDef.axisName} 配信ヒートマップ`;
  }

  const grid = {};
  let maxVal = 0;

  rowDef.items.forEach(r => {
    grid[r.key] = {};
    colDef.items.forEach(c => { grid[r.key][c.key] = []; });
  });

  validStreams.forEach(s => {
    rowDef.items.forEach(r => {
      if (!r.match(s)) return;
      colDef.items.forEach(c => {
        if (c.match(s)) {
          grid[r.key][c.key].push(s);
          if (grid[r.key][c.key].length > maxVal) maxVal = grid[r.key][c.key].length;
        }
      });
    });
  });

  // 非ゼロの全セル値を昇順ソートし、等量分配（分位数）で5段階ランク付け
  const nonZeroVals = [];
  rowDef.items.forEach(r => {
    colDef.items.forEach(c => {
      const n = grid[r.key][c.key].length;
      if (n > 0) nonZeroVals.push(n);
    });
  });
  nonZeroVals.sort((a, b) => a - b);

  const getHeatStyle = (cnt) => {
    if (cnt === 0) return { cls: 'heatmap-zero-hatch', style: '' };
    const total = nonZeroVals.length;
    let pct = 1;
    if (total > 1) {
      const firstIdx = nonZeroVals.indexOf(cnt);
      const lastIdx = nonZeroVals.lastIndexOf(cnt);
      const avgRank = (firstIdx + lastIdx) / 2;
      pct = avgRank / (total - 1);
    }
    let alpha = 0.16;
    if (pct >= 0.8) alpha = 0.92;
    else if (pct >= 0.6) alpha = 0.72;
    else if (pct >= 0.4) alpha = 0.52;
    else if (pct >= 0.2) alpha = 0.34;
    const txt = alpha >= 0.52 ? 'text-white' : 'text-purple-950';
    return { cls: `${txt} border border-purple-200/50`, style: `background-color:rgba(147,51,234,${alpha});` };
  };

  window._heatmapGridCache = grid;

  let html = `<table class="w-full text-[11px] border-separate border-spacing-1"><thead><tr><th class="sticky top-0 z-10 bg-white text-left text-slate-400 font-bold px-1 py-1 whitespace-nowrap">${escapeHtml(rowDef.axisName)}</th>`;
  colDef.items.forEach(c => {
    const thCls = c.isSat
      ? 'text-sky-600 border-b-2 border-sky-400/70'
      : (c.isSun ? 'text-rose-600 border-b-2 border-rose-400/70' : 'text-slate-600');
    html += `<th class="sticky top-0 z-10 bg-white text-center font-black py-1 px-1 whitespace-nowrap ${thCls}">${escapeHtml(c.label)}</th>`;
  });
  html += `</tr></thead><tbody>`;

  rowDef.items.forEach(r => {
    const safeRKey = escapeHtml(r.key).replace(/'/g, "\'");
    const safeRLabel = escapeHtml(r.label).replace(/'/g, "\'");
    const rowTdCls = r.isSat
      ? 'text-sky-600 border-l-2 border-sky-400/70 pl-1.5 pr-1'
      : (r.isSun ? 'text-rose-600 border-l-2 border-rose-400/70 pl-1.5 pr-1' : 'text-slate-600 pr-1');

    html += `<tr><td class="font-bold whitespace-nowrap text-[10px] ${rowTdCls}">${escapeHtml(r.label)}</td>`;
    colDef.items.forEach(c => {
      const safeCKey = escapeHtml(c.key).replace(/'/g, "\'");
      const safeCLabel = escapeHtml(c.label).replace(/'/g, "\'");
      const cnt = grid[r.key][c.key].length;
      const st = getHeatStyle(cnt);
      html += `<td class="text-center"><button onclick="openHeatmapCell('${safeRKey}', '${safeCKey}', '${safeRLabel}', '${safeCLabel}')" class="w-full py-1.5 px-1 rounded-lg font-black transition hover:scale-105 cursor-pointer ${st.cls}" style="${st.style}">${cnt}</button></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function openHeatmapCell(rowKey, colKey, rowLabel, colLabel) {
  const list = (window._heatmapGridCache && window._heatmapGridCache[rowKey] && window._heatmapGridCache[rowKey][colKey]) || [];
  showStreamDetailModal(`🔥 ${rowLabel} × ${colLabel} の配信一覧`, list);
}

function setStreamLogMonthFilter(m) {
  streamLogMonthFilter = m;
  renderStreamLogsTable();
}

function renderStreamLogMonthPills(yearStreams) {
  const wrap = document.getElementById('streamLogMonthPills');
  if (!wrap) return;
  const counts = {};
  yearStreams.forEach(s => {
    if (s.month >= 1 && s.month <= 12) counts[s.month] = (counts[s.month] || 0) + 1;
  });
  const activeCls = 'px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-700 text-white shadow-sm transition cursor-pointer';
  const idleCls = 'px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  const emptyCls = 'px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:bg-slate-50 transition cursor-pointer opacity-60';

  let html = `<button type="button" onclick="setStreamLogMonthFilter('all')" class="${streamLogMonthFilter === 'all' ? activeCls : idleCls}">全月 (${yearStreams.length})</button>`;
  for (let m = 1; m <= 12; m++) {
    const cnt = counts[m] || 0;
    const isSel = String(streamLogMonthFilter) === String(m);
    const cls = isSel ? activeCls : (cnt > 0 ? idleCls : emptyCls);
    html += `<button type="button" onclick="setStreamLogMonthFilter('${m}')" class="${cls}">${m}月</button>`;
  }
  wrap.innerHTML = html;
}

function renderStreamLogsTable() {
  const yearStreams = filterBySelectedYear(appData.streams);
  renderStreamLogMonthPills(yearStreams);

  const tagVal = document.getElementById('logTagFilter')?.value || 'all';
  const q = (document.getElementById('logSearchInput')?.value || '').trim().toLowerCase();
  const list = yearStreams
    .filter(s => streamLogMonthFilter === 'all' || String(s.month) === String(streamLogMonthFilter))
    .filter(s => tagVal === 'all' || (s.tags || []).includes(tagVal))
    .filter(s => !q || `${s.title} ${(s.tags || []).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => sortOrders.stream === 'desc' ? b.sortKey.localeCompare(a.sortKey) : a.sortKey.localeCompare(b.sortKey));

  const tbody = document.getElementById('streamLogsTableBody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">該当する配信ログがありません</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s => `
    <tr class="hover:bg-purple-50/40 ${s.isError ? 'bg-slate-50/80 text-slate-400' : ''}">
      <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(s.dateStr)}</td>
      <td class="py-1.5 px-2">${renderExcludedTitleHtml(s.title, !!s.isError, '回数除外')}</td>
      <td class="py-1.5 px-2"><div class="flex flex-wrap gap-1">${(s.tags || []).map(t => renderColoredBadge(t, getStreamCatColor(t))).join('')}</div></td>
      <td class="py-1.5 px-2 font-mono text-right whitespace-nowrap text-slate-600">${formatSecondsHMS(getStreamSeconds(s))}</td>
      <td class="py-1.5 px-1.5 text-center"><button onclick="openEditModal('stream','${s._uid}')" class="text-slate-400 hover:text-purple-700 cursor-pointer">✏️</button></td>
    </tr>
  `).join('');
}
