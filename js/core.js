// =========================================================================
// 6. 年度一覧取得・セレクタ更新・フィルタリング
// =========================================================================
function getAvailableYears() {
  const ySet = new Set();
  [appData.streams, appData.fullVideos, appData.shortVideos, appData.setlist, appData.events].forEach(arr => {
    (arr || []).forEach(item => {
      if (item && typeof item.year === 'number' && item.year >= MIN_VISUAL_YEAR) {
        ySet.add(item.year);
      }
    });
  });
  const maxY = ySet.size ? Math.max(...ySet) : 2026;
  for (let y = MIN_VISUAL_YEAR; y <= maxY; y++) {
    ySet.add(y);
  }
  return Array.from(ySet).sort((a, b) => b - a);
}

function refreshYearSelectors() {
  const years = getAvailableYears();
  const sel = document.getElementById('yearFilterSelect');
  if (sel) {
    const prev = selectedYear;
    sel.innerHTML = years.map(y => `<option value="${y}" class="text-slate-800">対象：${y}年</option>`).join('') +
      `<option value="all" class="text-slate-800">対象：全期間（全年度）</option>`;
    if (prev === 'all' || years.includes(Number(prev))) {
      sel.value = prev;
    } else {
      selectedYear = String(years[0]);
      sel.value = selectedYear;
    }
  }

  const selA = document.getElementById('cmpYearA');
  const selB = document.getElementById('cmpYearB');
  if (selA && selB) {
    const prevA = selA.value;
    const prevB = selB.value;
    selA.innerHTML = years.map(y => `<option value="${y}">${y}年</option>`).join('');
    selB.innerHTML = years.map(y => `<option value="${y}">${y}年</option>`).join('') +
      `<option value="avg_all">過去全年平均 (2020年〜)</option>` +
      `<option value="avg_3y">直近3年平均</option>`;
    selA.value = years.includes(Number(prevA)) ? prevA : String(years[0]);
    if (prevB && (prevB === 'avg_all' || prevB === 'avg_3y' || years.includes(Number(prevB)))) {
      selB.value = prevB;
    } else {
      selB.value = years.length > 1 ? String(years[1]) : String(years[0]);
    }
  }
}

function onYearFilterChange() {
  selectedYear = document.getElementById('yearFilterSelect').value;
  if (selectedYear !== 'all') {
    autoCalYear = Number(selectedYear) || autoCalYear;
  }
  renderAll();
}

function filterBySelectedYear(arr) {
  if (selectedYear === 'all') return arr.slice();
  const y = Number(selectedYear);
  return arr.filter(item => item.year === y);
}

function getActiveMonthDivisor(streams, fulls, shorts, setlists, events) {
  if (selectedYear === 'all') {
    const ymSet = new Set();
    [...streams, ...fulls, ...shorts, ...setlists, ...events].forEach(x => {
      if (x && x.year && x.month) ymSet.add(`${x.year}-${x.month}`);
    });
    return Math.max(1, ymSet.size);
  }
  let maxM = 0;
  [...streams, ...fulls, ...shorts, ...setlists, ...events].forEach(x => {
    if (x && x.month > maxM) maxM = x.month;
  });
  return Math.max(1, maxM || 12);
}

