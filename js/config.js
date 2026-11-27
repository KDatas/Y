// =========================================================================
// 1. カラー定義＆共通ユーティリティ
// =========================================================================
const MIN_VISUAL_YEAR = 2020;
const THEME_STORAGE_KEY = 'yukimi_report_theme_mode_v1';

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function applyThemeMode(mode, persist = false) {
  const dark = mode === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  const iconEl = document.getElementById('themeToggleIcon');
  const textEl = document.getElementById('themeToggleText');
  if (iconEl) iconEl.textContent = dark ? '☀️' : '🌙';
  if (textEl) textEl.textContent = dark ? 'ライト' : 'ダーク';

  if (typeof Chart !== 'undefined' && Chart.defaults) {
    Chart.defaults.color = dark ? '#cbd5e1' : '#475569';
    Chart.defaults.borderColor = dark ? '#2f264f' : '#e2e8f0';
  }

  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch (e) {}
  }
}

function initThemeMode() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch (e) {}
  if (saved === 'dark' || saved === 'light') {
    applyThemeMode(saved, false);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyThemeMode(prefersDark ? 'dark' : 'light', false);
  }
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSysChange = e => {
      let manual = null;
      try { manual = localStorage.getItem(THEME_STORAGE_KEY); } catch (err) {}
      if (!manual) {
        applyThemeMode(e.matches ? 'dark' : 'light', false);
        renderAll();
      }
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onSysChange);
  }
}

function toggleThemeMode() {
  const next = isDarkMode() ? 'light' : 'dark';
  applyThemeMode(next, true);
  renderAll();
  showToast(next === 'dark' ? '🌙 ダークモードに切り替えました' : '☀️ ライトモードに切り替えました');
}

const PALETTE = [
  '#9333ea', '#ec4899', '#06b6d4', '#f59e0b', '#10b981',
  '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#8b5cf6',
  '#3b82f6', '#84cc16', '#d946ef', '#0ea5e9', '#eab308'
];

const FULL_TYPE_COLORS = {
  'Solo': '#9333ea',
  'Original': '#ef4444',
  'Collab': '#3b82f6',
  'Live action': '#10b981',
  'MV': '#ec4899',
  'Cover': '#8b5cf6'
};

const SHORT_CAT_COLORS = {
  'Full関連': '#3b82f6',
  'Shortのみ': '#d946ef'
};

const FIXED_STREAM_CAT_COLORS = {
  '雑談': '#9333ea',
  '企画': '#ec4899',
  'ゲーム': '#06b6d4',
  '歌枠': '#f59e0b',
  'コラボ': '#10b981',
  'カメラ': '#6366f1',
  '別枠': '#ef4444',
  '告知': '#f97316',
  '飲酒': '#d946ef',
  'スペース': '#0ea5e9',
  '参加型企画': '#14b8a6',
  'YouTubeLive': '#e11d48',
  '凸待ち': '#84cc16'
};

const FIXED_EVENT_TYPE_COLORS = {
  'ライブ': '#ec4899',
  'LIVE': '#ec4899',
  'ワンマン': '#be185d',
  'リリイベ': '#f59e0b',
  'ファンミ': '#10b981',
  '特典会': '#0ea5e9',
  'オンラインライブ': '#6366f1',
  'オンライン特典会': '#06b6d4',
  '対バン': '#9333ea'
};

const FIXED_SETLIST_TYPE_COLORS = {
  '歌枠': '#9333ea',
  'LIVE': '#ec4899',
  'LIVE (solo)': '#ec4899',
  'LIVE (Comp)': '#06b6d4',
  'LIVE (Guest)': '#3b82f6',
  'ライブ': '#ec4899',
  'カラオケ': '#f59e0b',
  '弾き語り': '#10b981',
  'コラボ歌枠': '#6366f1'
};

const TIME_BANDS = [
  { key: 'midnight', label: '深夜 (0-4時)', short: '深夜', color: '#3b82f6' },
  { key: 'night',    label: '夜 (19-23時)', short: '夜',   color: '#c084fc' },
  { key: 'evening',  label: '夕方 (16-18時)', short: '夕方', color: '#ef4444' },
  { key: 'day',      label: '昼 (10-15時)', short: '昼',   color: '#f59e0b' },
  { key: 'morning',  label: '朝 (5-9時)',   short: '朝',   color: '#eab308' }
];

