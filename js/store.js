// =========================================================================
// 4. アプリケーション状態管理＆JSON自動保存・復元
// =========================================================================
const STORAGE_KEY = 'yukimi_activity_report_state_v2';
const sampleDefault = buildSampleData();

let appData = {
  isSample: true,
  loadedFlags: { streaming: false, song: false, short: false, setlist: false, event: false },
  streams: sampleDefault.streams,
  fullVideos: sampleDefault.fullVideos,
  shortVideos: sampleDefault.shortVideos,
  setlist: sampleDefault.setlist,
  events: sampleDefault.events
};

let selectedYear = '2026';
let activeTab = 'overview';
let overviewChartMode = 'compare';
let radarScaleMode = 'all';
let styleShiftMode = 'time';
let activeCreditKey = 'composer';
let setlistAnalyticsScope = 'stream';
let setlistDisplayMode = 'unique';
let selectedSetlistTypes = new Set();
let sortOrders = { event: 'desc', full: 'desc', short: 'desc', stream: 'desc', setlist: 'desc' };
let currentEditTarget = null;

function saveStateToLocal() {
  try {
    if (appData.isSample) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    const st = document.getElementById('autoSaveStatus');
    if (st) st.textContent = `自動保存済 (${new Date().toLocaleTimeString('ja-JP')})`;
  } catch (e) {
    console.warn('localStorage save skipped:', e);
  }
}

function loadStateFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.streams)) {
      appData = {
        isSample: false,
        loadedFlags: parsed.loadedFlags || { streaming: true, song: true, short: true, setlist: true, event: true },
        streams: parsed.streams || [],
        fullVideos: (parsed.fullVideos || []).map(v => ({
          ...v,
          isExcluded: typeof v.isExcluded === 'boolean' ? v.isExcluded : isFullVideoExcluded(v)
        })),
        shortVideos: parsed.shortVideos || [],
        setlist: (parsed.setlist || []).map(r => ({ ...r, type: normalizeSetlistType(r.type) })),
        events: parsed.events || []
      };
      return true;
    }
  } catch (e) {
    console.warn('localStorage load failed:', e);
  }
  return false;
}

function exportStateJson() {
  try {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dt = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `default_data.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('💾 JSONバックアップを保存しました');
  } catch (e) {
    showToast('JSON出力に失敗しました');
  }
}

function openResetConfirmModal() {
  document.getElementById('resetModal').classList.remove('hidden');
}
function closeResetConfirmModal() {
  document.getElementById('resetModal').classList.add('hidden');
}
function executeResetData() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  const def = buildSampleData();
  appData = {
    isSample: true,
    loadedFlags: { streaming: false, song: false, short: false, setlist: false, event: false },
    streams: def.streams,
    fullVideos: def.fullVideos,
    shortVideos: def.shortVideos,
    setlist: def.setlist,
    events: def.events
  };
  selectedSetlistTypes.clear();
  closeResetConfirmModal();
  refreshYearSelectors();
  updateLoadedStatusUI();
  renderAll();
  showToast('🗑️ 初期サンプルデータに戻しました');
}


async function loadHostedDefaultData(forceOverwrite = false) {
  try {
    const res = await fetch('./data/default_data.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    const parsed = await res.json();
    if (!parsed || !Array.isArray(parsed.streams)) return false;

    const totalCount =
      (parsed.streams || []).length +
      (parsed.fullVideos || []).length +
      (parsed.shortVideos || []).length +
      (parsed.setlist || []).length +
      (parsed.events || []).length;

    if (totalCount === 0) return false;

    appData = {
      isSample: false,
      loadedFlags: parsed.loadedFlags || {
        streaming: (parsed.streams || []).length > 0,
        song: (parsed.fullVideos || []).length > 0,
        short: (parsed.shortVideos || []).length > 0,
        setlist: (parsed.setlist || []).length > 0,
        event: (parsed.events || []).length > 0
      },
      streams: parsed.streams || [],
      fullVideos: (parsed.fullVideos || []).map(v => ({
        ...v,
        isExcluded: typeof v.isExcluded === 'boolean' ? v.isExcluded : isFullVideoExcluded(v)
      })),
      shortVideos: parsed.shortVideos || [],
      setlist: (parsed.setlist || []).map(r => ({ ...r, type: normalizeSetlistType(r.type) })),
      events: parsed.events || []
    };
    return true;
  } catch (e) {
    // ローカル file:// 直接起動時などは静かにスキップ
    return false;
  }
}

async function reloadHostedDefaultData() {
  const ok = await loadHostedDefaultData(true);
  if (ok) {
    selectedSetlistTypes.clear();
    saveStateToLocal();
    refreshYearSelectors();
    updateLoadedStatusUI();
    renderAll();
    showToast('🔄 公開データ（default_data.json）を読み込みました');
  } else {
    showToast('⚠️ ./data/default_data.json にデータが見つかりません');
  }
}
