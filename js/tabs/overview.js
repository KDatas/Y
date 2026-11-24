// 1. 年間推移タブ
function setOverviewMode(mode) {
    appState.overviewMode = mode;
    const bM = document.getElementById('btnModeMonthly');
    const bC = document.getElementById('btnModeCumulative');
    if (mode === 'monthly') {
        bM.className = 'px-3.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white transition';
        bC.className = 'px-3.5 py-1 rounded-full text-xs font-bold text-purple-700 transition';
    } else {
        bC.className = 'px-3.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white transition';
        bM.className = 'px-3.5 py-1 rounded-full text-xs font-bold text-purple-700 transition';
    }
    renderOverviewTab();
}

function toCumulative(arr) {
    let sum = 0;
    return arr.map(v => +(sum += v).toFixed(2));
}

function renderOverviewTab() {
    const y = appState.targetYear;
    const labels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
    const isCum = appState.overviewMode === 'cumulative';

    const hoursArr = Array(12).fill(0);
    const streamsArr = Array(12).fill(0);
    const fullArr = Array(12).fill(0);
    const shortArr = Array(12).fill(0);
    const eventArr = Array(12).fill(0);

    appState.data.streams.filter(s => getItemYear(s.date) === y).forEach(s => {
        const m = getItemMonth(s.date);
        if (m) { hoursArr[m - 1] += s.hours || 0; streamsArr[m - 1] += 1; }
    });
    appState.data.songs.filter(v => getItemYear(v.date) === y).forEach(v => {
        const m = getItemMonth(v.date);
        if (m) fullArr[m - 1] += 1;
    });
    appState.data.shorts.filter(v => getItemYear(v.date) === y && !v.xOnly).forEach(v => {
        const m = getItemMonth(v.date);
        if (m) shortArr[m - 1] += 1;
    });
    appState.data.events.filter(e => getItemYear(e.date) === y).forEach(e => {
        const m = getItemMonth(e.date);
        if (m) eventArr[m - 1] += 1;
    });

    const dHours = isCum ? toCumulative(hoursArr) : hoursArr.map(v => +v.toFixed(1));
    const dStreams = isCum ? toCumulative(streamsArr) : streamsArr;
    const dFull = isCum ? toCumulative(fullArr) : fullArr;
    const dShort = isCum ? toCumulative(shortArr) : shortArr;
    const dEvents = isCum ? toCumulative(eventArr) : eventArr;

    renderSingleBarChart('chartOverviewHours', labels, [{
        label: '配信時間 (h)', data: dHours, backgroundColor: '#6366f1', borderRadius: 6
    }]);
    renderSingleBarChart('chartOverviewStreams', labels, [{
        label: '配信回数 (回)', data: dStreams, backgroundColor: '#8b5cf6', borderRadius: 6
    }]);
    renderSingleBarChart('chartOverviewVideos', labels, [
        { label: 'FULL動画', data: dFull, backgroundColor: '#7c3aed', borderRadius: 6 },
        { label: 'Short動画', data: dShort, backgroundColor: '#38bdf8', borderRadius: 6 }
    ]);
    renderSingleBarChart('chartOverviewEvents', labels, [{
        label: 'イベント数', data: dEvents, backgroundColor: '#f43f5e', borderRadius: 6
    }]);
}

function renderSingleBarChart(canvasId, labels, datasets) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            }
        }
    });
}
