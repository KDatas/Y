// =========================================================================
// 12. TAB 4: 🎙️ 雑談・配信
// =========================================================================
function renderStreamingSection() {
  const streams = filterBySelectedYear(appData.streams);
  const validStreams = streams.filter(s => !s.isError);
  const mDiv = getActiveMonthDivisor(streams, [], [], [], []);

  const catMap = {};
  validStreams.forEach(s => {
    (s.tags && s.tags.length ? s.tags : ['その他']).forEach(t => { catMap[t] = (catMap[t] || 0) + 1; });
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const catLabels = catEntries.length ? catEntries.map(x => x[0]) : ['データなし'];
  const catVals = catEntries.length ? catEntries.map(x => x[1]) : [1];
  const catCols = catEntries.length ? catLabels.map(getStreamCatColor) : ['#e2e8f0'];

  createChart('streamCat', 'chartStreamCat', {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catVals, backgroundColor: catCols, borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      onClick: (evt, elems) => {
        if (!elems.length || !catEntries.length) return;
        const tag = catLabels[elems[0].index];
        showStreamDetailModal(`🏷️ 配信カテゴリ「${tag}」一覧`, validStreams.filter(s => (s.tags || []).includes(tag)));
      },
      plugins: { centerText: { label: '延べ', unit: '件' }, legend: { display: false } }
    }
  });
  renderCustomLegend('legendStreamCat', 'streamCat', catLabels, catVals, catCols);

  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  const tbDS = TIME_BANDS.map(tb => ({
    label: tb.label,
    data: Array.from({ length: 12 }, (_, mi) => validStreams.filter(s => s.month === mi + 1 && getTimeBandKey(s.hour) === tb.key).length),
    backgroundColor: tb.color,
    borderRadius: 2
  }));
  createChart('streamMonthly', 'chartStreamMonthly', {
    type: 'bar',
    data: { labels: months, datasets: tbDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        showStreamDetailModal(`📊 ${m}月 配信一覧`, validStreams.filter(s => s.month === m));
      },
      plugins: {
        barTotal: { enabled: true, unit: '回', summaryElId: 'streamMonthlySummary', monthDiv: mDiv },
        legend: { position: 'bottom', reverse: true, labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  renderStreamHeatmap(validStreams);

  const tagSel = document.getElementById('logTagFilter');
  if (tagSel) {
    const cur = tagSel.value;
    tagSel.innerHTML = `<option value="all">すべての種別</option>` +
      catEntries.map(([t, c]) => `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${c})</option>`).join('');
    if (cur === 'all' || catMap[cur]) tagSel.value = cur;
  }

  renderStreamLogsTable();
}

function renderStreamHeatmap(validStreams) {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  const dows = [
    { idx: 1, label: '月' }, { idx: 2, label: '火' }, { idx: 3, label: '水' },
    { idx: 4, label: '木' }, { idx: 5, label: '金' }, { idx: 6, label: '土' }, { idx: 0, label: '日' }
  ];
  const bands = TIME_BANDS.slice().reverse();
  const grid = {};
  let maxVal = 0;

  bands.forEach(b => {
    grid[b.key] = {};
    dows.forEach(d => { grid[b.key][d.idx] = []; });
  });
  validStreams.forEach(s => {
    const bk = getTimeBandKey(s.hour);
    if (grid[bk] && grid[bk][s.dow] !== undefined) {
      grid[bk][s.dow].push(s);
      if (grid[bk][s.dow].length > maxVal) maxVal = grid[bk][s.dow].length;
    }
  });

  const getHeatStyle = (cnt) => {
    if (cnt === 0) return { cls: 'heatmap-zero-hatch', style: '' };
    const ratio = maxVal > 0 ? cnt / maxVal : 0;
    let alpha = 0.16;
    if (ratio > 0.8) alpha = 0.92;
    else if (ratio > 0.6) alpha = 0.72;
    else if (ratio > 0.4) alpha = 0.52;
    else if (ratio > 0.2) alpha = 0.34;
    const txt = alpha >= 0.52 ? 'text-white' : 'text-purple-950';
    return { cls: `${txt} border border-purple-200/50`, style: `background-color:rgba(147,51,234,${alpha});` };
  };

  window._heatmapGridCache = grid;
  let html = `<table class="w-full text-[11px] border-separate border-spacing-1"><thead><tr><th class="text-left text-slate-400 font-bold px-1">時間帯</th>`;
  dows.forEach(d => { html += `<th class="text-center font-bold text-slate-600 py-0.5">${d.label}</th>`; });
  html += `</tr></thead><tbody>`;
  bands.forEach(b => {
    html += `<tr><td class="font-bold text-slate-600 whitespace-nowrap pr-1 text-[10px]">${b.label}</td>`;
    dows.forEach(d => {
      const cnt = grid[b.key][d.idx].length;
      const st = getHeatStyle(cnt);
      html += `<td class="text-center"><button onclick="openHeatmapCell('${b.key}', ${d.idx}, '${b.label}', '${d.label}曜日')" class="w-full py-2 rounded-lg font-black transition hover:scale-105 cursor-pointer ${st.cls}" style="${st.style}">${cnt}</button></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function openHeatmapCell(bandKey, dowIdx, bandLabel, dowLabel) {
  const list = (window._heatmapGridCache && window._heatmapGridCache[bandKey] && window._heatmapGridCache[bandKey][dowIdx]) || [];
  showStreamDetailModal(`🔥 ${dowLabel}・${bandLabel} の配信一覧`, list);
}

function renderStreamLogsTable() {
  const tagVal = document.getElementById('logTagFilter')?.value || 'all';
  const q = (document.getElementById('logSearchInput')?.value || '').trim().toLowerCase();
  const list = filterBySelectedYear(appData.streams)
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

