// =========================================================================
// 13. TAB 5: 📝 歌枠＆セトリ
// =========================================================================
function setSetlistAnalyticsScope(scope) {
  setlistAnalyticsScope = scope;
  const scopes = ['stream', 'live_all', 'live_solo', 'live_comp', 'all'];
  scopes.forEach(sc => {
    const btn = document.getElementById(`slScopeBtn-${sc}`);
    if (!btn) return;
    if (sc === scope) {
      btn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer';
    } else {
      const idleColors = {
        stream: 'text-purple-800 hover:bg-purple-100',
        live_all: 'text-purple-800 hover:bg-purple-100',
        live_solo: 'text-pink-700 hover:bg-pink-100',
        live_comp: 'text-cyan-700 hover:bg-cyan-100',
        all: 'text-slate-600 hover:bg-slate-200/70'
      };
      btn.className = `px-2.5 py-1 rounded-lg text-[11px] font-bold ${idleColors[sc]} transition cursor-pointer`;
    }
  });
  selectedSetlistTypes.clear();
  renderSingingSection();
}

function setSetlistMode(mode) {
  setlistDisplayMode = mode;
  document.getElementById('slModeBtn-unique').className = mode === 'unique'
    ? 'px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer'
    : 'px-2 py-1 rounded-lg text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  document.getElementById('slModeBtn-all').className = mode === 'all'
    ? 'px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer'
    : 'px-2 py-1 rounded-lg text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  filterSetlistDisplay();
}

