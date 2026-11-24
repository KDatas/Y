// =========================================================================
// 5. Excel / CSV / JSON 読み込み＆パース
// =========================================================================
function toggleImporter() {
  const panel = document.getElementById('importerPanel');
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (willOpen) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setupDragAndDrop() {
  const dz = document.getElementById('dropZone');
  if (!dz) return;
  ['dragenter', 'dragover'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drop-active'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drop-active'); });
  });
  dz.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFilesSelected(e.dataTransfer.files);
    }
  });
}

function getCellDisplayText(ws, rIdx, cIdx, fallbackVal) {
  if (ws && typeof XLSX !== 'undefined') {
    const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
    const cell = ws[cellRef];
    if (cell) {
      if (typeof cell.w === 'string' && cell.w.trim() !== '') {
        if (cell.t === 'n' && cell.z && /[ymd]/i.test(cell.z) && !/[hHsS]/.test(cell.z)) {
          const parsed = XLSX.SSF ? XLSX.SSF.parse_date_code(cell.v) : null;
          if (parsed) {
            const hasYear = /y/i.test(cell.z);
            if (!hasYear) return `${parsed.m}/${parsed.d}`;
            return `${parsed.y}/${String(parsed.m).padStart(2, '0')}/${String(parsed.d).padStart(2, '0')}`;
          }
        }
        return cell.w.trim();
      }
      if (cell.v != null) return String(cell.v).trim();
    }
  }
  return fallbackVal == null ? '' : String(fallbackVal).trim();
}

function parseFlexibleDate(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return { year: val.getFullYear(), month: val.getMonth() + 1, day: val.getDate(), hour: val.getHours(), minute: val.getMinutes() };
  }
  if (typeof val === 'number' && val > 20000 && val < 90000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
    }
  }
  const s = String(val).trim();
  let m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*(\d{1,2})\s*[:：時]\s*(\d{1,2}))?/);
  if (m) {
    return { year: +m[1], month: +m[2], day: +m[3], hour: m[4] != null ? +m[4] : 12, minute: m[5] != null ? +m[5] : 0 };
  }
  m = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?/);
  if (m) {
    return { year: +m[1], month: +m[2], day: +m[3], hour: m[4] != null ? +m[4] : 12, minute: m[5] != null ? +m[5] : 0 };
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2000) {
    return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() };
  }
  return null;
}

function parseDurationSeconds(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') {
    if (val > 0 && val < 1) return Math.round(val * 86400);
    return Math.max(0, Math.round(val));
  }
  const s = String(val).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const hms = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hms) {
    return (+hms[1]) * 3600 + (+hms[2]) * 60 + (hms[3] ? +hms[3] : 0);
  }
  return 0;
}

