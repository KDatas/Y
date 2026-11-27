// =========================================================================
// 16. TAB 7: 📅 自動連携カレンダー（Excelデータ自動マッピング）
// =========================================================================
let autoCalViewMode = 'month'; // 'month' | 'year'
let autoCalYear = 2026;
let autoCalMonth = new Date().getMonth() + 1;
let autoCalFilterOpen = false;
let autoCalHolidays = {};
let autoCalHolidaysLoaded = false;

const autoCalHiddenSources = new Set(); // 'full' | 'short' | 'event' | 'stream'
const autoCalHiddenStreamTags = new Set(); // 配信タグ単位の非表示管理

const AUTO_CAL_SOURCES = [
  { key: 'stream', label: '配信',      emoji: '🎙️', color: '#9333ea' },
  { key: 'full',   label: 'Full動画',  emoji: '🎬', color: '#d946ef' },
  { key: 'short',  label: 'Short動画', emoji: '📱', color: '#0ea5e9' },
  { key: 'event',  label: 'イベント',  emoji: '🎪', color: '#ec4899' }
];

async function autoCalFetchHolidays(targetYear = null) {
  try {
    if (!autoCalHolidaysLoaded) {
      autoCalHolidaysLoaded = true;
      const res = await fetch('https://holidays-jp.github.io/api/v1/date.json');
      if (res.ok) Object.assign(autoCalHolidays, await res.json());
      const yearsToFetch = [2020, 2021, 2022, 2023, 2024, 2025];
      for (const y of yearsToFetch) {
        try {
          const ry = await fetch(`https://holidays-jp.github.io/api/v1/${y}/date.json`);
          if (ry.ok) Object.assign(autoCalHolidays, await ry.json());
        } catch (e) {}
      }
    }
    if (targetYear) {
      const ry = await fetch(`https://holidays-jp.github.io/api/v1/${targetYear}/date.json`);
      if (ry.ok) Object.assign(autoCalHolidays, await ry.json());
    }
  } catch (e) {
    console.warn('祝日データの取得をスキップしました:', e);
  }
  if (activeTab === 'calendar') {
    renderAutoCalBody();
  }
}

function setAutoCalViewMode(mode) {
  autoCalViewMode = mode;
  const yearBtn = document.getElementById('autoCalViewBtn-year');
  const monthBtn = document.getElementById('autoCalViewBtn-month');
  const activeCls = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer';
  const idleCls = 'px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  if (yearBtn) yearBtn.className = mode === 'year' ? activeCls : idleCls;
  if (monthBtn) monthBtn.className = mode === 'month' ? activeCls : idleCls;
  renderAutoCalendarSection();
}

async function autoCalChangeYear(delta) {
  autoCalYear += delta;
  await autoCalFetchHolidays(autoCalYear);
  renderAutoCalendarSection();
}

async function autoCalChangeMonth(delta) {
  autoCalMonth += delta;
  if (autoCalMonth < 1) {
    autoCalMonth = 12;
    autoCalYear -= 1;
    await autoCalFetchHolidays(autoCalYear);
  } else if (autoCalMonth > 12) {
    autoCalMonth = 1;
    autoCalYear += 1;
    await autoCalFetchHolidays(autoCalYear);
  }
  renderAutoCalendarSection();
}

function autoCalSelectMonth(m) {
  autoCalMonth = m;
  renderAutoCalendarSection();
}

function toggleAutoCalFilterPanel() {
  autoCalFilterOpen = !autoCalFilterOpen;
  const panel = document.getElementById('autoCalFilterPanel');
  const chev = document.getElementById('autoCalFilterChevron');
  if (panel) panel.classList.toggle('hidden', !autoCalFilterOpen);
  if (chev) chev.textContent = autoCalFilterOpen ? '▲' : '▼';
}

