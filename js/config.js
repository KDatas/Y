// 共通設定・定数・ヘルパー
const STORAGE_KEY = 'yukimi_report_v2_data';

const SING_TYPE_COLORS = {
    '歌枠': '#7c3aed',
    'カラオケ': '#d97706',
    'LIVE (solo)': '#e11d48',
    'LIVE (Comp)': '#9333ea',
    'LIVE (Guest)': '#2563eb'
};

const EVENT_TYPE_COLORS = {
    'Live': '#e11d48',
    'ワンマン': '#be123c',
    'リリイベ': '#8b5cf6',
    '特典会': '#ec4899',
    'ファンミ': '#f59e0b',
    'オンラインライブ': '#0284c7',
    'イベント': '#6366f1'
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, t => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[t]));
}

function normalizeDateStr(val) {
    if (!val && val !== 0) return '';
    if (val instanceof Date && !isNaN(val)) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number' && val > 20000 && val < 80000) {
        const utcDays = Math.floor(val - 25569);
        const dObj = new Date(utcDays * 86400 * 1000);
        if (!isNaN(dObj)) {
            return `${dObj.getUTCFullYear()}-${String(dObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dObj.getUTCDate()).padStart(2, '0')}`;
        }
    }
    const s = String(val).trim();
    const m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
    if (m) {
        return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
    return '';
}

function getItemYear(dateStr) {
    if (!dateStr || dateStr.length < 4) return null;
    return parseInt(dateStr.slice(0, 4), 10);
}

function getItemMonth(dateStr) {
    if (!dateStr || dateStr.length < 7) return null;
    return parseInt(dateStr.slice(5, 7), 10);
}

function classifySingType(raw) {
    const s = String(raw || '').trim();
    const low = s.toLowerCase();
    if (low.includes('guest') || s.includes('ゲスト')) return 'LIVE (Guest)';
    if (low.includes('comp') || s.includes('対バン') || s.includes('フェス')) return 'LIVE (Comp)';
    if (low.includes('live') || low.includes('solo') || s.includes('ライブ') || s.includes('ワンマン')) return 'LIVE (solo)';
    if (s.includes('カラオケ')) return 'カラオケ';
    return '歌枠';
}
