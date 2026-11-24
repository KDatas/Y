// 2. 自動生成カレンダータブ（月間表示・年間表示）
const autoCalState = {
    mode: 'month',
    month: new Date().getMonth() + 1,
    filterOpen: false,
    enabledCats: new Set(['stream', 'song', 'short', 'event']),
    disabledTags: new Set(),
    holidays: {}
};

async function initAutoCalendarHolidays() {
    try {
        const res = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (res.ok) Object.assign(autoCalState.holidays, await res.json());
    } catch (e) {}
    if (appState.activeTab === 'calendar') renderAutoCalendarSection();
}

function setAutoCalMode(mode) {
    autoCalState.mode = mode;
    renderAutoCalendarSection();
}

function calChangeYear(delta) {
    appState.targetYear += delta;
    document.getElementById('yearSelect').value = String(appState.targetYear);
    document.getElementById('headerYearLabel').textContent = appState.targetYear;
    renderAll();
}

function calChangeMonth(delta) {
    let m = autoCalState.month + delta;
    if (m < 1) { m = 12; calChangeYear(-1); return; }
    if (m > 12) { m = 1; calChangeYear(1); return; }
    autoCalState.month = m;
    renderAutoCalendarSection();
}

function calSelectMonth(m) {
    autoCalState.month = m;
    autoCalState.mode = 'month';
    renderAutoCalendarSection();
}

function toggleAutoCalFilterPanel() {
    autoCalState.filterOpen = !autoCalState.filterOpen;
    document.getElementById('calFilterPanel').classList.toggle('hidden', !autoCalState.filterOpen);
}

function getAutoCalItemsForYear(year) {
    const items = [];
    appState.data.streams.forEach((s, idx) => {
        if (getItemYear(s.date) === year) {
            items.push({ cat: 'stream', date: s.date, title: s.title, sub: `${s.startTime ? s.startTime + ' ・ ' : ''}${s.tag || '雑談'}`, tag: s.tag || '雑談', idx });
        }
    });
    appState.data.songs.forEach((v, idx) => {
        if (getItemYear(v.date) === year) {
            items.push({ cat: 'song', date: v.date, title: v.title, sub: v.type || 'FULL動画', tag: '', idx });
        }
    });
    appState.data.shorts.forEach((v, idx) => {
        if (getItemYear(v.date) === year && !v.xOnly) {
            items.push({ cat: 'short', date: v.date, title: v.title, sub: v.type || 'Short', tag: '', idx });
        }
    });
    appState.data.events.forEach((e, idx) => {
        if (getItemYear(e.date) === year) {
            items.push({ cat: 'event', date: e.date, title: e.title, sub: e.type || 'イベント', tag: '', idx });
        }
    });
    return items;
}

function setAutoCalPreset(preset) {
    const allTags = [...new Set(appState.data.streams.map(s => s.tag || '雑談'))];
    if (preset === 'all') {
        autoCalState.enabledCats = new Set(['stream', 'song', 'short', 'event']);
        autoCalState.disabledTags.clear();
    } else if (preset === 'none') {
        autoCalState.enabledCats.clear();
    } else if (preset === 'no_chat') {
        autoCalState.enabledCats = new Set(['stream', 'song', 'short', 'event']);
        autoCalState.disabledTags = new Set(allTags.filter(t => t.includes('雑談')));
    } else if (preset === 'media_event') {
        autoCalState.enabledCats = new Set(['song', 'short', 'event']);
    }
    renderAutoCalendarSection();
}

function renderAutoCalendarSection() {
    const y = appState.targetYear;
    document.getElementById('calYearLabel').textContent = `${y}年`;

    const bM = document.getElementById('btnCalModeMonth');
    const bY = document.getElementById('btnCalModeYear');
    const monthNav = document.getElementById('calMonthNavWrap');

    if (autoCalState.mode === 'month') {
        bM.className = 'px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white transition';
        bY.className = 'px-3 py-1 rounded-full text-xs font-bold text-purple-700 transition';
        monthNav.classList.remove('hidden');
    } else {
        bY.className = 'px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white transition';
        bM.className = 'px-3 py-1 rounded-full text-xs font-bold text-purple-700 transition';
        monthNav.classList.add('hidden');
    }

    const mBtns = document.getElementById('calMonthButtons');
    mBtns.innerHTML = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const active = m === autoCalState.month;
        return `<button onclick="calSelectMonth(${m})" class="px-2 py-0.5 rounded-full text-[11px] font-bold transition ${active ? 'bg-purple-600 text-white' : 'text-purple-800 hover:bg-purple-200/60'}">${m}月</button>`;
    }).join('');

    renderAutoCalFilters();
    renderAutoCalBody();
}

