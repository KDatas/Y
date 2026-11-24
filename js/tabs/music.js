// =========================================================================
// 11. TAB 3: 🎵 動画・ショート
// =========================================================================
function switchCreditRanking(key) {
  activeCreditKey = key;
  ['composer', 'illustrator', 'movie', 'mix'].forEach(k => {
    const b = document.getElementById(`crBtn-${k}`);
    if (b) {
      b.className = k === key
        ? 'px-1.5 py-0.5 rounded-md bg-purple-700 text-white cursor-pointer'
        : 'px-1.5 py-0.5 rounded-md text-purple-700 hover:bg-purple-100 cursor-pointer';
    }
  });
  renderFullCreditChart();
}

function renderCustomLegend(containerId, chartKey, labels, counts, colors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!labels.length || labels[0] === 'データなし') {
    el.innerHTML = '<div class="text-slate-400 text-center py-4">データなし</div>';
    return;
  }
  el.innerHTML = labels.map((lb, idx) => `
    <button onclick="toggleDoughnutSlice('${chartKey}', ${idx}, this)" class="w-full flex items-center justify-between gap-1 px-1.5 py-0.5 rounded hover:bg-purple-50 text-left transition cursor-pointer">
      <span class="flex items-center gap-1.5 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color:${colors[idx]};"></span>
        <span class="truncate text-slate-700 font-semibold">${escapeHtml(lb)}</span>
      </span>
      <span class="font-bold text-slate-500 shrink-0">${counts[idx]}</span>
    </button>
  `).join('');
}

function toggleDoughnutSlice(chartKey, idx, btnEl) {
  const ch = chartInstances[chartKey];
  if (!ch) return;
  ch.toggleDataVisibility(idx);
  ch.update();
  if (btnEl) btnEl.classList.toggle('opacity-40');
  if (btnEl) btnEl.classList.toggle('line-through');
}