function getAutoCalYearRawItems(year) {
  const items = [];

  // 1. 配信（Streaming）：エラー除外以外をすべて対象
  (appData.streams || []).forEach(s => {
    if (s.year !== year || s.isError) return;
    const tags = (s.tags && s.tags.length) ? s.tags : ['雑談'];
    const primaryTag = tags[0];
    const mm = String(s.month).padStart(2, '0');
    const dd = String(s.day).padStart(2, '0');
    const timePart = (s.dateStr && s.dateStr.includes(' ')) ? s.dateStr.split(' ')[1] : '';
    items.push({
      uid: s._uid,
      source: 'stream',
      dateKey: `${year}-${mm}-${dd}`,
      year: s.year, month: s.month, day: s.day,
      sortKey: s.sortKey || `${year}${mm}${dd}0000`,
      title: s.title,
      sub: timePart ? `${timePart} · ${tags.join('/')}` : tags.join('/'),
      tags,
      emoji: tags.some(t => /歌枠|カラオケ/i.test(t)) ? '🎤' : (tags.some(t => /ゲーム/i.test(t)) ? '🎮' : '🎙️'),
      color: getStreamCatColor(primaryTag),
      raw: s
    });
  });

  // 2. Full動画（Song）：回数除外以外を対象
  (appData.fullVideos || []).forEach(v => {
    if (v.year !== year || isFullVideoExcluded(v)) return;
    const mm = String(v.month).padStart(2, '0');
    const dd = String(v.day).padStart(2, '0');
    items.push({
      uid: v._uid,
      source: 'full',
      dateKey: `${year}-${mm}-${dd}`,
      year: v.year, month: v.month, day: v.day,
      sortKey: `${year}${mm}${dd}0001`,
      title: v.title,
      sub: v.type || 'Solo',
      tags: [],
      emoji: '🎬',
      color: getFullTypeColor(v.type),
      raw: v
    });
  });

  // 3. Short動画（Short）：Xのみ除外以外を対象
  (appData.shortVideos || []).forEach(v => {
    if (v.year !== year || v.isExcluded) return;
    const mm = String(v.month).padStart(2, '0');
    const dd = String(v.day).padStart(2, '0');
    items.push({
      uid: v._uid,
      source: 'short',
      dateKey: `${year}-${mm}-${dd}`,
      year: v.year, month: v.month, day: v.day,
      sortKey: `${year}${mm}${dd}0002`,
      title: v.title,
      sub: v.category || 'Shortのみ',
      tags: [],
      emoji: '📱',
      color: getShortCatColor(v.category),
      raw: v
    });
  });

  // 4. イベント（Ivent）
  (appData.events || []).forEach(e => {
    if (e.year !== year) return;
    const mm = String(e.month).padStart(2, '0');
    const dd = String(e.day).padStart(2, '0');
    items.push({
      uid: e._uid,
      source: 'event',
      dateKey: `${year}-${mm}-${dd}`,
      year: e.year, month: e.month, day: e.day,
      sortKey: `${year}${mm}${dd}0000`,
      title: e.title,
      sub: e.type || 'イベント',
      tags: [],
      emoji: '🎪',
      color: getEventTypeColor(e.type),
      raw: e
    });
  });

  return items;
}