function renderAutoCalFilters() {
    const cats = [
        { id: 'stream', label: '🎙️ 配信' },
        { id: 'song', label: '🎵 FULL動画' },
        { id: 'short', label: '📱 Short' },
        { id: 'event', label: '🎪 イベント' }
    ];
    document.getElementById('calCatFilterList').innerHTML = cats.map(c => {
        const on = autoCalState.enabledCats.has(c.id);
        return `<button onclick="toggleAutoCalCat('${c.id}')" class="px-3 py-1 rounded-full font-bold border transition ${on ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-100 text-slate-400 border-slate-200'}">${c.label}</button>`;
    }).join('');

    const tags = [...new Set(appState.data.streams.map(s => s.tag || '雑談'))];
    document.getElementById('calTagFilterList').innerHTML = tags.map(t => {
        const on = !autoCalState.disabledTags.has(t);
        return `<button onclick="toggleAutoCalTag('${escapeHtml(t)}')" class="px-2.5 py-1 rounded-full font-bold border transition ${on ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-slate-100 text-slate-400 border-slate-200'}">${escapeHtml(t)}</button>`;
    }).join('');
}

function toggleAutoCalCat(cat) {
    if (autoCalState.enabledCats.has(cat)) autoCalState.enabledCats.delete(cat);
    else autoCalState.enabledCats.add(cat);
    renderAutoCalendarSection();
}

function toggleAutoCalTag(tag) {
    if (autoCalState.disabledTags.has(tag)) autoCalState.disabledTags.delete(tag);
    else autoCalState.disabledTags.add(tag);
    renderAutoCalendarSection();
}

function renderAutoCalBody() {
    const y = appState.targetYear;
    const kw = (document.getElementById('calSearchInput')?.value || '').trim().toLowerCase();
    const allItems = getAutoCalItemsForYear(y).filter(it => {
        if (!autoCalState.enabledCats.has(it.cat)) return false;
        if (it.cat === 'stream' && autoCalState.disabledTags.has(it.tag)) return false;
        if (kw && !it.title.toLowerCase().includes(kw)) return false;
        return true;
    });

    const container = document.getElementById('autoCalContainer');
    if (autoCalState.mode === 'month') {
        const mItems = allItems.filter(it => getItemMonth(it.date) === autoCalState.month);
        document.getElementById('calCountBadge').textContent = `${y}年${autoCalState.month}月：${mItems.length}件`;
        container.innerHTML = buildAutoCalMonthHtml(y, autoCalState.month, mItems);
    } else {
        document.getElementById('calCountBadge').textContent = `${y}年：${allItems.length}件`;
        container.innerHTML = buildAutoCalYearHtml(y, allItems);
    }
}

