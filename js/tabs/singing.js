// 6. 歌枠＆セトリタブ
function setSingRankingScope(scope) {
    appState.singRankingScope = scope;
    const map = {
        stream: 'btnSingScopeStream',
        live_all: 'btnSingScopeLiveAll',
        live_solo: 'btnSingScopeLiveSolo',
        live_other: 'btnSingScopeLiveOther',
        all: 'btnSingScopeAll'
    };
    Object.entries(map).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = k === scope
            ? 'px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white transition'
            : 'px-3 py-1 rounded-full text-xs font-bold text-purple-700 transition';
    });
    renderSingingTab();
}

function toggleSetlistUnique() {
    appState.setlistUniqueOnly = !appState.setlistUniqueOnly;
    document.getElementById('btnSetlistUnique').textContent = `重複を除く：${appState.setlistUniqueOnly ? 'ON' : 'OFF'}`;
    renderSetlistCards();
}

function toggleSetlistSort() {
    appState.setlistSortAsc = !appState.setlistSortAsc;
    document.getElementById('btnSetlistSort').textContent = `日付：${appState.setlistSortAsc ? '昇順 ↑' : '降順 ↓'}`;
    renderSetlistCards();
}

function filterSetlistByScope(items, scope) {
    if (scope === 'stream') return items.filter(x => x.type === '歌枠' || x.type === 'カラオケ');
    if (scope === 'live_all') return items.filter(x => x.type.startsWith('LIVE'));
    if (scope === 'live_solo') return items.filter(x => x.type === 'LIVE (solo)');
    if (scope === 'live_other') return items.filter(x => x.type === 'LIVE (Comp)' || x.type === 'LIVE (Guest)');
    return items;
}

function renderSingingTab() {
    const y = appState.targetYear;
    const yearSongs = appState.data.setlists.map((s, idx) => ({ ...s, idx })).filter(s => getItemYear(s.date) === y);
    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    const types = ['歌枠', 'カラオケ', 'LIVE (solo)', 'LIVE (Comp)', 'LIVE (Guest)'];

    const datasets = types.map(t => {
        const arr = Array(12).fill(0);
        yearSongs.filter(s => s.type === t).forEach(s => { const m = getItemMonth(s.date); if (m) arr[m - 1]++; });
        return { label: t, data: arr, backgroundColor: SING_TYPE_COLORS[t] || '#7c3aed', borderRadius: 4 };
    });

    destroyChart('chartSingingMonthly');
    const ctx = document.getElementById('chartSingingMonthly');
    if (ctx) {
        chartInstances['chartSingingMonthly'] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } }
            }
        });
    }

    const scoped = filterSetlistByScope(yearSongs, appState.singRankingScope);
    const songMap = {};
    scoped.forEach(s => {
        if (!songMap[s.title]) songMap[s.title] = { title: s.title, count: 0, latestDate: s.date };
        songMap[s.title].count++;
        if (s.date > songMap[s.title].latestDate) songMap[s.title].latestDate = s.date;
    });
    const uniqueList = Object.values(songMap).sort((a, b) => b.count - a.count || b.latestDate.localeCompare(a.latestDate));
    const standardList = uniqueList.filter(x => x.count >= 2);
    const rareList = uniqueList.filter(x => x.count === 1);

    window._singUniqueList = uniqueList;
    window._singStandardList = standardList;
    window._singRareList = rareList;

    document.getElementById('singStatsCards').innerHTML = `
        <div class="p-3 rounded-xl bg-purple-50/70 border border-purple-100">
            <div class="text-[11px] font-bold text-purple-600">延べ歌唱数</div>
            <div class="text-xl font-extrabold mt-0.5">${scoped.length}<span class="text-xs ml-1">曲</span></div>
        </div>
        <div onclick="openUniqueSongListModal('🎵 レパートリー一覧', '全${uniqueList.length}曲', window._singUniqueList)" class="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 cursor-pointer hover:brightness-95">
            <div class="text-[11px] font-bold text-indigo-600">レパートリー数 ↗</div>
            <div class="text-xl font-extrabold mt-0.5">${uniqueList.length}<span class="text-xs ml-1">曲</span></div>
        </div>
        <div onclick="openUniqueSongListModal('🔥 定番曲(2回以上)一覧', '${standardList.length}曲', window._singStandardList)" class="p-3 rounded-xl bg-amber-50/70 border border-amber-100 cursor-pointer hover:brightness-95">
            <div class="text-[11px] font-bold text-amber-600">定番曲 (2回以上) ↗</div>
            <div class="text-xl font-extrabold mt-0.5">${standardList.length}<span class="text-xs ml-1">曲</span></div>
        </div>
        <div onclick="openUniqueSongListModal('✨ レア曲(1回)一覧', '${rareList.length}曲', window._singRareList)" class="p-3 rounded-xl bg-rose-50/70 border border-rose-100 cursor-pointer hover:brightness-95">
            <div class="text-[11px] font-bold text-rose-600">レア曲 (1回) ↗</div>
            <div class="text-xl font-extrabold mt-0.5">${rareList.length}<span class="text-xs ml-1">曲</span></div>
        </div>
    `;

    document.getElementById('singTopRankingList').innerHTML = uniqueList.slice(0, 10).map((item, i) => `
        <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] ${i < 3 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}">${i + 1}</span>
                <div class="min-w-0">
                    <div class="font-bold truncate">${escapeHtml(item.title)}</div>
                    <div class="text-[10px] text-slate-400">最新: ${item.latestDate}</div>
                </div>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">×${item.count}</span>
        </div>
    `).join('');

    renderSetlistCards();
}

