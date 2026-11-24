// 5. 雑談・配信タブ
function renderStreamingTab() {
    const y = appState.targetYear;
    const streams = appState.data.streams.map((s, idx) => ({ ...s, idx })).filter(s => getItemYear(s.date) === y);

    const tagCounts = {};
    streams.forEach(s => { const t = s.tag || '雑談'; tagCounts[t] = (tagCounts[t] || 0) + 1; });
    const tagEntries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

    const sel = document.getElementById('streamTagFilter');
    const prevVal = sel.value;
    sel.innerHTML = '<option value="ALL">すべてのタグ</option>' + tagEntries.map(([t, c]) => `<option value="${escapeHtml(t)}">${escapeHtml(t)} (${c})</option>`).join('');
    if ([...sel.options].some(o => o.value === prevVal)) sel.value = prevVal;

    destroyChart('chartStreamTags');
    const ctxTag = document.getElementById('chartStreamTags');
    if (ctxTag) {
        chartInstances['chartStreamTags'] = new Chart(ctxTag, {
            type: 'doughnut',
            data: {
                labels: tagEntries.map(e => e[0]),
                datasets: [{ data: tagEntries.map(e => e[1]), backgroundColor: ['#7c3aed', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
        });
    }

    const wdCounts = Array(7).fill(0);
    streams.forEach(s => {
        const d = new Date(s.date);
        if (!isNaN(d)) wdCounts[d.getDay()]++;
    });
    renderSingleBarChart('chartStreamWeekday', ['日', '月', '火', '水', '木', '金', '土'], [{
        label: '配信回数', data: wdCounts, backgroundColor: '#8b5cf6', borderRadius: 6
    }]);

    const filterTag = sel.value;
    const filtered = streams.filter(s => filterTag === 'ALL' || (s.tag || '雑談') === filterTag).sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('streamListContainer').innerHTML = filtered.map(s => `
        <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs hover:bg-purple-50/40">
            <div class="min-w-0">
                <div class="font-bold truncate">${escapeHtml(s.title)}</div>
                <div class="text-[11px] text-slate-400">${s.date} ・ ${escapeHtml(s.tag || '雑談')} ・ ${s.hours}h</div>
            </div>
            <button onclick="openEditModal('streams', ${s.idx})" class="text-slate-400 hover:text-purple-600">✏️</button>
        </div>
    `).join('') || '<p class="text-xs text-slate-400 text-center py-6">該当する配信がありません</p>';
}
