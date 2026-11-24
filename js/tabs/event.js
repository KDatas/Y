// 3. イベントタブ
function renderEventTab() {
    const y = appState.targetYear;
    const events = appState.data.events.map((e, idx) => ({ ...e, idx })).filter(e => getItemYear(e.date) === y);
    const types = [...new Set(events.map(e => e.type || 'イベント'))];
    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

    const datasets = types.map(t => {
        const arr = Array(12).fill(0);
        events.filter(e => (e.type || 'イベント') === t).forEach(e => {
            const m = getItemMonth(e.date);
            if (m) arr[m - 1] += 1;
        });
        return {
            label: t,
            data: arr,
            backgroundColor: EVENT_TYPE_COLORS[t] || '#8b5cf6',
            borderRadius: 4
        };
    });

    destroyChart('chartEventMonthly');
    const ctx = document.getElementById('chartEventMonthly');
    if (ctx) {
        chartInstances['chartEventMonthly'] = new Chart(ctx, {
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

    const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('eventListContainer').innerHTML = sorted.map(e => `
        <div class="p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-2 hover:bg-purple-50/40">
            <div class="flex items-center gap-3 min-w-0">
                <span class="text-xs font-bold text-slate-400 flex-shrink-0">${e.date}</span>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 flex-shrink-0">${escapeHtml(e.type)}</span>
                <span class="font-bold text-sm truncate">${escapeHtml(e.title)}</span>
            </div>
            <button onclick="openEditModal('events', ${e.idx})" class="text-xs text-slate-400 hover:text-purple-600 px-2">✏️</button>
        </div>
    `).join('') || '<p class="text-xs text-slate-400 text-center py-6">対象年のイベントデータがありません</p>';
}
