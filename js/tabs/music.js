// 4. 動画・ショートタブ
function renderMusicTab() {
    const y = appState.targetYear;
    const exX = document.getElementById('chkExcludeXShort')?.checked ?? true;
    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

    const songs = appState.data.songs.map((v, idx) => ({ ...v, idx })).filter(v => getItemYear(v.date) === y);
    const shorts = appState.data.shorts.map((v, idx) => ({ ...v, idx })).filter(v => getItemYear(v.date) === y && (!exX || !v.xOnly));

    const songArr = Array(12).fill(0);
    songs.forEach(v => { const m = getItemMonth(v.date); if (m) songArr[m - 1]++; });

    const shortArr = Array(12).fill(0);
    shorts.forEach(v => { const m = getItemMonth(v.date); if (m) shortArr[m - 1]++; });

    renderSingleBarChart('chartSongMonthly', labels, [{ label: 'FULL動画', data: songArr, backgroundColor: '#7c3aed', borderRadius: 6 }]);
    renderSingleBarChart('chartShortMonthly', labels, [{ label: 'Short動画', data: shortArr, backgroundColor: '#0ea5e9', borderRadius: 6 }]);

    document.getElementById('songListContainer').innerHTML = [...songs].sort((a, b) => b.date.localeCompare(a.date)).map(v => `
        <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div class="min-w-0">
                <div class="font-bold truncate">${escapeHtml(v.title)}</div>
                <div class="text-[11px] text-slate-400">${v.date} ・ ${escapeHtml(v.type)}</div>
            </div>
            <button onclick="openEditModal('songs', ${v.idx})" class="text-slate-400 hover:text-purple-600">✏️</button>
        </div>
    `).join('') || '<p class="text-xs text-slate-400 text-center py-6">データがありません</p>';

    document.getElementById('shortListContainer').innerHTML = [...shorts].sort((a, b) => b.date.localeCompare(a.date)).map(v => `
        <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div class="min-w-0">
                <div class="font-bold truncate">${escapeHtml(v.title)}</div>
                <div class="text-[11px] text-slate-400">${v.date} ・ ${escapeHtml(v.type)}</div>
            </div>
            <button onclick="openEditModal('shorts', ${v.idx})" class="text-slate-400 hover:text-purple-600">✏️</button>
        </div>
    `).join('') || '<p class="text-xs text-slate-400 text-center py-6">データがありません</p>';
}