function renderSingingSection() {
  const setlists = filterBySelectedYear(appData.setlist).filter(r => matchesSetlistScope(r, setlistAnalyticsScope));
  const mDiv = getActiveMonthDivisor(filterBySelectedYear(appData.streams), [], [], setlists, []);
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  const types = Array.from(new Set(setlists.map(r => normalizeSetlistType(r.type))));
  const activeTypes = types.length ? types : ['歌枠'];

  const sessDS = activeTypes.map(tp => ({
    label: tp,
    data: Array.from({ length: 12 }, (_, mi) => {
      const sessKeys = new Set();
      setlists.forEach(r => {
        if (normalizeSetlistType(r.type) === tp && r.month === mi + 1) {
          sessKeys.add(`${r.dateStr}_${r.streamTitle}`);
        }
      });
      return sessKeys.size;
    }),
    backgroundColor: getSetlistTypeColor(tp),
    borderRadius: 3
  }));
  createChart('slSessMonthly', 'chartSetlistSessionsMonthly', {
    type: 'bar',
    data: { labels: months, datasets: sessDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        showSetlistSessionsDetailModal(`🗓️ ${m}月 開催配信・LIVE一覧`, setlists.filter(r => r.month === m));
      },
      plugins: {
        barTotal: { enabled: true, unit: '回', summaryElId: 'setlistSessionsMonthlyBadge', monthDiv: mDiv },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  const songsDS = activeTypes.map(tp => ({
    label: tp,
    data: Array.from({ length: 12 }, (_, mi) => setlists.filter(r => normalizeSetlistType(r.type) === tp && r.month === mi + 1).length),
    backgroundColor: getSetlistTypeColor(tp),
    borderRadius: 3
  }));
  createChart('slSongsMonthly', 'chartSetlistMonthly', {
    type: 'bar',
    data: { labels: months, datasets: songsDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        showSetlistDetailModal(`📅 ${m}月 歌唱曲一覧`, setlists.filter(r => r.month === m));
      },
      plugins: {
        barTotal: { enabled: true, unit: '曲', summaryElId: 'setlistMonthlyBadge', monthDiv: mDiv },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  renderSetlistSummaryAndTop10();
  renderSetlistTypeFilterBar(setlists);
  filterSetlistDisplay();
  renderSetlistLogsTable();
}

function renderSetlistSummaryAndTop10() {
  const meta = getSetlistScopeMeta(setlistAnalyticsScope);
  const allInYear = filterBySelectedYear(appData.setlist);
  const scoped = allInYear.filter(r => matchesSetlistScope(r, setlistAnalyticsScope));

  const sumHeading = document.getElementById('setlistSummaryHeading');
  if (sumHeading) sumHeading.textContent = `📊 レパートリー＆初披露サマリー（${meta.short}）`;
  const topHeading = document.getElementById('topSungHeading');
  if (topHeading) topHeading.textContent = `🌟 ${meta.label} 最多歌唱曲ランキング TOP10`;

  const songMap = {};
  const sessMap = {};
  scoped.forEach(r => {
    const key = r.title.trim();
    if (!songMap[key]) songMap[key] = [];
    songMap[key].push(r);
    const sk = `${r.dateStr}_${r.streamTitle}_${normalizeSetlistType(r.type)}`;
    if (!sessMap[sk]) sessMap[sk] = { dateStr: r.dateStr, streamTitle: r.streamTitle, type: normalizeSetlistType(r.type), songs: [] };
    sessMap[sk].songs.push(r);
  });

  const uniqueSongs = Object.keys(songMap);
  const totalSongs = scoped.length;
  const stapleSongs = uniqueSongs.filter(k => songMap[k].length >= 2);
  const rareSongs = uniqueSongs.filter(k => songMap[k].length === 1);
  const staplePct = uniqueSongs.length ? Math.round((stapleSongs.length / uniqueSongs.length) * 100) : 0;
  const rarePct = uniqueSongs.length ? 100 - staplePct : 0;

  let debutSongs = [];
  let debutLabel = '初披露';
  if (selectedYear !== 'all') {
    const y = Number(selectedYear);
    debutLabel = `${y}年初披露`;
    const pastSongSet = new Set(
      appData.setlist
        .filter(r => r.year < y && matchesSetlistScope(r, setlistAnalyticsScope))
        .map(r => r.title.trim())
    );
    debutSongs = uniqueSongs.filter(k => !pastSongSet.has(k));
  } else {
    debutLabel = 'レア曲(1回)';
    debutSongs = rareSongs;
  }
  const debutPct = uniqueSongs.length ? ((debutSongs.length / uniqueSongs.length) * 100).toFixed(1) : '0.0';

  const avgByType = {};
  Object.values(sessMap).forEach(s => {
    if (!avgByType[s.type]) avgByType[s.type] = { sess: 0, songs: 0 };
    avgByType[s.type].sess += 1;
    avgByType[s.type].songs += s.songs.length;
  });
  const avgBadgesHtml = Object.entries(avgByType).map(([tp, v]) => {
    const c = getSetlistTypeColor(tp);
    const avg = (v.songs / Math.max(1, v.sess)).toFixed(1);
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background:${c}15; color:${c}; border:1px solid ${c}44;">${escapeHtml(tp)} ${avg}曲</span>`;
  }).join('');

  const maxSess = Object.values(sessMap).sort((a, b) => b.songs.length - a.songs.length)[0] || null;

  window._slSummaryCache = {
    allScoped: scoped,
    debutRows: debutSongs.flatMap(k => songMap[k]),
    stapleRows: stapleSongs.flatMap(k => songMap[k]),
    rareRows: rareSongs.flatMap(k => songMap[k]),
    maxSess
  };

  const wrap = document.getElementById('setlistSummaryCardWrap');
  if (wrap) {
    if (!totalSongs) {
      wrap.innerHTML = `<div class="py-10 text-center text-xs text-slate-400">${escapeHtml(meta.label)} のデータがありません</div>`;
    } else {
      wrap.innerHTML = `
        <div class="grid grid-cols-2 gap-2.5">
          <div onclick="showUniqueSongsDetailModal('🎵 ${escapeHtml(meta.label)} レパートリー一覧', window._slSummaryCache.allScoped)" class="rounded-xl p-2.5 bg-purple-50/70 border border-purple-100 hover:border-purple-300 transition cursor-pointer">
            <div class="text-[11px] font-bold text-purple-700">🎵 レパートリー数</div>
            <div class="mt-1 flex items-baseline justify-between">
              <div><span class="text-2xl font-black text-slate-900">${uniqueSongs.length}</span><span class="text-xs font-bold text-slate-500 ml-0.5">曲</span></div>
              <span class="text-[10px] font-semibold text-slate-400">延べ${totalSongs}曲</span>
            </div>
          </div>
          <div onclick="showUniqueSongsDetailModal('🆕 ${escapeHtml(debutLabel)} 一覧', window._slSummaryCache.debutRows)" class="rounded-xl p-2.5 bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-400 transition cursor-pointer">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-emerald-700">🆕 ${escapeHtml(debutLabel)}</span>
              <span class="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">${debutPct}%</span>
            </div>
            <div class="mt-1 flex items-baseline justify-between">
              <div><span class="text-2xl font-black text-slate-900">${debutSongs.length}</span><span class="text-xs font-bold text-slate-500 ml-0.5">曲</span></div>
              <span class="text-[10px] font-bold text-emerald-700">一覧 ›</span>
            </div>
          </div>
        </div>

        <div class="rounded-xl p-2.5 bg-slate-50/90 border border-slate-100">
          <div class="flex items-center justify-between text-[11px] font-bold mb-1.5">
            <button onclick="showUniqueSongsDetailModal('🔁 定番曲(2回〜) 一覧', window._slSummaryCache.stapleRows)" class="text-purple-700 hover:underline cursor-pointer">🔁 定番曲(2回〜) ${stapleSongs.length}曲 (${staplePct}%)</button>
            <button onclick="showUniqueSongsDetailModal('✨ レア曲(1回) 一覧', window._slSummaryCache.rareRows)" class="text-pink-600 hover:underline cursor-pointer">✨ レア曲(1回) ${rareSongs.length}曲 (${rarePct}%)</button>
          </div>
          <div class="w-full h-2.5 rounded-full bg-pink-500 overflow-hidden flex">
            <div style="width:${staplePct}%;" class="bg-purple-600 h-full"></div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span class="font-bold text-slate-500">1回平均：</span>
          ${avgBadgesHtml}
        </div>

        ${maxSess ? `
          <div onclick="showSetlistDetailModal('🔥 最多回：${escapeHtml(maxSess.streamTitle)}', window._slSummaryCache.maxSess.songs)" class="rounded-xl px-3 py-2 bg-purple-50/60 border border-purple-100 hover:border-purple-300 flex items-center justify-between gap-2 transition cursor-pointer">
            <div class="flex items-center gap-1.5 min-w-0 text-xs">
              <span class="shrink-0 font-black text-purple-700">🔥 最多回</span>
              <span class="truncate font-bold text-slate-800">${escapeHtml(maxSess.streamTitle)}</span>
            </div>
            <span class="shrink-0 text-xs font-black text-purple-700">${maxSess.songs.length}曲 ›</span>
          </div>
        ` : ''}
      `;
    }
  }

  const sortedSongs = Object.entries(songMap).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ja'));
  const topList = [];
  let rank = 1;
  for (let i = 0; i < sortedSongs.length; i++) {
    if (i > 0 && sortedSongs[i][1].length < sortedSongs[i - 1][1].length) rank = i + 1;
    if (rank > 10) break;
    topList.push({ rank, title: sortedSongs[i][0], rows: sortedSongs[i][1] });
  }
  window._slTop10Map = songMap;

  const topWrap = document.getElementById('topSungTableWrap');
  if (topWrap) {
    if (!topList.length) {
      topWrap.innerHTML = `<div class="py-10 text-center text-xs text-slate-400">ランキングデータがありません</div>`;
    } else {
      const maxCnt = topList[0].rows.length;
      topWrap.innerHTML = `<div class="space-y-1">${topList.map(item => {
        const pct = Math.max(8, Math.round((item.rows.length / maxCnt) * 100));
        let rankBadgeStyle = 'background-color:#f3e8ff; color:#7e22ce;';
        if (item.rank === 1) rankBadgeStyle = 'background-color:#eab308; color:#ffffff; box-shadow:0 1px 3px rgba(234,179,8,0.45);';
        else if (item.rank === 2) rankBadgeStyle = 'background-color:#94a3b8; color:#ffffff; box-shadow:0 1px 3px rgba(148,163,184,0.45);';
        else if (item.rank === 3) rankBadgeStyle = 'background-color:#b45309; color:#ffffff; box-shadow:0 1px 3px rgba(180,83,9,0.4);';
        return `<button onclick="openSongHistoryModal('${escapeHtml(item.title).replace(/'/g, "\\'")}')" class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 transition text-left cursor-pointer">
          <span class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-black shrink-0" style="${rankBadgeStyle}">${item.rank}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="font-bold text-slate-800 truncate">${escapeHtml(item.title)}</span>
              <span class="font-black text-purple-700 shrink-0">${item.rows.length}回</span>
            </div>
            <div class="w-full h-1.5 bg-purple-100/70 rounded-full mt-0.5 overflow-hidden">
              <div style="width:${pct}%; background-color:${meta.color};" class="h-full rounded-full"></div>
            </div>
          </div>
        </button>`;
      }).join('')}</div>`;
    }
  }
}

function openSongHistoryModal(songTitle) {
  const rows = (window._slTop10Map && window._slTop10Map[songTitle]) || [];
  showSetlistDetailModal(`🎵 「${songTitle}」 歌唱履歴`, rows);
}

function renderSetlistTypeFilterBar(setlists) {
  const bar = document.getElementById('setlistTypeFilterBar');
  if (!bar) return;
  const counts = {};
  setlists.forEach(r => {
    const tp = normalizeSetlistType(r.type);
    counts[tp] = (counts[tp] || 0) + 1;
  });
  const types = Object.keys(counts);
  if (selectedSetlistTypes.size === 0) types.forEach(t => selectedSetlistTypes.add(t));

  bar.innerHTML = types.map(tp => {
    const active = selectedSetlistTypes.has(tp);
    const c = getSetlistTypeColor(tp);
    const style = active
      ? `background-color:${c}; color:#fff; border:1px solid ${c};`
      : `background-color:#fff; color:${c}; border:1px solid ${c}66; opacity:0.55;`;
    return `<button onclick="toggleSetlistTypeFilter('${escapeHtml(tp).replace(/'/g, "\\'")}')" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer" style="${style}">${escapeHtml(tp)} (${counts[tp]})</button>`;
  }).join('');
}

function toggleSetlistTypeFilter(tp) {
  if (selectedSetlistTypes.has(tp)) {
    if (selectedSetlistTypes.size > 1) selectedSetlistTypes.delete(tp);
  } else {
    selectedSetlistTypes.add(tp);
  }
  renderSetlistTypeFilterBar(filterBySelectedYear(appData.setlist).filter(r => matchesSetlistScope(r, setlistAnalyticsScope)));
  filterSetlistDisplay();
  renderSetlistLogsTable();
}

function filterSetlistDisplay() {
  const q = (document.getElementById('setlistSearchInput')?.value || '').trim().toLowerCase();
  const filteredAll = filterBySelectedYear(appData.setlist)
    .filter(r => {
      const tp = normalizeSetlistType(r.type || '歌枠');
      const isLive = /live|ライブ/i.test(tp);
      if (setlistAnalyticsScope === 'stream' && isLive) return false;
      if (setlistAnalyticsScope === 'live_all' && !isLive) return false;
      if (setlistAnalyticsScope === 'live_solo' && !(isLive && /solo|ソロ/i.test(tp))) return false;
      if (setlistAnalyticsScope === 'live_comp' && !(isLive && /comp|コンピ|guest|ゲスト/i.test(tp))) return false;
      return true;
    })
    .filter(r => selectedSetlistTypes.size === 0 || selectedSetlistTypes.has(normalizeSetlistType(r.type)))
    .filter(r => !q || `${r.title} ${r.streamTitle} ${r.type}`.toLowerCase().includes(q));
  const filteredValid = filteredAll.filter(r => !isSetlistRowExcluded(r));

  const grid = document.getElementById('setlistCardsGrid');
  const badge = document.getElementById('setlistCountBadge');
  if (!grid) return;

  if (setlistDisplayMode === 'unique') {
    const map = {};
    filteredValid.forEach(r => {
      const k = r.title.trim();
      if (!map[k]) map[k] = [];
      map[k].push(r);
    });
    const entries = Object.entries(map).map(([title, rows]) => {
      const latest = rows.slice().sort((a, b) => b.sortKey.localeCompare(a.sortKey))[0];
      return { title, rows, latest };
    }).sort((a, b) => {
      if (b.rows.length !== a.rows.length) return b.rows.length - a.rows.length;
      const dateCmp = sortOrders.setlist === 'desc'
        ? b.latest.sortKey.localeCompare(a.latest.sortKey)
        : a.latest.sortKey.localeCompare(b.latest.sortKey);
      return dateCmp || a.title.localeCompare(b.title, 'ja');
    });
    if (badge) badge.textContent = `${entries.length}曲 (延べ${filteredValid.length}曲)`;
    window._slUniqueMap = map;
    grid.innerHTML = entries.length ? entries.map(({ title, rows, latest }) => {
      const typeCounts = {};
      rows.forEach(r => {
        const tp = normalizeSetlistType(r.type);
        typeCounts[tp] = (typeCounts[tp] || 0) + 1;
      });
      const typeBadgesHtml = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
        .map(([tp, cnt]) => {
          const tc = getSetlistTypeColor(tp);
          return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap" style="background-color:${tc}1a; color:${tc}; border:1px solid ${tc}44;">${escapeHtml(tp)} ${cnt}</span>`;
        }).join('');
      const safeTitleJs = escapeHtml(title).replace(/'/g, "\\'");
      return `<div onclick="showSetlistDetailModal('🎵 ${safeTitleJs} 歌唱履歴', window._slUniqueMap['${safeTitleJs}'])" class="rounded-xl p-2 bg-slate-50/80 hover:bg-purple-50/70 border border-slate-100 hover:border-purple-200 transition cursor-pointer flex flex-col justify-between gap-1.5">
        <div class="flex items-start justify-between gap-1">
          <span class="text-xs font-bold text-slate-800 line-clamp-2">${escapeHtml(title)}</span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 bg-purple-100/70 text-purple-700 border border-purple-200">×${rows.length}</span>
        </div>
        <div class="flex flex-wrap gap-1">${typeBadgesHtml}</div>
        <div class="text-[10px] font-mono text-slate-400 truncate">最新 ${escapeHtml(latest.dateStr)}</div>
      </div>`;
    }).join('') : '<div class="col-span-full py-8 text-center text-xs text-slate-400">該当する曲がありません</div>';
  } else {
    const sorted = filteredAll.slice().sort((a, b) =>
      sortOrders.setlist === 'desc' ? b.sortKey.localeCompare(a.sortKey) : a.sortKey.localeCompare(b.sortKey)
    );
    if (badge) badge.textContent = `${filteredValid.length}曲`;
    grid.innerHTML = sorted.length ? sorted.map(r => {
      const excluded = isSetlistRowExcluded(r);
      return `<div class="rounded-xl p-2 ${excluded ? 'bg-slate-50/80 text-slate-400' : 'bg-slate-50/80'} border border-slate-100 flex flex-col justify-between gap-1">
        <div class="flex items-start justify-between gap-1">
          <span class="text-xs line-clamp-2">${renderExcludedTitleHtml(r.title, excluded, '回数除外')}</span>
          <button onclick="openEditModal('setlist','${r._uid}')" class="text-slate-400 hover:text-purple-700 text-[11px] shrink-0 cursor-pointer">✏️</button>
        </div>
        <div class="flex items-center justify-between gap-1 text-[10px]">
          ${renderColoredBadge(normalizeSetlistType(r.type), getSetlistTypeColor(r.type))}
          <span class="font-mono text-slate-400">${escapeHtml(r.dateStr)}</span>
        </div>
        <div class="text-[10px] text-slate-500 truncate">${escapeHtml(r.streamTitle)}</div>
      </div>`;
    }).join('') : '<div class="col-span-full py-8 text-center text-xs text-slate-400">該当する曲がありません</div>';
  }
}


function setSetlistLogMonthFilter(m) {
  setlistLogMonthFilter = m;
  renderSetlistLogsTable();
}

function renderSetlistLogMonthPills(sessions) {
  const wrap = document.getElementById('setlistLogMonthPills');
  if (!wrap) return;
  const counts = {};
  sessions.forEach(s => {
    if (s.month >= 1 && s.month <= 12) counts[s.month] = (counts[s.month] || 0) + 1;
  });
  const activeCls = 'px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-700 text-white shadow-sm transition cursor-pointer';
  const idleCls = 'px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  const emptyCls = 'px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:bg-slate-50 transition cursor-pointer opacity-60';

  let html = `<button type="button" onclick="setSetlistLogMonthFilter('all')" class="${setlistLogMonthFilter === 'all' ? activeCls : idleCls}">全月 (${sessions.length})</button>`;
  for (let m = 1; m <= 12; m++) {
    const cnt = counts[m] || 0;
    const isSel = String(setlistLogMonthFilter) === String(m);
    const cls = isSel ? activeCls : (cnt > 0 ? idleCls : emptyCls);
    html += `<button type="button" onclick="setSetlistLogMonthFilter('${m}')" class="${cls}">${m}月</button>`;
  }
  wrap.innerHTML = html;
}

function renderSetlistLogsTable() {
  const validRows = filterBySelectedYear(appData.setlist)
    .filter(r => matchesSetlistScope(r, setlistAnalyticsScope))
    .filter(r => selectedSetlistTypes.size === 0 || selectedSetlistTypes.has(normalizeSetlistType(r.type)));

  // 日付＋タイトル＋種別ごとにセッション単位でグルーピング
  const sessMap = {};
  validRows.forEach(r => {
    const tp = normalizeSetlistType(r.type);
    const key = `${r.dateStr}_${r.streamTitle}_${tp}`;
    if (!sessMap[key]) {
      sessMap[key] = {
        key,
        dateStr: r.dateStr,
        sortKey: r.sortKey,
        month: r.month,
        streamTitle: r.streamTitle,
        type: tp,
        songs: []
      };
    }
    sessMap[key].songs.push(r);
  });
  const allSessions = Object.values(sessMap);
  renderSetlistLogMonthPills(allSessions);

  const q = (document.getElementById('setlistLogSearchInput')?.value || '').trim().toLowerCase();

  const filtered = allSessions
    .filter(s => setlistLogMonthFilter === 'all' || String(s.month) === String(setlistLogMonthFilter))
    .filter(s => !q || `${s.streamTitle} ${s.type} ${s.songs.map(x => x.title).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => sortOrders.setlistLog === 'desc'
      ? b.sortKey.localeCompare(a.sortKey)
      : a.sortKey.localeCompare(b.sortKey));

  window._setlistLogSessionMap = {};
  filtered.forEach(s => { window._setlistLogSessionMap[s.key] = s; });

  const tbody = document.getElementById('setlistLogsTableBody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-slate-400">該当するセットリストログがありません</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(s => {
    const safeKey = escapeHtml(s.key).replace(/'/g, "\'");
    return `<tr onclick="openSetlistLogSessionModal('${safeKey}')" class="hover:bg-purple-50/50 transition cursor-pointer" title="クリックで歌唱曲一覧を表示">
      <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(s.dateStr)}</td>
      <td class="py-1.5 px-2 font-bold text-slate-800">${escapeHtml(s.streamTitle)}</td>
      <td class="py-1.5 px-2">${renderColoredBadge(s.type, getSetlistTypeColor(s.type))}</td>
      <td class="py-1.5 px-2 font-mono text-right whitespace-nowrap font-bold text-purple-700">${s.songs.length}曲 ›</td>
    </tr>`;
  }).join('');
}

function openSetlistLogSessionModal(sessKey) {
  const sess = window._setlistLogSessionMap && window._setlistLogSessionMap[sessKey];
  if (!sess) return;
  showSetlistDetailModal(`🎤 ${sess.dateStr} ${sess.streamTitle}`, sess.songs);
}
