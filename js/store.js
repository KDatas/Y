// アプリ状態管理・永続化
const appState = {
    targetYear: 2026,
    activeTab: 'overview',
    overviewMode: 'monthly',
    singRankingScope: 'stream',
    setlistUniqueOnly: false,
    setlistSortAsc: false,
    highlightVisible: true,
    darkMode: false,
    data: {
        streams: [],
        songs: [],
        shorts: [],
        events: [],
        setlists: []
    }
};

const chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function saveStateToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            targetYear: appState.targetYear,
            darkMode: appState.darkMode,
            data: appState.data
        }));
    } catch (e) {
        console.warn('localStorage保存に失敗しました', e);
    }
}

function loadStateFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.targetYear) appState.targetYear = parsed.targetYear;
        if (typeof parsed.darkMode === 'boolean') appState.darkMode = parsed.darkMode;
        if (parsed.data) {
            appState.data.streams = parsed.data.streams || [];
            appState.data.songs = parsed.data.songs || [];
            appState.data.shorts = parsed.data.shorts || [];
            appState.data.events = parsed.data.events || [];
            appState.data.setlists = parsed.data.setlists || [];
        }
    } catch (e) {
        console.warn('localStorage読込に失敗しました', e);
    }
}

function exportStateJson() {
    const payload = {
        exportedAt: new Date().toISOString(),
        targetYear: appState.targetYear,
        data: appState.data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yukimi_report_${appState.targetYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function resetAllData() {
    if (!confirm('保存されているすべてのデータを初期化しますか？')) return;
    appState.data = { streams: [], songs: [], shorts: [], events: [], setlists: [] };
    saveStateToStorage();
    updateLoadedStatusUI();
    renderAll();
}

function updateLoadedStatusUI() {
    const el = document.getElementById('loadedStatusBadges');
    if (!el) return;
    const d = appState.data;
    const items = [
        { label: 'Streaming', count: d.streams.length },
        { label: 'Song (FULL)', count: d.songs.length },
        { label: 'Short', count: d.shorts.length },
        { label: 'Ivent', count: d.events.length },
        { label: 'Setlist', count: d.setlists.length }
    ];
    el.innerHTML = items.map(it =>
        `<span class="px-2.5 py-1 rounded-full font-bold ${it.count > 0 ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30' : 'bg-white/10 text-white/60'}">${it.label}: ${it.count}件</span>`
    ).join('');
}