async function handleFilesSelected(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const debugLines = [];
  let anyLoaded = false;

  if (appData.isSample) {
    const hasJson = files.some(f => f.name.toLowerCase().endsWith('.json'));
    if (!hasJson) {
      appData.streams = [];
      appData.fullVideos = [];
      appData.shortVideos = [];
      appData.setlist = [];
      appData.events = [];
      appData.isSample = false;
    }
  }

  for (const file of files) {
    try {
      const fname = file.name.toLowerCase();
      if (fname.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
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
          anyLoaded = true;
          debugLines.push(`✅ JSON復元: ${file.name}`);
        }
        continue;
      }

      let wb;
      if (fname.endsWith('.csv')) {
        const text = await file.text();
        wb = XLSX.read(text, { type: 'string', raw: true });
      } else {
        const buf = await file.arrayBuffer();
        wb = XLSX.read(buf, { type: 'array', cellDates: false });
      }
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
      if (rows.length < 2) continue;

      if (/stream/i.test(fname)) {
        const parsed = parseStreamingRows(rows, ws);
        appData.streams = parsed;
        appData.loadedFlags.streaming = true;
        anyLoaded = true;
        debugLines.push(`✅ Streaming: ${parsed.length}件 (${file.name})`);
      } else if (/short/i.test(fname)) {
        const parsed = parseShortRows(rows, ws);
        appData.shortVideos = parsed;
        appData.loadedFlags.short = true;
        anyLoaded = true;
        debugLines.push(`✅ Short: ${parsed.length}件 (${file.name})`);
      } else if (/set\s*list|setlist/i.test(fname)) {
        const parsed = parseSetlistRows(rows, ws);
        appData.setlist = parsed;
        appData.loadedFlags.setlist = true;
        anyLoaded = true;
        debugLines.push(`✅ Set list: ${parsed.length}曲 (${file.name})`);
      } else if (/ivent|event/i.test(fname)) {
        const parsed = parseEventRows(rows, ws);
        appData.events = parsed;
        appData.loadedFlags.event = true;
        anyLoaded = true;
        debugLines.push(`✅ Ivent: ${parsed.length}件 (${file.name})`);
      } else if (/song|full/i.test(fname)) {
        const parsed = parseSongRows(rows, ws);
        appData.fullVideos = parsed;
        appData.loadedFlags.song = true;
        anyLoaded = true;
        debugLines.push(`✅ Song (Full): ${parsed.length}件 (${file.name})`);
      } else {
        debugLines.push(`⚠️ 種別不明のためスキップ: ${file.name}`);
      }
    } catch (err) {
      console.error('File parse error:', file.name, err);
      debugLines.push(`❌ 読込エラー: ${file.name}`);
    }
  }

  const logEl = document.getElementById('importDebugLog');
  if (logEl && debugLines.length) {
    logEl.innerHTML = debugLines.map(l => `<div>${escapeHtml(l)}</div>`).join('');
    logEl.classList.remove('hidden');
  }

  if (anyLoaded) {
    appData.isSample = false;
    selectedSetlistTypes.clear();
    saveStateToLocal();
    refreshYearSelectors();
    updateLoadedStatusUI();
    renderAll();
    showToast('📁 データを読み込みました！');
  }
  document.getElementById('fileInput').value = '';
}

function parseStreamingRows(rows, ws) {
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || (!r[0] && !r[1])) continue;
    const dt = parseFlexibleDate(r[1]);
    if (!dt) continue;
    const title = getCellDisplayText(ws, i, 0, r[0]) || '(無題)';
    const errFlag = String(r[2] || '').trim();
    const isError = errFlag !== '' && !/^(0|false|no|なし|-)$/i.test(errFlag);
    const seconds = parseDurationSeconds(r[7]);
    const tags = splitMultiValues(r[8]);
    const mm = String(dt.month).padStart(2, '0');
    const dd = String(dt.day).padStart(2, '0');
    const hh = String(dt.hour).padStart(2, '0');
    const mn = String(dt.minute).padStart(2, '0');
    list.push({
      _uid: makeUid('st'),
      year: dt.year, month: dt.month, day: dt.day, hour: dt.hour,
      dow: new Date(dt.year, dt.month - 1, dt.day).getDay(),
      dateStr: `${dt.year}/${mm}/${dd} ${hh}:${mn}`,
      sortKey: `${dt.year}${mm}${dd}${hh}${mn}`,
      title,
      tags: tags.length ? tags : ['雑談'],
      seconds,
      hours: Math.round((seconds / 3600) * 1000) / 1000,
      isError
    });
  }
  return list;
}

function parseSongRows(rows, ws) {
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const title = getCellDisplayText(ws, i, 0, r[0]);
    const type = String(r[21] || 'Solo').trim() || 'Solo';
    if (/xfd|announce/i.test(`${title} ${type}`)) continue;
    const dt = parseFlexibleDate(r[16]);
    if (!dt) continue;
    const composer = String(r[9] || '').trim();
    const isNoComposer = composer === '' || composer === '-' || composer === '－';
    const mm = String(dt.month).padStart(2, '0');
    const dd = String(dt.day).padStart(2, '0');
    list.push({
      _uid: makeUid('fv'),
      year: dt.year, month: dt.month, day: dt.day,
      dateStr: `${dt.year}/${mm}/${dd}`,
      sortKey: `${dt.year}${mm}${dd}`,
      title,
      illustrator: String(r[6] || '').trim(),
      mix: String(r[7] || '').trim(),
      movie: String(r[8] || '').trim(),
      composer,
      vocal: String(r[10] || '雪見').trim(),
      platform: String(r[14] || 'YouTube').trim(),
      type,
      isExcluded: isNoComposer
    });
  }
  return list;
}

