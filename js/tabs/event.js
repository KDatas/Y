// =========================================================================
// 10. TAB 2: 🎪 イベント
// =========================================================================
function renderEventSection() {
  const events = filterBySelectedYear(appData.events);
  const realEvs = events.filter(e => (e.channel || classifyEventChannel(e.title, e.type)) === 'リアル');
  const netEvs = events.filter(e => (e.channel || classifyEventChannel(e.title, e.type)) !== 'リアル');
  const tot = events.length;

  document.getElementById('evKpiTotal').textContent = tot;
  document.getElementById('badgeEventCount').textContent = `${tot}回`;

  const refEl = document.getElementById('evChannelRef');
  if (refEl) {
    const realPct = tot ? Math.round((realEvs.length / tot) * 100) : 0;
    const netPct = tot ? Math.round((netEvs.length / tot) * 100) : 0;
    refEl.textContent = `参考：リアル ${realEvs.length}回 (${realPct}%) / オンライン ${netEvs.length}回 (${netPct}%)`;
  }

  const typeMap = {};
  events.forEach(e => { const t = e.type || 'その他'; typeMap[t] = (typeMap[t] || 0) + 1; });
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  const badgesEl = document.getElementById('evTypeSummaryBadges');
  if (badgesEl) {
    badgesEl.innerHTML = typeEntries.length
      ? typeEntries.map(([tp, cnt]) => {
          const c = getEventTypeColor(tp);
          const pct = tot ? Math.round((cnt / tot) * 100) : 0;
          return `<button onclick="openEventTypeModal('${escapeHtml(tp).replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition hover:opacity-80 cursor-pointer" style="background-color:${c}18; color:${c}; border:1px solid ${c}44;">
            <span>${escapeHtml(tp)}</span>
            <span class="font-black">${cnt}回</span>
            <span class="text-[10px] opacity-75">(${pct}%)</span>
          </button>`;
        }).join('')
      : '<span class="text-xs text-slate-400">データなし</span>';
  }

  createChart('eventType', 'chartEventType', {
    type: 'doughnut',
    data: {
      labels: typeEntries.length ? typeEntries.map(x => x[0]) : ['データなし'],
      datasets: [{
        data: typeEntries.length ? typeEntries.map(x => x[1]) : [1],
        backgroundColor: typeEntries.length ? typeEntries.map(x => getEventTypeColor(x[0])) : ['#e2e8f0'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      onClick: (evt, elems) => {
        if (!elems.length || !typeEntries.length) return;
        const tp = typeEntries[elems[0].index][0];
        showEventDetailModal(`🏷️ イベント種別「${tp}」一覧`, events.filter(e => (e.type || 'その他') === tp));
      },
      plugins: {
        centerText: { label: '合計', unit: '回' },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      }
    }
  });

  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  const activeTypes = typeEntries.length ? typeEntries.map(x => x[0]) : ['ライブ'];
  const evMonthlyDS = activeTypes.map(tp => ({
    label: tp,
    data: Array.from({ length: 12 }, (_, mi) => events.filter(e => (e.type || 'その他') === tp && e.month === mi + 1).length),
    backgroundColor: getEventTypeColor(tp),
    borderRadius: 3
  }));
  createChart('eventMonthly', 'chartEventMonthly', {
    type: 'bar',
    data: { labels: months, datasets: evMonthlyDS },
    options: {
      responsive: true, maintainAspectRatio: false,
      onClick: (evt, elems) => {
        if (!elems.length) return;
        const m = elems[0].index + 1;
        showEventDetailModal(`📅 ${m}月 イベント一覧`, events.filter(e => e.month === m));
      },
      plugins: {
        barTotal: { enabled: true, unit: '回', summaryElId: 'badgeEventCount' },
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#f1f5f9' } }
      }
    }
  });

  renderEventTable();
}

function openEventTypeModal(tp) {
  const events = filterBySelectedYear(appData.events);
  showEventDetailModal(`🏷️ イベント種別「${tp}」一覧`, events.filter(e => (e.type || 'その他') === tp));
}

function setEventLogMonthFilter(m) {
  eventLogMonthFilter = m;
  renderEventTable();
}

function renderEventLogMonthPills(yearEvents) {
  const wrap = document.getElementById('eventLogMonthPills');
  if (!wrap) return;
  const counts = {};
  yearEvents.forEach(e => {
    if (e.month >= 1 && e.month <= 12) counts[e.month] = (counts[e.month] || 0) + 1;
  });
  const activeCls = 'px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-700 text-white shadow-sm transition cursor-pointer';
  const idleCls = 'px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  const emptyCls = 'px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:bg-slate-50 transition cursor-pointer opacity-60';

  let html = `<button type="button" onclick="setEventLogMonthFilter('all')" class="${eventLogMonthFilter === 'all' ? activeCls : idleCls}">全月 (${yearEvents.length})</button>`;
  for (let m = 1; m <= 12; m++) {
    const cnt = counts[m] || 0;
    const isSel = String(eventLogMonthFilter) === String(m);
    const cls = isSel ? activeCls : (cnt > 0 ? idleCls : emptyCls);
    html += `<button type="button" onclick="setEventLogMonthFilter('${m}')" class="${cls}">${m}月</button>`;
  }
  wrap.innerHTML = html;
}

function renderEventTable() {
  const yearEvents = filterBySelectedYear(appData.events);
  renderEventLogMonthPills(yearEvents);

  const events = yearEvents
    .filter(e => eventLogMonthFilter === 'all' || String(e.month) === String(eventLogMonthFilter))
    .sort((a, b) =>
      sortOrders.event === 'desc' ? b.sortKey.localeCompare(a.sortKey) : a.sortKey.localeCompare(b.sortKey)
    );
  const tbody = document.getElementById('eventTableBody');
  if (!tbody) return;
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">イベントデータがありません</td></tr>';
    return;
  }
  tbody.innerHTML = events.map(e => {
    const ch = e.channel || classifyEventChannel(e.title, e.type);
    return `<tr class="hover:bg-purple-50/40">
      <td class="py-1.5 px-2.5 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(e.dateStr)}</td>
      <td class="py-1.5 px-2.5 font-bold text-slate-800">${escapeHtml(e.title)}</td>
      <td class="py-1.5 px-2.5">${renderColoredBadge(e.type || 'その他', getEventTypeColor(e.type))}</td>
      <td class="py-1.5 px-2.5 text-[11px] text-slate-400 whitespace-nowrap">${escapeHtml(ch)}</td>
      <td class="py-1.5 px-2 text-center"><button onclick="openEditModal('event','${e._uid}')" class="text-slate-400 hover:text-purple-700 cursor-pointer" title="編集">✏️</button></td>
    </tr>`;
  }).join('');
}