function hashColor(str) {
  const s = String(str || 'その他');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function getStreamCatColor(tag) {
  const k = String(tag || 'その他').trim();
  return FIXED_STREAM_CAT_COLORS[k] || hashColor(k);
}

function getFullTypeColor(type) {
  const k = String(type || 'Solo').trim();
  for (const [key, val] of Object.entries(FULL_TYPE_COLORS)) {
    if (key.toLowerCase() === k.toLowerCase()) return val;
  }
  return hashColor(k);
}

function getShortCatColor(cat) {
  const k = String(cat || 'Shortのみ').trim();
  return SHORT_CAT_COLORS[k] || hashColor(k);
}

function getEventTypeColor(type) {
  const k = String(type || 'その他').trim();
  for (const [key, val] of Object.entries(FIXED_EVENT_TYPE_COLORS)) {
    if (key.toLowerCase() === k.toLowerCase()) return val;
  }
  return hashColor(k);
}

function isRadarTargetEvent(ev) {
  if (!ev) return false;
  const type = String(ev.type || '').trim();
  const title = String(ev.title || '').trim();
  const targetRegex = /ライブ|live|ワンマン|対バン|スリーマン|ツーマン|ツアー|リリイベ|リリースイベント|ファンミ|ファンミーティング|fan\s*meeting/i;
  if (/特典会|サイン会|チェキ会|トーク会/i.test(type) && !targetRegex.test(type)) {
    return false;
  }
  return targetRegex.test(`${type} ${title}`);
}

function normalizeSetlistType(rawType) {
  const s = String(rawType || '').trim();
  if (!s) return '歌枠';
  const normalized = s.replace(/（/g, '(').replace(/）/g, ')').replace(/\s+/g, ' ').trim();
  if (/live|ライブ/i.test(normalized)) {
    if (/solo|ソロ/i.test(normalized)) return 'LIVE (solo)';
    if (/guest|ゲスト/i.test(normalized)) return 'LIVE (Guest)';
    if (/comp|コンピ|コラボ|対バン/i.test(normalized)) return 'LIVE (Comp)';
    if (/^live$/i.test(normalized)) return 'LIVE';
  }
  return normalized;
}

function getSetlistTypeColor(type) {
  const k = normalizeSetlistType(type);
  if (FIXED_SETLIST_TYPE_COLORS[k]) return FIXED_SETLIST_TYPE_COLORS[k];
  if (/live|ライブ/i.test(k)) {
    if (/guest/i.test(k)) return '#3b82f6';
    if (/comp/i.test(k)) return '#06b6d4';
    return '#ec4899';
  }
  for (const [key, val] of Object.entries(FIXED_SETLIST_TYPE_COLORS)) {
    if (key.toLowerCase() === k.toLowerCase()) return val;
  }
  return hashColor(k);
}

function isSetlistRowExcluded(row) {
  if (!row) return true;
  if (row.isExcluded) return true;
  const fullText = `${row.type || ''} ${row.streamTitle || ''} ${row.title || ''}`;
  return /接続エラー/i.test(fullText);
}

function isFullVideoExcluded(v) {
  if (!v) return true;
  if (typeof v.isExcluded === 'boolean') return v.isExcluded;
  const comp = String(v.composer || '').trim();
  return comp === '' || comp === '-' || comp === '－';
}

function renderExcludedTitleHtml(title, isExcluded, reasonLabel = '回数除外') {
  if (!isExcluded) {
    return `<span class="font-bold text-slate-800">${escapeHtml(title)}</span>`;
  }
  return `<span class="line-through text-slate-400">${escapeHtml(title)}</span> <span class="text-[9px] text-rose-500 font-semibold whitespace-nowrap">(${escapeHtml(reasonLabel)})</span>`;
}

function matchesSetlistScope(row, scope) {
  if (!row || isSetlistRowExcluded(row)) return false;
  const type = normalizeSetlistType(row.type || '歌枠');

  const isLive = /live|ライブ/i.test(type);
  if (scope === 'all') return true;
  if (scope === 'stream') return !isLive;
  if (scope === 'live_all') return isLive;
  if (scope === 'live_solo') return isLive && /solo|ソロ/i.test(type);
  if (scope === 'live_comp') return isLive && /comp|コンピ|guest|ゲスト/i.test(type);
  return true;
}

function getSetlistScopeMeta(scope) {
  const map = {
    stream:    { label: '歌枠（カラオケ含む）', short: '歌枠・カラオケ', color: '#9333ea' },
    live_all:  { label: 'LIVE（すべて）',       short: 'LIVE',          color: '#ec4899' },
    live_solo: { label: 'LIVE (solo)',         short: 'LIVE (solo)',   color: '#ec4899' },
    live_comp: { label: 'LIVE (Comp・Guest)',  short: 'LIVE (Comp・Guest)', color: '#06b6d4' },
    all:       { label: '全種別',              short: '全種別',         color: '#6366f1' }
  };
  return map[scope] || map.stream;
}


const DURATION_BANDS = [
  { key: 'd_30m',  label: '〜30m',    maxSec: 30 * 60,       color: '#06b6d4' }, // シアン
  { key: 'd_1h',   label: '30m〜',    maxSec: 60 * 60,       color: '#10b981' }, // エメラルド
  { key: 'd_1_5h', label: '1h〜',     maxSec: 90 * 60,       color: '#3b82f6' }, // ブルー
  { key: 'd_2h',   label: '1.5h〜',   maxSec: 120 * 60,      color: '#a855f7' }, // パープル
  { key: 'd_3h',   label: '2h〜',     maxSec: 180 * 60,      color: '#f59e0b' }, // アンバー
  { key: 'd_4h',   label: '3h〜',     maxSec: 240 * 60,      color: '#ec4899' }, // ピンク
  { key: 'd_6h',   label: '4h〜',     maxSec: 360 * 60,      color: '#f97316' }, // オレンジ
  { key: 'd_8h',   label: '6h〜',     maxSec: 480 * 60,      color: '#ef4444' }, // レッド
  { key: 'd_over', label: '8h〜',     maxSec: Infinity,      color: '#991b1b' }  // ダークレッド
];

function getDurationBandKey(sec) {
  const s = Math.max(0, Number(sec) || 0);
  for (const b of DURATION_BANDS) {
    if (s <= b.maxSec) return b.key;
  }
  return 'd_over';
}

function getTimeBandKey(hour) {
  const h = Number(hour);
  if (isNaN(h)) return 'night';
  if (h >= 5 && h <= 9) return 'morning';
  if (h >= 10 && h <= 15) return 'day';
  if (h >= 16 && h <= 18) return 'evening';
  if (h >= 19 && h <= 23) return 'night';
  return 'midnight';
}

function isSingingStream(st) {
  if (!st || st.isError) return false;
  const title = String(st.title || '');
  if (/接続エラー/i.test(title)) return false;
  const tags = Array.isArray(st.tags) ? st.tags : [];
  if (/live|ライブ/i.test(tags.join(' ')) && !/歌枠/i.test(tags.join(' '))) return false;
  return tags.some(t => /歌枠|カラオケ|弾き語り/i.test(t)) || /歌枠/i.test(title);
}

function classifyEventChannel(title, type) {
  const text = `${type || ''} ${title || ''}`;
  if (/オンライン|online|特典会|ネット|配信|リモート|通話|チェキチャ/i.test(text)) {
    return 'オンライン';
  }
  return 'リアル';
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderColoredBadge(label, hexColor) {
  const c = hexColor || '#9333ea';
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style="background-color:${c}1a; color:${c}; border:1px solid ${c}44;">${escapeHtml(label)}</span>`;
}

function formatSecondsHMS(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHours1Dec(totalSec) {
  const h = (Math.max(0, Number(totalSec) || 0)) / 3600;
  return h.toFixed(1);
}

function getStreamSeconds(st) {
  if (st && typeof st.seconds === 'number' && !isNaN(st.seconds)) {
    return Math.max(0, Math.round(st.seconds));
  }
  return Math.max(0, Math.round((Number(st && st.hours) || 0) * 3600));
}

function showToast(msg) {
  const el = document.getElementById('toastEl');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

function makeUid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function splitMultiValues(str) {
  return String(str || '')
    .split(/[,、\/／\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// 人物名・クレジット用（「/」「／」は別名・読み併記のため区切り文字にしない）
function splitPersonNames(str) {
  return String(str || '')
    .split(/[,、\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

