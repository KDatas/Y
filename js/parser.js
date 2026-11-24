// Excel / CSV / JSON ファイル解析
async function handleFilesUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    for (const file of files) {
        const nameLow = file.name.toLowerCase();
        if (nameLow.endsWith('.json')) {
            const text = await file.text();
            try {
                const json = JSON.parse(text);
                if (json.data) {
                    if (json.data.streams) appState.data.streams = json.data.streams;
                    if (json.data.songs) appState.data.songs = json.data.songs;
                    if (json.data.shorts) appState.data.shorts = json.data.shorts;
                    if (json.data.events) appState.data.events = json.data.events;
                    if (json.data.setlists) appState.data.setlists = json.data.setlists;
                }
            } catch (e) {
                alert('JSONの読み込みに失敗しました: ' + file.name);
            }
            continue;
        }

        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        for (const sheetName of wb.SheetNames) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
            if (!rows.length) continue;
            routeParsedSheet(rows, `${file.name} ${sheetName}`);
        }
    }

    event.target.value = '';
    saveStateToStorage();
    updateLoadedStatusUI();
    renderAll();
}

function routeParsedSheet(rows, hint) {
    const h = hint.toLowerCase();
    const cols = Object.keys(rows[0] || {}).join(' ').toLowerCase();

    if (h.includes('set') || cols.includes('曲名') || cols.includes('song title')) {
        appState.data.setlists = parseSetlistRows(rows);
    } else if (h.includes('short')) {
        appState.data.shorts = parseVideoRows(rows, true);
    } else if (h.includes('song') || h.includes('music') || h.includes('full')) {
        appState.data.songs = parseVideoRows(rows, false);
    } else if (h.includes('ivent') || h.includes('event')) {
        appState.data.events = parseEventRows(rows);
    } else if (h.includes('stream') || cols.includes('配信時間') || cols.includes('時間')) {
        appState.data.streams = parseStreamRows(rows);
    }
}

function pickField(row, candidates) {
    for (const key of Object.keys(row)) {
        const k = key.trim().toLowerCase();
        for (const c of candidates) {
            if (k === c.toLowerCase() || k.includes(c.toLowerCase())) return row[key];
        }
    }
    return '';
}

function parseHoursValue(val) {
    if (typeof val === 'number') {
        return val < 1 ? +(val * 24).toFixed(2) : +val.toFixed(2);
    }
    const s = String(val || '').trim();
    const hm = s.match(/(\d+):(\d{1,2})/);
    if (hm) return +(parseInt(hm[1], 10) + parseInt(hm[2], 10) / 60).toFixed(2);
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : +num.toFixed(2);
}

function parseStreamRows(rows) {
    return rows.map(r => {
        const date = normalizeDateStr(pickField(r, ['日付', 'date', '配信日']));
        const title = String(pickField(r, ['タイトル', 'title', '配信タイトル'])).trim();
        const hours = parseHoursValue(pickField(r, ['配信時間', '時間', 'hours', 'duration']));
        const tag = String(pickField(r, ['タグ', 'tag', '種別', 'ジャンル']) || '雑談').trim();
        const startTime = String(pickField(r, ['開始', 'start', '時刻']) || '').trim();
        return { date, title, hours, tag, startTime };
    }).filter(x => x.date && x.title);
}

function parseVideoRows(rows, isShort) {
    return rows.map(r => {
        const date = normalizeDateStr(pickField(r, ['日付', 'date', '投稿日']));
        const title = String(pickField(r, ['タイトル', 'title', '曲名'])).trim();
        const type = String(pickField(r, ['種別', 'type', '区分', 'タグ']) || (isShort ? 'Short' : 'Solo')).trim();
        const xOnly = /xのみ|x限定|twitter/i.test(type + ' ' + String(pickField(r, ['備考', 'note', 'platform'])));
        return { date, title, type, xOnly };
    }).filter(x => x.date && x.title);
}

function parseEventRows(rows) {
    return rows.map(r => {
        const date = normalizeDateStr(pickField(r, ['日付', 'date', '開催日']));
        const title = String(pickField(r, ['タイトル', 'title', 'イベント名'])).trim();
        const rawType = String(pickField(r, ['種別', 'type', '区分']) || 'イベント').trim();
        if (/record|release/i.test(rawType)) return null;
        return { date, title, type: rawType };
    }).filter(x => x && x.date && x.title);
}

function parseSetlistRows(rows) {
    return rows.map(r => {
        const date = normalizeDateStr(pickField(r, ['日付', 'date', '歌唱日']));
        const title = String(pickField(r, ['曲名', 'タイトル', 'title', 'song'])).trim();
        const artist = String(pickField(r, ['アーティスト', 'artist', '本家']) || '').trim();
        const rawType = String(pickField(r, ['種別', 'type', '区分']) || '歌枠').trim();
        const type = classifySingType(rawType);
        const streamTitle = String(pickField(r, ['配信タイトル', 'イベント名', '枠名']) || '').trim();
        return { date, title, artist, type, streamTitle };
    }).filter(x => x.date && x.title);
}