// =========================================================================
// 7. タブ切替＆全体レンダリング
// =========================================================================
function switchTab(tabId) {
  activeTab = tabId;
  const tabs = ['overview', 'event', 'music', 'streaming', 'singing', 'archive', 'calendar'];
  tabs.forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tabBtn-${t}`);
    if (sec) sec.classList.toggle('hidden', t !== tabId);
    if (btn) {
      btn.className = t === tabId
        ? 'tab-btn-active flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer'
        : 'tab-btn-idle flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer';
    }
  });
  renderActiveTab();
}

function renderAll() {
  const titleEl = document.getElementById('reportTitle');
  if (titleEl) {
    titleEl.textContent = selectedYear === 'all' ? '全期間 活動レポート' : `${selectedYear}年 活動レポート`;
  }
  renderTopKPIs();
  renderActiveTab();
}

function renderActiveTab() {
  try {
    if (activeTab === 'overview') renderOverviewSection();
    else if (activeTab === 'event') renderEventSection();
    else if (activeTab === 'music') renderMusicSection();
    else if (activeTab === 'streaming') renderStreamingSection();
    else if (activeTab === 'singing') renderSingingSection();
    else if (activeTab === 'archive') renderArchiveSection();
    else if (activeTab === 'calendar') renderAutoCalendarSection();
  } catch (e) {
    console.error('Render error in tab:', activeTab, e);
  }
}

// =========================================================================
// 8. 上部KPIカード描画
// =========================================================================
function renderTopKPIs() {
  const streams = filterBySelectedYear(appData.streams);
  const validStreams = streams.filter(s => !s.isError);
  const totalSec = streams.reduce((a, b) => a + getStreamSeconds(b), 0);
  const fulls = filterBySelectedYear(appData.fullVideos).filter(v => !isFullVideoExcluded(v));
  const shorts = filterBySelectedYear(appData.shortVideos).filter(s => !s.isExcluded);
  const singingStreams = streams.filter(isSingingStream);
  const setlists = filterBySelectedYear(appData.setlist).filter(r => !isSetlistRowExcluded(r));
  const events = filterBySelectedYear(appData.events);

  const mDiv = getActiveMonthDivisor(streams, fulls, shorts, setlists, events);
  const isSingleYear = selectedYear !== 'all';
  const showForecast = isSingleYear && mDiv < 12;

  document.getElementById('kpiStreams').textContent = validStreams.length.toLocaleString();
  const sAvg = (validStreams.length / mDiv).toFixed(1);
  document.getElementById('kpiStreamsSub').textContent = showForecast
    ? `月平均 ${sAvg}回 / 年間予測 ${Math.round((validStreams.length / mDiv) * 12)}回`
    : `月平均 ${sAvg}回`;

  const totalH = Number(formatHours1Dec(totalSec));
  document.getElementById('kpiHours').textContent = totalH.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const hAvg = (totalH / mDiv).toFixed(1);
  const kpiHoursSub = document.getElementById('kpiHoursSub');
  kpiHoursSub.textContent = showForecast
    ? `月平均 ${hAvg}h / 年間予測 ${((totalH / mDiv) * 12).toFixed(1)}h`
    : `月平均 ${hAvg}h`;
  kpiHoursSub.title = `合計 ${formatSecondsHMS(totalSec)}`;

  document.getElementById('kpiFullVideos').textContent = fulls.length.toLocaleString();
  document.getElementById('kpiShortBadge').textContent = `Short ${shorts.length}本`;
  const fAvg = (fulls.length / mDiv).toFixed(1);
  document.getElementById('kpiFullSub').textContent = showForecast
    ? `月平均 ${fAvg}本 / 年間予測 ${Math.round((fulls.length / mDiv) * 12)}本`
    : `月平均 ${fAvg}本`;

  document.getElementById('kpiSinging').textContent = singingStreams.length.toLocaleString();
  document.getElementById('kpiSongsBadge').textContent = `計${setlists.length}曲`;
  const sgAvg = (singingStreams.length / mDiv).toFixed(1);
  document.getElementById('kpiSingingSub').textContent = showForecast
    ? `月平均 ${sgAvg}回 / 年間予測 ${Math.round((singingStreams.length / mDiv) * 12)}回`
    : `月平均 ${sgAvg}回`;

  document.getElementById('kpiEvents').textContent = events.length.toLocaleString();
  const evTypeCounts = {};
  events.forEach(e => {
    const tp = String(e.type || '').trim() || 'その他';
    evTypeCounts[tp] = (evTypeCounts[tp] || 0) + 1;
  });
  const evBreakdownText = Object.entries(evTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tp, cnt]) => `${tp} ${cnt}`)
    .join(' / ');
  const evBrk = document.getElementById('kpiEventsBreakdown');
  evBrk.textContent = events.length ? evBreakdownText : '内訳：-';
  evBrk.title = events.length ? evBreakdownText : '内訳：-';
}