function getCalBadgeStyle(cat) {
    if (cat === 'event') return { icon: '🎪', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-200 border-rose-400/40' };
    if (cat === 'song') return { icon: '🎵', cls: 'bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/40' };
    if (cat === 'short') return { icon: '📱', cls: 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/40' };
    return { icon: '🎙️', cls: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/40' };
}

function buildAutoCalMonthHtml(year, month, items) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const weeks = ['日', '月', '火', '水', '木', '金', '土'];

    let html = '<div class="grid grid-cols-7 border-b border-slate-200 bg-purple-50/70 dark:bg-purple-950/40 text-center text-xs font-extrabold">';
    weeks.forEach((w, idx) => {
        const c = idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-sky-500' : 'text-slate-600';
        html += `<div class="py-2.5 ${c}">${w}</div>`;
    });
    html += '</div><div class="grid grid-cols-7">';

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDay + 1;
        if (dayNum < 1 || dayNum > daysInMonth) {
            html += '<div class="min-h-[115px] border-r border-b border-slate-100 cal-hatch"></div>';
            continue;
        }
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dow = i % 7;
        const hol = autoCalState.holidays[dateStr];
        const bgCls = (dow === 0 || hol) ? 'cal-sun-hol' : (dow === 6 ? 'cal-sat' : '');
        const dayItems = items.filter(it => it.date === dateStr);

        html += `<div class="min-h-[115px] p-1.5 border-r border-b border-slate-100 flex flex-col gap-1 ${bgCls}">
            <div class="flex items-center justify-between text-xs font-extrabold px-1">
                <span class="${dow === 0 || hol ? 'text-rose-500' : dow === 6 ? 'text-sky-500' : ''}">${dayNum}</span>
                ${hol ? `<span class="text-[10px] text-rose-500 truncate max-w-[85px]">${escapeHtml(hol)}</span>` : ''}
            </div>
            <div class="space-y-1">
                ${dayItems.map(it => {
                    const st = getCalBadgeStyle(it.cat);
                    return `<div onclick="openEditModal('${it.cat === 'stream' ? 'streams' : it.cat === 'song' ? 'songs' : it.cat === 'short' ? 'shorts' : 'events'}', ${it.idx})" title="${escapeHtml(it.title)}" class="p-1.5 rounded-lg border text-[11px] leading-snug cursor-pointer hover:brightness-95 transition ${st.cls}">
                        <div class="font-bold line-clamp-2">${st.icon} ${escapeHtml(it.title)}</div>
                        <div class="text-[10px] opacity-75 truncate mt-0.5">${escapeHtml(it.sub)}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }
    html += '</div>';
    return html;
}

function buildAutoCalYearHtml(year, items) {
    let html = '<div class="cal-year-wrap"><table class="cal-year-table"><colgroup><col style="width:38px">';
    for (let m = 1; m <= 12; m++) html += '<col style="width:156px">';
    html += '</colgroup><thead><tr><th class="cal-sticky-corner py-2 text-xs font-extrabold text-center">日</th>';
    for (let m = 1; m <= 12; m++) {
        html += `<th onclick="calSelectMonth(${m})" class="cal-sticky-month py-2 text-xs font-extrabold text-center cursor-pointer hover:underline">${m}月</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let d = 1; d <= 31; d++) {
        html += `<tr><th class="cal-sticky-day py-1.5 text-xs font-bold text-center">${d}</th>`;
        for (let m = 1; m <= 12; m++) {
            const dt = new Date(year, m - 1, d);
            const valid = dt.getFullYear() === year && dt.getMonth() === m - 1 && dt.getDate() === d;
            if (!valid) {
                html += '<td class="cal-year-cell cal-hatch"></td>';
                continue;
            }
            const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dow = dt.getDay();
            const hol = autoCalState.holidays[dateStr];
            const bgCls = (dow === 0 || hol) ? 'cal-sun-hol' : (dow === 6 ? 'cal-sat' : '');
            const dayItems = items.filter(it => it.date === dateStr);

            html += `<td class="cal-year-cell ${bgCls}">
                ${hol ? `<div class="text-[9px] text-rose-500 font-bold text-right truncate">${escapeHtml(hol)}</div>` : ''}
                <div class="space-y-1">
                    ${dayItems.map(it => {
                        const st = getCalBadgeStyle(it.cat);
                        return `<div onclick="openEditModal('${it.cat === 'stream' ? 'streams' : it.cat === 'song' ? 'songs' : it.cat === 'short' ? 'shorts' : 'events'}', ${it.idx})" title="${escapeHtml(it.title)}" class="px-1.5 py-1 rounded border text-[10px] leading-tight cursor-pointer hover:brightness-95 ${st.cls}">
                            <div class="cal-clamp-2 font-bold">${st.icon} ${escapeHtml(it.title)}</div>
                        </div>`;
                    }).join('')}
                </div>
            </td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
}
