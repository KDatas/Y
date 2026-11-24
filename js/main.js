// 全体制御・KPI計算・タブ切り替え・初期化
function toggleImporterPanel() {
    document.getElementById('importerPanel').classList.toggle('hidden');
}

function toggleHighlightCards() {
    appState.highlightVisible = !appState.highlightVisible;
    const sec = document.getElementById('highlightCardsSection');
    const btn = document.getElementById('highlightToggleBtn');
    sec.classList.toggle('hidden', !appState.highlightVisible);
    btn.textContent = appState.highlightVisible ? '📌 ハイライト ▲' : '📌 ハイライト ▼';
}

function toggleDarkMode() {
    appState.darkMode = !appState.darkMode;
    document.body.classList.toggle('dark', appState.darkMode);
    document.getElementById('darkModeBtn').textContent = appState.darkMode ? '☀️ ライト' : '🌙 ダーク';
    saveStateToStorage();
}

function changeTargetYear(val) {
    appState.targetYear = parseInt(val, 10);
    document.getElementById('headerYearLabel').textContent = appState.targetYear;
    saveStateToStorage();
    renderAll();
}

function switchTab(tabId) {
    appState.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `tab-${tabId}`);
    });
    renderActiveTab();
}

function renderHighlightKPIs() {
    const y = appState.targetYear;
    const streams = appState.data.streams.filter(s => getItemYear(s.date) === y);
    const songs = appState.data.songs.filter(v => getItemYear(v.date) === y);
    const shorts = appState.data.shorts.filter(v => getItemYear(v.date) === y && !v.xOnly);
    const setlists = appState.data.setlists.filter(s => getItemYear(s.date) === y);
    const events = appState.data.events.filter(e => getItemYear(e.date) === y);

    const totalHours = streams.reduce((a, b) => a + (b.hours || 0), 0);
    const singStreams = setlists.filter(s => s.type === '歌枠' || s.type === 'カラオケ');
    const singDays = new Set(singStreams.map(s => s.date)).size;

    document.getElementById('kpiStreamCount').textContent = streams.length;
    document.getElementById('kpiStreamSub').textContent = `月平均 ${(streams.length / 12).toFixed(1)}回`;

    document.getElementById('kpiStreamHours').textContent = totalHours.toFixed(1);
    document.getElementById('kpiHoursSub').textContent = `月平均 ${(totalHours / 12).toFixed(1)}h`;

    document.getElementById('kpiVideoCount').textContent = songs.length;
    document.getElementById('kpiShortBadge').textContent = `Short ${shorts.length}本`;
    document.getElementById('kpiVideoSub').textContent = `月平均 ${(songs.length / 12).toFixed(1)}本`;

    document.getElementById('kpiSingStreamCount').textContent = singDays;
    document.getElementById('kpiTotalSongsBadge').textContent = `計${setlists.length}曲`;
    document.getElementById('kpiSingSub').textContent = `月平均 ${(singDays / 12).toFixed(1)}回`;

    document.getElementById('kpiEventCount').textContent = events.length;
    const evMap = {};
    events.forEach(e => { const t = e.type || 'イベント'; evMap[t] = (evMap[t] || 0) + 1; });
    const evSummary = Object.entries(evMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' / ');
    document.getElementById('kpiEventBreakdown').textContent = evSummary || '内訳 : -';
}

function renderActiveTab() {
    switch (appState.activeTab) {
        case 'overview': renderOverviewTab(); break;
        case 'calendar': renderAutoCalendarSection(); break;
        case 'event': renderEventTab(); break;
        case 'music': renderMusicTab(); break;
        case 'streaming': renderStreamingTab(); break;
        case 'singing': renderSingingTab(); break;
        case 'archive': renderArchiveTab(); break;
    }
}

function renderAll() {
    renderHighlightKPIs();
    renderActiveTab();
}

async function loadHostedDefaultData(forceOverwrite = false) {
    const hasLocal =
        appState.data.streams.length > 0 ||
        appState.data.songs.length > 0 ||
        appState.data.shorts.length > 0 ||
        appState.data.events.length > 0 ||
        appState.data.setlists.length > 0;
    if (hasLocal && !forceOverwrite) return false;

    try {
        const res = await fetch('./data/default_data.json', { cache: 'no-cache' });
        if (!res.ok) return false;
        const json = await res.json();
        const src = json.data ? json.data : json;
        if (src.streams || src.songs || src.shorts || src.events || src.setlists) {
            appState.data.streams = src.streams || [];
            appState.data.songs = src.songs || [];
            appState.data.shorts = src.shorts || [];
            appState.data.events = src.events || [];
            appState.data.setlists = src.setlists || [];
            if (json.targetYear && !forceOverwrite) appState.targetYear = json.targetYear;
            updateLoadedStatusUI();
            renderAll();
            return true;
        }
    } catch (e) {
        // file:// で直接開いた場合などは無視
    }
    return false;
}

async function reloadHostedDefaultData() {
    if (!confirm('サーバー上の初期データ（data/default_data.json）を再読み込みして現在の表示を上書きしますか？')) return;
    const ok = await loadHostedDefaultData(true);
    if (ok) {
        saveStateToStorage();
        alert('公開データを読み込みました。');
    } else {
        alert('data/default_data.json が見つからないか、まだデータが空です。\nダッシュボードの「💾 JSON出力」で保存したファイルを data/default_data.json に配置してください。');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    loadStateFromStorage();
    document.getElementById('yearSelect').value = String(appState.targetYear);
    document.getElementById('headerYearLabel').textContent = appState.targetYear;
    if (appState.darkMode) {
        document.body.classList.add('dark');
        document.getElementById('darkModeBtn').textContent = '☀️ ライト';
    }
    updateLoadedStatusUI();
    await loadHostedDefaultData(false);
    initAutoCalendarHolidays();
    renderAll();
});