function parseShortRows(rows, ws) {
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const title = getCellDisplayText(ws, i, 0, r[0]);
    if (/xfd|announce/i.test(title)) continue;
    const dt = parseFlexibleDate(r[7]);
    if (!dt) continue;
    const platform = String(r[5] || '').trim();
    const plats = splitMultiValues(platform).map(p => p.toLowerCase());
    const isXOnly = plats.length > 0 && plats.every(p => p === 'x' || p === 'twitter' || p === 'x(twitter)');
    const hasFullRel = String(r[10] || '').trim() !== '';
    const mm = String(dt.month).padStart(2, '0');
    const dd = String(dt.day).padStart(2, '0');
    list.push({
      _uid: makeUid('sv'),
      year: dt.year, month: dt.month, day: dt.day,
      dateStr: `${dt.year}/${mm}/${dd}`,
      sortKey: `${dt.year}${mm}${dd}`,
      title,
      composer: String(r[3] || '').trim(),
      platform: platform || 'YouTube',
      category: hasFullRel ? 'Full関連' : 'Shortのみ',
      isExcluded: isXOnly
    });
  }
  return list;
}

function parseSetlistRows(rows, ws) {
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || (!r[0] && !r[3])) continue;
    const dt = parseFlexibleDate(r[1]);
    if (!dt) continue;
    const streamTitle = getCellDisplayText(ws, i, 0, r[0]) || '(無題)';
    const type = normalizeSetlistType(r[2] || '歌枠');
    const rawSongs = getCellDisplayText(ws, i, 3, r[3]);
    if (!rawSongs) continue;
    const songs = rawSongs.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
    const mm = String(dt.month).padStart(2, '0');
    const dd = String(dt.day).padStart(2, '0');
    songs.forEach(songTitle => {
      list.push({
        _uid: makeUid('sl'),
        year: dt.year, month: dt.month, day: dt.day,
        dateStr: `${dt.year}/${mm}/${dd}`,
        sortKey: `${dt.year}${mm}${dd}`,
        streamTitle,
        type,
        title: songTitle,
        url: ''
      });
    });
  }
  return list;
}

function parseEventRows(rows, ws) {
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const title = getCellDisplayText(ws, i, 0, r[0]);
    const type = String(r[1] || 'その他').trim();
    if (/^(record|release)$/i.test(type)) continue;
    const dt = parseFlexibleDate(r[3]);
    if (!dt) continue;
    const mm = String(dt.month).padStart(2, '0');
    const dd = String(dt.day).padStart(2, '0');
    list.push({
      _uid: makeUid('ev'),
      year: dt.year, month: dt.month, day: dt.day,
      dateStr: `${dt.year}/${mm}/${dd}`,
      sortKey: `${dt.year}${mm}${dd}`,
      title,
      type,
      channel: classifyEventChannel(title, type)
    });
  }
  return list;
}

function updateLoadedStatusUI() {
  const statusEl = document.getElementById('loadedFilesStatus');
  if (statusEl) {
    const items = [
      ['Streaming', appData.loadedFlags.streaming, appData.streams.length],
      ['Song', appData.loadedFlags.song, appData.fullVideos.length],
      ['Short', appData.loadedFlags.short, appData.shortVideos.length],
      ['Set list', appData.loadedFlags.setlist, appData.setlist.length],
      ['Ivent', appData.loadedFlags.event, appData.events.length]
    ];
    statusEl.innerHTML = items.map(([name, ok, cnt]) => {
      const cls = ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' : 'bg-slate-100 text-slate-500';
      return `<span class="px-2 py-0.5 rounded-full ${cls}">${name}: ${ok ? `読込済(${cnt})` : '未読込'}</span>`;
    }).join('');
  }
}

