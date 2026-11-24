// 7. 比較タブ
function getYearMetrics(year) {
    const streams = appState.data.streams.filter(s => getItemYear(s.date) === year);
    const songs = appState.data.songs.filter(v => getItemYear(v.date) === year);
    const shorts = appState.data.shorts.filter(v => getItemYear(v.date) === year && !v.xOnly);
    const setlists = appState.data.setlists.filter(s => getItemYear(s.date) === year);
    const events = appState.data.events.filter(e => getItemYear(e.date) === year);

    const monthly = {
        hours: Array(12).fill(0),
        streams: Array(12).fill(0),
        videos: Array(12).fill(0),
        shorts: Array(12).fill(0),
        songs: Array(12).fill(0),
        events: Array(12).fill(0)
    };

    streams.forEach(s => { const m = getItemMonth(s.date); if (m) { monthly.hours[m - 1] += s.hours || 0; monthly.streams[m - 1]++; } });
    songs.forEach(v => { const m = getItemMonth(v.date); if (m) monthly.videos[m - 1]++; });
    shorts.forEach(v => { const m = getItemMonth(v.date); if (m) monthly.shorts[m - 1]++; });
    setlists.forEach(s => { const m = getItemMonth(s.date); if (m) monthly.songs[m - 1]++; });
    events.forEach(e => { const m = getItemMonth(e.date); if (m) monthly.events[m - 1]++; });

    return {
        totals: {
            hours: +streams.reduce((a, b) => a + (b.hours || 0), 0).toFixed(1),
            streams: streams.length,
            videos: songs.length,
            shorts: shorts.length,
            songs: setlists.length,
            events: events.length
        },
        monthly
    };
}

function renderArchiveTab() {
    const years = [2026, 2025, 2024, 2023, 2022];
    const selA = document.getElementById('compYearA');
    const selB = document.getElementById('compYearB');
    if (!selA.options.length) {
        selA.innerHTML = years.map(y => `<option value="${y}">${y}年</option>`).join('');
        selB.innerHTML = years.map(y => `<option value="${y}">${y}年</option>`).join('');
        selA.value = String(appState.targetYear);
        selB.value = String(appState.targetYear - 1);
    }

    const yA = parseInt(selA.value, 10);
    const yB = parseInt(selB.value, 10);
    const metric = document.getElementById('compMetricSelect').value;

    const mA = getYearMetrics(yA);
    const mB = getYearMetrics(yB);

    const cards = [
        { label: '配信時間', a: `${mA.totals.hours}h`, b: `${mB.totals.hours}h` },
        { label: '配信回数', a: `${mA.totals.streams}回`, b: `${mB.totals.streams}回` },
        { label: 'FULL動画', a: `${mA.totals.videos}本`, b: `${mB.totals.videos}本` },
        { label: 'Short動画', a: `${mA.totals.shorts}本`, b: `${mB.totals.shorts}本` },
        { label: '歌唱曲数', a: `${mA.totals.songs}曲`, b: `${mB.totals.songs}曲` },
        { label: 'イベント回数', a: `${mA.totals.events}回`, b: `${mB.totals.events}回` }
    ];

    document.getElementById('compSummaryGrid').innerHTML = cards.map(c => `
        <div class="card p-3.5">
            <div class="text-xs font-bold text-slate-400">${c.label}</div>
            <div class="flex items-baseline justify-between mt-1">
                <span class="text-lg font-extrabold text-purple-600">${yA}年: ${c.a}</span>
                <span class="text-xs font-bold text-slate-400">${yB}年: ${c.b}</span>
            </div>
        </div>
    `).join('');

    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    destroyChart('chartCompMonthly');
    const ctxM = document.getElementById('chartCompMonthly');
    if (ctxM) {
        chartInstances['chartCompMonthly'] = new Chart(ctxM, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: `${yA}年`, data: mA.monthly[metric], borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.15)', fill: true, tension: 0.3 },
                    { label: `${yB}年`, data: mB.monthly[metric], borderColor: '#94a3b8', borderDash: [4, 4], tension: 0.3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    const keys = ['hours', 'streams', 'videos', 'shorts', 'songs', 'events'];
    const normA = keys.map(k => { const mx = Math.max(mA.totals[k], mB.totals[k], 1); return Math.round((mA.totals[k] / mx) * 100); });
    const normB = keys.map(k => { const mx = Math.max(mA.totals[k], mB.totals[k], 1); return Math.round((mB.totals[k] / mx) * 100); });

    destroyChart('chartCompRadar');
    const ctxR = document.getElementById('chartCompRadar');
    if (ctxR) {
        chartInstances['chartCompRadar'] = new Chart(ctxR, {
            type: 'radar',
            data: {
                labels: ['配信時間', '配信回数', 'FULL動画', 'Short', '歌唱曲数', 'イベント'],
                datasets: [
                    { label: `${yA}年`, data: normA, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.2)' },
                    { label: `${yB}年`, data: normB, borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.15)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100, ticks: { display: false } } } }
        });
    }
}