function renderMusicSection() {
  const fullsAll = filterBySelectedYear(appData.fullVideos);
  const fulls = fullsAll.filter(v => !isFullVideoExcluded(v));
  const shortsAll = filterBySelectedYear(appData.shortVideos);
  const shorts = shortsAll.filter(s => !s.isExcluded);
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  const mDiv = getActiveMonthDivisor([], fulls, shorts, [], []);

  const fullTypes = Array.from(new Set(fulls.map(v => v.type || 'Solo')));
  const fullMonthlyDS = (fullTypes.length ? fullTypes : ['Solo']).map(tp => ({
    label: tp,
    data: Array.from({ length: 12 }, (_, mi) => fulls.filter(v => (v.type || 'Solo') === tp && v.month === mi + 1).length),
    backgroundColor: getFullTypeColor(tp),
    borderRadius: 3
  }));
  createChart('fullMonthly', 'chartFullMonthly', {
    type: 'bar',
    data: { labels: months, datasets: fullMonthlyDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        showVideoDetailModal(`🎬 ${m}月 Full動画一覧`, fullsAll.filter(v => v.month === m), 'full');
      },
      plugins: {
        barTotal: { enabled: true, unit: '本', summaryElId: 'fullMonthlySummary', monthDiv: mDiv },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  const ftMap = {};
  fulls.forEach(v => { const t = v.type || 'Solo'; ftMap[t] = (ftMap[t] || 0) + 1; });
  const ftEntries = Object.entries(ftMap).sort((a, b) => b[1] - a[1]);
  createChart('fullType', 'chartFullType', {
    type: 'doughnut',
    data: {
      labels: ftEntries.length ? ftEntries.map(x => x[0]) : ['データなし'],
      datasets: [{
        data: ftEntries.length ? ftEntries.map(x => x[1]) : [1],
        backgroundColor: ftEntries.length ? ftEntries.map(x => getFullTypeColor(x[0])) : ['#e2e8f0'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      onClick: (evt, elems) => {
        if (!elems.length || !ftEntries.length) return;
        const tp = ftEntries[elems[0].index][0];
        showVideoDetailModal(`🎨 Full動画「${tp}」一覧`, fullsAll.filter(v => (v.type || 'Solo') === tp), 'full');
      },
      plugins: {
        centerText: { label: '合計', unit: '本' },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      }
    }
  });

  renderFullCreditChart();

  const shortCats = ['Full関連', 'Shortのみ'];
  const shortMonthlyDS = shortCats.map(cat => ({
    label: cat,
    data: Array.from({ length: 12 }, (_, mi) => shorts.filter(v => v.category === cat && v.month === mi + 1).length),
    backgroundColor: getShortCatColor(cat),
    borderRadius: 3
  }));
  createChart('shortMonthly', 'chartShortMonthly', {
    type: 'bar',
    data: { labels: months, datasets: shortMonthlyDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        showVideoDetailModal(`📱 ${m}月 Short動画一覧`, shortsAll.filter(v => v.month === m), 'short');
      },
      plugins: {
        barTotal: { enabled: true, unit: '本', summaryElId: 'shortMonthlySummary', monthDiv: mDiv },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  const scCounts = shortCats.map(c => shorts.filter(v => v.category === c).length);
  const hasSh = shorts.length > 0;
  createChart('shortType', 'chartShortType', {
    type: 'doughnut',
    data: {
      labels: hasSh ? shortCats : ['データなし'],
      datasets: [{
        data: hasSh ? scCounts : [1],
        backgroundColor: hasSh ? shortCats.map(getShortCatColor) : ['#e2e8f0'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      onClick: (evt, elems) => {
        if (!elems.length || !hasSh) return;
        const cat = shortCats[elems[0].index];
        showVideoDetailModal(`🏷️ Short「${cat}」一覧`, shortsAll.filter(v => v.category === cat), 'short');
      },
      plugins: {
        centerText: { label: '合計', unit: '本' },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      }
    }
  });

  const shCompMap = {};
  shorts.forEach(v => {
    splitPersonNames(v.composer).forEach(c => { shCompMap[c] = (shCompMap[c] || 0) + 1; });
  });
  const shCompEntries = Object.entries(shCompMap).sort((a, b) => b[1] - a[1]);
  const shLabels = shCompEntries.length ? shCompEntries.map(x => x[0]) : ['データなし'];
  const shVals = shCompEntries.length ? shCompEntries.map(x => x[1]) : [1];
  const shCols = shCompEntries.length ? shLabels.map(hashColor) : ['#e2e8f0'];
  createChart('shortComposers', 'chartShortComposers', {
    type: 'doughnut',
    data: { labels: shLabels, datasets: [{ data: shVals, backgroundColor: shCols, borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      onClick: (evt, elems) => {
        if (!elems.length || !shCompEntries.length) return;
        const comp = shLabels[elems[0].index];
        showVideoDetailModal(`🎼 Short 作曲者「${comp}」一覧`, shorts.filter(v => splitPersonNames(v.composer).includes(comp)), 'short');
      },
      plugins: { centerText: { label: '合計', unit: '本' }, legend: { display: false } }
    }
  });
  renderCustomLegend('legendShortComposers', 'shortComposers', shLabels, shVals, shCols);

  renderMusicTablesOnly();
}

function renderFullCreditChart() {
  const fulls = filterBySelectedYear(appData.fullVideos).filter(v => !isFullVideoExcluded(v));
  const map = {};
  fulls.forEach(v => {
    splitPersonNames(v[activeCreditKey]).forEach(name => { map[name] = (map[name] || 0) + 1; });
  });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const labels = entries.length ? entries.map(x => x[0]) : ['データなし'];
  const vals = entries.length ? entries.map(x => x[1]) : [1];
  const cols = entries.length ? labels.map(hashColor) : ['#e2e8f0'];

  createChart('fullCredits', 'chartFullCredits', {
    type: 'doughnut',
    data: { labels, datasets: [{ data: vals, backgroundColor: cols, borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      onClick: (evt, elems) => {
        if (!elems.length || !entries.length) return;
        const name = labels[elems[0].index];
        showVideoDetailModal(`✨ クレジット「${name}」関連Full動画`, fulls.filter(v => splitPersonNames(v[activeCreditKey]).includes(name)), 'full');
      },
      plugins: { centerText: { label: '合計', unit: '本' }, legend: { display: false } }
    }
  });
  renderCustomLegend('legendFullCredits', 'fullCredits', labels, vals, cols);
}

function renderMusicTablesOnly() {
  const fq = (document.getElementById('fullSearchInput')?.value || '').trim().toLowerCase();
  const fulls = filterBySelectedYear(appData.fullVideos)
    .filter(v => !fq || `${v.title} ${v.composer} ${v.vocal} ${v.type}`.toLowerCase().includes(fq))
    .sort((a, b) => sortOrders.full === 'desc' ? b.sortKey.localeCompare(a.sortKey) : a.sortKey.localeCompare(b.sortKey));

  const ftb = document.getElementById('fullTableBody');
  if (ftb) {
    ftb.innerHTML = fulls.length ? fulls.map(v => {
      const excluded = isFullVideoExcluded(v);
      return `<tr class="hover:bg-purple-50/40 ${excluded ? 'bg-slate-50/80 text-slate-400' : ''}">
        <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(v.dateStr)}</td>
        <td class="py-1.5 px-2"><div>${renderExcludedTitleHtml(v.title, excluded, '回数除外')}</div><div class="text-[10px] text-slate-400">${escapeHtml(v.vocal || '')}</div></td>
        <td class="py-1.5 px-2">${renderColoredBadge(v.type || 'Solo', getFullTypeColor(v.type))}</td>
        <td class="py-1.5 px-2 text-slate-600">${escapeHtml(v.composer || '-')}</td>
        <td class="py-1.5 px-1.5 text-center"><button onclick="openEditModal('full','${v._uid}')" class="text-slate-400 hover:text-purple-700 cursor-pointer">✏️</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="py-6 text-center text-slate-400">該当するFull動画がありません</td></tr>';
  }

  const sq = (document.getElementById('shortSearchInput')?.value || '').trim().toLowerCase();
  const shorts = filterBySelectedYear(appData.shortVideos)
    .filter(v => !sq || `${v.title} ${v.composer} ${v.platform}`.toLowerCase().includes(sq))
    .sort((a, b) => sortOrders.short === 'desc' ? b.sortKey.localeCompare(a.sortKey) : a.sortKey.localeCompare(b.sortKey));

  const stb = document.getElementById('shortTableBody');
  if (stb) {
    stb.innerHTML = shorts.length ? shorts.map(v => `
      <tr class="hover:bg-fuchsia-50/40 ${v.isExcluded ? 'bg-slate-50/80 text-slate-400' : ''}">
        <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(v.dateStr)}</td>
        <td class="py-1.5 px-2">${renderExcludedTitleHtml(v.title, !!v.isExcluded, '回数除外')}</td>
        <td class="py-1.5 px-2">${renderColoredBadge(v.category, getShortCatColor(v.category))}</td>
        <td class="py-1.5 px-2 text-slate-600"><div>${escapeHtml(v.composer || '-')}</div><div class="text-[10px] text-slate-400">${escapeHtml(v.platform || '')}</div></td>
        <td class="py-1.5 px-1.5 text-center"><button onclick="openEditModal('short','${v._uid}')" class="text-slate-400 hover:text-purple-700 cursor-pointer">✏️</button></td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="py-6 text-center text-slate-400">該当するShort動画がありません</td></tr>';
  }
}