function renderSetlistCards() {
    const y = appState.targetYear;
    const typeFilter = document.getElementById('setlistTypeFilter').value;
    const kw = (document.getElementById('setlistSearchInput').value || '').trim().toLowerCase();

    let items = appState.data.setlists.map((s, idx) => ({ ...s, idx })).filter(s => getItemYear(s.date) === y);
    if (typeFilter !== 'ALL') items = items.filter(s => s.type === typeFilter);
    if (kw) items = items.filter(s => s.title.toLowerCase().includes(kw) || (s.artist || '').toLowerCase().includes(kw));

    items.sort((a, b) => appState.setlistSortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

    const container = document.getElementById('setlistCardsContainer');
    if (appState.setlistUniqueOnly) {
        const map = {};
        items.forEach(s => {
            if (!map[s.title]) map[s.title] = { title: s.title, artist: s.artist, count: 0, latestDate: s.date };
            map[s.title].count++;
            if (appState.setlistSortAsc ? s.date < map[s.title].latestDate : s.date > map[s.title].latestDate) {
                map[s.title].latestDate = s.date;
            }
        });
        const list = Object.values(map).sort((a, b) =>
            b.count - a.count || (appState.setlistSortAsc ? a.latestDate.localeCompare(b.latestDate) : b.latestDate.localeCompare(a.latestDate))
        );
        container.innerHTML = list.map(item => `
            <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                    <div class="font-bold truncate">${escapeHtml(item.title)}</div>
                    <div class="text-[11px] text-slate-400">最新: ${item.latestDate}</div>
                </div>
                <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold">×${item.count}</span>
            </div>
        `).join('') || '<p class="text-xs text-slate-400 text-center py-6">該当曲がありません</p>';
        return;
    }

    container.innerHTML = items.map(s => `
        <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs hover:bg-purple-50/40">
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-slate-400 font-bold flex-shrink-0">${s.date}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex-shrink-0" style="background:${SING_TYPE_COLORS[s.type] || '#7c3aed'}">${escapeHtml(s.type)}</span>
                <span class="font-bold truncate">${escapeHtml(s.title)}</span>
            </div>
            <button onclick="openEditModal('setlists', ${s.idx})" class="text-slate-400 hover:text-purple-600">✏️</button>
        </div>
    `).join('') || '<p class="text-xs text-slate-400 text-center py-6">該当データがありません</p>';
}