function filterAutoCalItems(rawItems) {
  const q = (document.getElementById('autoCalSearchInput')?.value || '').trim().toLowerCase();
  return rawItems.filter(it => {
    if (autoCalHiddenSources.has(it.source)) return false;
    if (it.source === 'stream') {
      const allTagsHidden = it.tags.length > 0 && it.tags.every(t => autoCalHiddenStreamTags.has(t));
      if (allTagsHidden) return false;
    }
    if (q) {
      const hay = `${it.title} ${it.sub} ${(it.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function autoCalToggleSource(srcKey) {
  if (autoCalHiddenSources.has(srcKey)) autoCalHiddenSources.delete(srcKey);
  else autoCalHiddenSources.add(srcKey);
  renderAutoCalFilters();
  renderAutoCalBody();
}

function autoCalToggleStreamTag(tag) {
  if (autoCalHiddenStreamTags.has(tag)) autoCalHiddenStreamTags.delete(tag);
  else autoCalHiddenStreamTags.add(tag);
  renderAutoCalFilters();
  renderAutoCalBody();
}

function autoCalApplyPreset(preset) {
  autoCalHiddenSources.clear();
  autoCalHiddenStreamTags.clear();
  if (preset === 'none') {
    AUTO_CAL_SOURCES.forEach(s => autoCalHiddenSources.add(s.key));
  } else if (preset === 'no_chat') {
    autoCalHiddenStreamTags.add('雑談');
  } else if (preset === 'works_events') {
    autoCalHiddenSources.add('stream');
  }
  renderAutoCalFilters();
  renderAutoCalBody();
}

function renderAutoCalendarSection() {
  autoCalFetchHolidays(autoCalYear);

  const yearLabel = document.getElementById('autoCalYearLabel');
  if (yearLabel) yearLabel.textContent = `${autoCalYear}年`;

  const monthNavWrap = document.getElementById('calMonthNavWrap');
  if (monthNavWrap) {
    monthNavWrap.classList.toggle('hidden', autoCalViewMode !== 'month');
  }

  const monthPillsEl = document.getElementById('autoCalMonthPills');
  if (monthPillsEl) {
    monthPillsEl.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const active = m === autoCalMonth;
      const cls = active
        ? 'px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-700 text-white shadow-sm transition cursor-pointer whitespace-nowrap'
        : 'px-1.5 py-0.5 rounded-lg text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer whitespace-nowrap';
      return `<button type="button" onclick="autoCalSelectMonth(${m})" class="${cls}">${m}月</button>`;
    }).join('');
  }

  renderAutoCalFilters();
  renderAutoCalBody();
}

function renderAutoCalFilters() {
  const rawItems = getAutoCalYearRawItems(autoCalYear);

  const srcWrap = document.getElementById('autoCalSourceFilters');
  if (srcWrap) {
    srcWrap.innerHTML = AUTO_CAL_SOURCES.map(src => {
      const cnt = rawItems.filter(it => it.source === src.key).length;
      const hidden = autoCalHiddenSources.has(src.key);
      const style = !hidden
        ? `background-color:${src.color}; color:#ffffff; border:1px solid ${src.color};`
        : `background-color:transparent; color:${src.color}; border:1px solid ${src.color}66; opacity:0.5;`;
      return `<button type="button" onclick="autoCalToggleSource('${src.key}')" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer" style="${style}">${src.emoji} ${src.label} (${cnt})</button>`;
    }).join('');
  }

  const tagWrap = document.getElementById('autoCalStreamTagFilters');
  if (tagWrap) {
    const tagCounts = {};
    rawItems.filter(it => it.source === 'stream').forEach(it => {
      (it.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    const tagEntries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    tagWrap.innerHTML = tagEntries.length
      ? tagEntries.map(([tag, cnt]) => {
          const hidden = autoCalHiddenStreamTags.has(tag);
          const c = getStreamCatColor(tag);
          const style = !hidden
            ? `background-color:${c}; color:#ffffff; border:1px solid ${c};`
            : `background-color:transparent; color:${c}; border:1px solid ${c}66; opacity:0.5;`;
          const safeTag = escapeHtml(tag).replace(/'/g, "\\'");
          return `<button type="button" onclick="autoCalToggleStreamTag('${safeTag}')" class="px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer" style="${style}">${escapeHtml(tag)} (${cnt})</button>`;
        }).join('')
      : '<span class="text-[10px] text-slate-400">配信データなし</span>';
  }

  const filterBtnText = document.getElementById('autoCalFilterBtnText');
  if (filterBtnText) {
    const hiddenCount = autoCalHiddenSources.size + autoCalHiddenStreamTags.size;
    filterBtnText.textContent = hiddenCount > 0 ? `フィルター (${hiddenCount}件OFF)` : 'フィルター';
  }
}

function renderAutoCalBody() {
  const container = document.getElementById('autoCalBodyContainer');
  const countBadge = document.getElementById('autoCalCountBadge');
  if (!container) return;

  const rawItems = getAutoCalYearRawItems(autoCalYear);
  const visibleItems = filterAutoCalItems(rawItems);

  window._autoCalItemsByUid = {};
  window._autoCalItemsByDate = {};
  visibleItems.forEach(it => {
    window._autoCalItemsByUid[it.uid] = it;
    if (!window._autoCalItemsByDate[it.dateKey]) window._autoCalItemsByDate[it.dateKey] = [];
    window._autoCalItemsByDate[it.dateKey].push(it);
  });
  Object.values(window._autoCalItemsByDate).forEach(arr => {
    arr.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  });

  if (autoCalViewMode === 'month') {
    const monthItems = visibleItems.filter(it => it.month === autoCalMonth);
    if (countBadge) countBadge.textContent = `${autoCalYear}年${autoCalMonth}月：${monthItems.length}件`;
    container.innerHTML = buildAutoCalMonthHtml(autoCalYear, autoCalMonth);
  } else {
    if (countBadge) countBadge.textContent = `${autoCalYear}年：${visibleItems.length}件`;
    container.innerHTML = buildAutoCalYearHtml(autoCalYear);
  }
}

function buildAutoCalMonthHtml(year, month) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dows = ['日', '月', '火', '水', '木', '金', '土'];

  let html = `<table class="w-full table-fixed border-collapse text-xs">
    <thead>
      <tr class="bg-purple-50 text-purple-950 border-b border-purple-100">`;
  dows.forEach((d, idx) => {
    const colCls = idx === 0 ? 'text-rose-600' : (idx === 6 ? 'text-sky-600' : '');
    html += `<th class="py-2 px-1 text-center font-black ${colCls}">${d}</th>`;
  });
  html += `</tr></thead><tbody class="divide-y divide-slate-100">`;

  let day = 1;
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  for (let cellIdx = 0; cellIdx < totalCells; cellIdx++) {
    if (cellIdx % 7 === 0) html += `<tr class="divide-x divide-slate-100">`;
    const dow = cellIdx % 7;

    if (cellIdx < firstDow || day > daysInMonth) {
      html += `<td class="cal-hatch h-28 align-top"></td>`;
    } else {
      const d = day++;
      const mm = String(month).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${year}-${mm}-${dd}`;
      const holName = autoCalHolidays[dateKey];
      const isRed = dow === 0 || !!holName;
      const isBlue = !isRed && dow === 6;
      const bgCls = isRed ? 'cal-sun' : (isBlue ? 'cal-sat' : '');
      const numCls = isRed ? 'text-rose-600' : (isBlue ? 'text-sky-600' : 'text-slate-700');
      const dayItems = (window._autoCalItemsByDate && window._autoCalItemsByDate[dateKey]) || [];

      html += `<td class="cal-month-cell h-28 p-1.5 align-top transition cursor-pointer ${bgCls}" onclick="openAutoCalDayModal('${dateKey}')">
        <div class="flex items-start justify-between gap-1 mb-1">
          <span class="font-black text-xs ${numCls}">${d}</span>
          ${holName ? `<span class="cal-hol-label text-[9px] font-bold text-rose-500 truncate text-right">${escapeHtml(holName)}</span>` : ''}
        </div>
        <div class="space-y-1">
          ${dayItems.map(it => `
            <button type="button" onclick="event.stopPropagation(); openAutoCalItemDetail('${it.uid}')" class="cal-item-chip w-full" style="background-color:${it.color}1a; color:${it.color}; border-color:${it.color}44;" title="${escapeHtml(it.title)} (${escapeHtml(it.sub)})">
              <span class="shrink-0 leading-tight">${it.emoji}</span>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-slate-800 leading-snug line-clamp-2">${escapeHtml(it.title)}</div>
                <div class="text-[9px] opacity-80 truncate">${escapeHtml(it.sub)}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </td>`;
    }
    if (cellIdx % 7 === 6) html += `</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function buildAutoCalYearHtml(year) {
  let html = `<table class="cal-table text-xs border-collapse">
    <colgroup>
      <col style="width:38px;" />
      ${Array.from({ length: 12 }, () => '<col style="width:156px;" />').join('')}
    </colgroup>
    <thead>
      <tr>
        <th class="cal-sticky-corner py-2 px-1 text-center font-black">日</th>`;
  for (let m = 1; m <= 12; m++) {
    html += `<th class="cal-sticky-month py-2 px-2 text-center font-black border-l border-purple-100 cursor-pointer hover:underline" onclick="autoCalSelectMonth(${m}); setAutoCalViewMode('month');" title="${m}月の月間表示へ切替">${m}月</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let d = 1; d <= 31; d++) {
    const isMilestone = d % 5 === 0;
    const rowCls = isMilestone ? 'cal-milestone-row' : '';
    const dayNumCls = isMilestone ? 'font-black text-purple-700' : 'font-bold text-slate-500';
    html += `<tr class="${rowCls}">
      <th class="cal-sticky-day py-1.5 px-1 text-center font-mono text-[11px] border-t border-slate-100 ${dayNumCls}">${d}</th>`;

    for (let m = 1; m <= 12; m++) {
      const dateObj = new Date(year, m - 1, d);
      const isValid = dateObj.getFullYear() === year && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
      if (!isValid) {
        html += `<td class="cal-hatch border-t border-l border-slate-100"></td>`;
        continue;
      }

      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${year}-${mm}-${dd}`;
      const dow = dateObj.getDay();
      const holName = autoCalHolidays[dateKey];
      const isRed = dow === 0 || !!holName;
      const isBlue = !isRed && dow === 6;
      const bgCls = isRed ? 'cal-sun' : (isBlue ? 'cal-sat' : '');
      const dayItems = (window._autoCalItemsByDate && window._autoCalItemsByDate[dateKey]) || [];

      html += `<td class="cal-cell-valid border-t border-l border-slate-100 p-1 align-top cursor-pointer ${bgCls}" onclick="openAutoCalDayModal('${dateKey}')">
        ${holName ? `<div class="cal-hol-label text-[9px] font-bold text-rose-500 text-right truncate mb-0.5">${escapeHtml(holName)}</div>` : ''}
        <div class="space-y-1">
          ${dayItems.map(it => `
            <button type="button" onclick="event.stopPropagation(); openAutoCalItemDetail('${it.uid}')" class="cal-item-chip w-full" style="background-color:${it.color}1a; color:${it.color}; border-color:${it.color}44;" title="${escapeHtml(it.title)} (${escapeHtml(it.sub)})">
              <span class="shrink-0 leading-tight">${it.emoji}</span>
              <span class="cal-title-ellipsis font-bold text-slate-800 flex-1">${escapeHtml(it.title)}</span>
            </button>
          `).join('')}
        </div>
      </td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function openAutoCalItemDetail(uid) {
  const it = window._autoCalItemsByUid && window._autoCalItemsByUid[uid];
  if (!it) return;
  if (it.source === 'stream') {
    showStreamDetailModal(`🎙️ ${it.raw.dateStr} 配信詳細`, [it.raw]);
  } else if (it.source === 'full') {
    showVideoDetailModal(`🎬 ${it.raw.dateStr} Full動画詳細`, [it.raw], 'full');
  } else if (it.source === 'short') {
    showVideoDetailModal(`📱 ${it.raw.dateStr} Short動画詳細`, [it.raw], 'short');
  } else if (it.source === 'event') {
    showEventDetailModal(`🎪 ${it.raw.dateStr} イベント詳細`, [it.raw]);
  }
}

function openAutoCalDayModal(dateKey) {
  const items = (window._autoCalItemsByDate && window._autoCalItemsByDate[dateKey]) || [];
  const [y, m, d] = dateKey.split('-').map(Number);
  const dows = ['日', '月', '火', '水', '木', '金', '土'];
  const dowStr = dows[new Date(y, m - 1, d).getDay()];
  const holName = autoCalHolidays[dateKey];
  const titleStr = `📅 ${y}年${m}月${d}日 (${dowStr})${holName ? ` · ${holName}` : ''}`;

  const html = items.length
    ? `<div class="space-y-2">
        ${items.map(it => `
          <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
            <div class="flex items-start gap-2 min-w-0">
              <span class="text-base shrink-0">${it.emoji}</span>
              <div class="min-w-0">
                <div class="font-bold text-slate-800 break-words">${escapeHtml(it.title)}</div>
                <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
                  ${renderColoredBadge(it.sub, it.color)}
                </div>
              </div>
            </div>
            <button type="button" onclick="closeDetailModal(); openEditModal('${it.source}','${it.uid}')" class="px-2.5 py-1 rounded-lg border border-purple-200 text-[11px] font-bold text-purple-700 hover:bg-purple-50 shrink-0 cursor-pointer">✏️ 編集</button>
          </div>
        `).join('')}
      </div>`
    : '<div class="py-8 text-center text-slate-400">この日の活動データはありません</div>';

  openDetailModal(titleStr, `${items.length}件`, html);
}

