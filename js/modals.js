// =========================================================================
// 15. ソート切替・詳細モーダル・データ編集モーダル
// =========================================================================
function toggleSortOrder(key) {
  sortOrders[key] = sortOrders[key] === 'desc' ? 'asc' : 'desc';
  const btn = document.getElementById(`sortBtn-${key}`);
  if (btn) {
    btn.textContent = sortOrders[key] === 'desc' ? '日付：降順 ↓' : '日付：昇順 ↑';
  }
  if (key === 'event') renderEventTable();
  else if (key === 'full' || key === 'short') renderMusicTablesOnly();
  else if (key === 'stream') renderStreamLogsTable();
  else if (key === 'setlist') filterSetlistDisplay();
}

function openDetailModal(title, countText, bodyHtml) {
  document.getElementById('detailModalTitle').textContent = title;
  document.getElementById('detailModalCount').textContent = countText;
  document.getElementById('detailModalBody').innerHTML = bodyHtml;
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

function showStreamDetailModal(title, list) {
  const sorted = (list || []).slice().sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const totalSec = sorted.reduce((a, b) => a + getStreamSeconds(b), 0);
  const html = sorted.length
    ? `<table class="w-full text-left">
        <thead class="bg-purple-50 text-purple-950">
          <tr><th class="py-1.5 px-2">日時</th><th class="py-1.5 px-2">タイトル</th><th class="py-1.5 px-2">タグ</th><th class="py-1.5 px-2 text-right">時間</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${sorted.map(s => `<tr class="hover:bg-purple-50/40 ${s.isError ? 'bg-slate-50/80 text-slate-400' : ''}">
            <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(s.dateStr)}</td>
            <td class="py-1.5 px-2">${renderExcludedTitleHtml(s.title, !!s.isError, '回数除外')}</td>
            <td class="py-1.5 px-2"><div class="flex flex-wrap gap-1">${(s.tags || []).map(t => renderColoredBadge(t, getStreamCatColor(t))).join('')}</div></td>
            <td class="py-1.5 px-2 font-mono text-right whitespace-nowrap text-slate-600">${formatSecondsHMS(getStreamSeconds(s))}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : '<div class="py-8 text-center text-slate-400">該当する配信データがありません</div>';
  openDetailModal(title, `${sorted.length}件 ／ 合計 ${formatSecondsHMS(totalSec)} (${formatHours1Dec(totalSec)}h)`, html);
}

function showVideoDetailModal(title, list, mode) {
  const sorted = (list || []).slice().sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const validCnt = sorted.filter(v => mode === 'full' ? !isFullVideoExcluded(v) : !v.isExcluded).length;
  const html = sorted.length
    ? `<table class="w-full text-left">
        <thead class="bg-purple-50 text-purple-950">
          <tr><th class="py-1.5 px-2">投稿日</th><th class="py-1.5 px-2">タイトル</th><th class="py-1.5 px-2">種別/分類</th><th class="py-1.5 px-2">作曲者</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${sorted.map(v => {
            const excluded = mode === 'full' ? isFullVideoExcluded(v) : !!v.isExcluded;
            return `<tr class="hover:bg-purple-50/40 ${excluded ? 'bg-slate-50/80 text-slate-400' : ''}">
              <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(v.dateStr)}</td>
              <td class="py-1.5 px-2">${renderExcludedTitleHtml(v.title, excluded, '回数除外')}</td>
              <td class="py-1.5 px-2">${mode === 'full' ? renderColoredBadge(v.type || 'Solo', getFullTypeColor(v.type)) : renderColoredBadge(v.category || 'Shortのみ', getShortCatColor(v.category))}</td>
              <td class="py-1.5 px-2 text-slate-600">${escapeHtml(v.composer || '-')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div class="py-8 text-center text-slate-400">該当する動画データがありません</div>';
  const countText = validCnt === sorted.length ? `${sorted.length}本` : `${validCnt}本（除外含む全${sorted.length}件）`;
  openDetailModal(title, countText, html);
}

function showEventDetailModal(title, list) {
  const sorted = (list || []).slice().sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const html = sorted.length
    ? `<table class="w-full text-left">
        <thead class="bg-purple-50 text-purple-950">
          <tr><th class="py-1.5 px-2">日付</th><th class="py-1.5 px-2">タイトル</th><th class="py-1.5 px-2">区分</th><th class="py-1.5 px-2">種別</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${sorted.map(e => {
            const ch = e.channel || classifyEventChannel(e.title, e.type);
            const chColor = ch === 'リアル' ? '#ec4899' : '#0ea5e9';
            return `<tr class="hover:bg-purple-50/40">
              <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(e.dateStr)}</td>
              <td class="py-1.5 px-2 font-bold text-slate-800">${escapeHtml(e.title)}</td>
              <td class="py-1.5 px-2">${renderColoredBadge(ch, chColor)}</td>
              <td class="py-1.5 px-2">${renderColoredBadge(e.type || 'その他', getEventTypeColor(e.type))}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div class="py-8 text-center text-slate-400">該当するイベントデータがありません</div>';
  openDetailModal(title, `${sorted.length}件`, html);
}

function showSetlistDetailModal(title, list) {
  const sorted = (list || []).slice().sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const html = sorted.length
    ? `<table class="w-full text-left">
        <thead class="bg-purple-50 text-purple-950">
          <tr><th class="py-1.5 px-2">日付</th><th class="py-1.5 px-2">曲名</th><th class="py-1.5 px-2">種別</th><th class="py-1.5 px-2">配信 / LIVE</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${sorted.map(r => {
            const excluded = isSetlistRowExcluded(r);
            return `<tr class="hover:bg-purple-50/40 ${excluded ? 'bg-slate-50/80 text-slate-400' : ''}">
              <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(r.dateStr)}</td>
              <td class="py-1.5 px-2">${renderExcludedTitleHtml(r.title, excluded, '回数除外')}</td>
              <td class="py-1.5 px-2">${renderColoredBadge(normalizeSetlistType(r.type), getSetlistTypeColor(r.type))}</td>
              <td class="py-1.5 px-2 text-slate-600">${escapeHtml(r.streamTitle)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div class="py-8 text-center text-slate-400">該当するセットリストデータがありません</div>';
  openDetailModal(title, `${sorted.length}曲`, html);
}

function showSetlistSessionsDetailModal(title, list) {
  const sessMap = {};
  (list || []).forEach(r => {
    const tp = normalizeSetlistType(r.type);
    const key = `${r.dateStr}_${r.streamTitle}_${tp}`;
    if (!sessMap[key]) {
      sessMap[key] = {
        dateStr: r.dateStr,
        sortKey: r.sortKey,
        streamTitle: r.streamTitle,
        type: tp,
        songsCount: 0
      };
    }
    sessMap[key].songsCount += 1;
  });
  const sessions = Object.values(sessMap).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const html = sessions.length
    ? `<table class="w-full text-left">
        <thead class="bg-purple-50 text-purple-950">
          <tr><th class="py-1.5 px-2">日付</th><th class="py-1.5 px-2">配信 / LIVE タイトル</th><th class="py-1.5 px-2">種別</th><th class="py-1.5 px-2 text-right">曲数</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${sessions.map(s => `<tr class="hover:bg-purple-50/40">
            <td class="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">${escapeHtml(s.dateStr)}</td>
            <td class="py-1.5 px-2 font-bold text-slate-800">${escapeHtml(s.streamTitle)}</td>
            <td class="py-1.5 px-2">${renderColoredBadge(s.type, getSetlistTypeColor(s.type))}</td>
            <td class="py-1.5 px-2 font-mono text-right whitespace-nowrap text-slate-600">${s.songsCount}曲</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : '<div class="py-8 text-center text-slate-400">該当する開催データがありません</div>';
  openDetailModal(title, `${sessions.length}回`, html);
}

// レパートリー・初披露・定番曲・レア曲クリック用：重複を除いた一意の曲リスト
let uniqueSongsModalState = { title: '', list: [], sortMode: 'count' };

function setUniqueSongsModalSort(mode) {
  uniqueSongsModalState.sortMode = mode;
  renderUniqueSongsDetailModal();
}

function toggleUniqueSongsModalDateSort() {
  const next = uniqueSongsModalState.sortMode === 'date_desc' ? 'date_asc' : 'date_desc';
  setUniqueSongsModalSort(next);
}

function showUniqueSongsDetailModal(title, list) {
  uniqueSongsModalState = { title, list: list || [], sortMode: 'count' };
  renderUniqueSongsDetailModal();
}

function renderUniqueSongsDetailModal() {
  const { title, list, sortMode } = uniqueSongsModalState;
  const map = {};
  list.forEach(r => {
    const k = String(r.title || '').trim();
    if (!k) return;
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });

  const entries = Object.entries(map).map(([songTitle, rows]) => {
    const latest = rows.slice().sort((a, b) => b.sortKey.localeCompare(a.sortKey))[0];
    return { songTitle, rows, latest };
  });

  entries.sort((a, b) => {
    if (sortMode === 'date_desc') {
      return b.latest.sortKey.localeCompare(a.latest.sortKey)
        || b.rows.length - a.rows.length
        || a.songTitle.localeCompare(b.songTitle, 'ja');
    }
    if (sortMode === 'date_asc') {
      return a.latest.sortKey.localeCompare(b.latest.sortKey)
        || b.rows.length - a.rows.length
        || a.songTitle.localeCompare(b.songTitle, 'ja');
    }
    return b.rows.length - a.rows.length
      || b.latest.sortKey.localeCompare(a.latest.sortKey)
      || a.songTitle.localeCompare(b.songTitle, 'ja');
  });

  const activeBtnCls = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-700 text-white shadow-sm transition cursor-pointer';
  const idleBtnCls = 'px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition cursor-pointer';
  const dateArrow = sortMode === 'date_desc' ? ' ↓' : (sortMode === 'date_asc' ? ' ↑' : ' ⇅');
  const countArrow = sortMode === 'count' ? ' ↓' : ' ⇅';

  const toolbarHtml = entries.length
    ? `<div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span class="text-[11px] text-slate-400">列見出しクリックでも並び替えできます</span>
        <div class="inline-flex items-center gap-1 bg-purple-50 p-0.5 rounded-xl border border-purple-100">
          <button type="button" onclick="setUniqueSongsModalSort('count')" class="${sortMode === 'count' ? activeBtnCls : idleBtnCls}">回数順</button>
          <button type="button" onclick="setUniqueSongsModalSort('date_desc')" class="${sortMode === 'date_desc' ? activeBtnCls : idleBtnCls}">最新歌唱日 ↓</button>
          <button type="button" onclick="setUniqueSongsModalSort('date_asc')" class="${sortMode === 'date_asc' ? activeBtnCls : idleBtnCls}">最新歌唱日 ↑</button>
        </div>
      </div>`
    : '';

  const html = entries.length
    ? `${toolbarHtml}<table class="w-full text-left">
        <thead class="bg-purple-50 text-purple-950 sticky top-0 z-10">
          <tr>
            <th class="py-1.5 px-2">曲名</th>
            <th class="py-1.5 px-2 text-center cursor-pointer hover:bg-purple-100 select-none whitespace-nowrap" onclick="setUniqueSongsModalSort('count')">回数${countArrow}</th>
            <th class="py-1.5 px-2">種別内訳</th>
            <th class="py-1.5 px-2 text-right cursor-pointer hover:bg-purple-100 select-none whitespace-nowrap" onclick="toggleUniqueSongsModalDateSort()">最新歌唱日${dateArrow}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${entries.map(({ songTitle, rows, latest }) => {
            const typeCounts = {};
            rows.forEach(r => {
              const tp = normalizeSetlistType(r.type);
              typeCounts[tp] = (typeCounts[tp] || 0) + 1;
            });
            const badgesHtml = Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
              .map(([tp, cnt]) => {
                const tc = getSetlistTypeColor(tp);
                return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap" style="background-color:${tc}1a; color:${tc}; border:1px solid ${tc}44;">${escapeHtml(tp)} ${cnt}</span>`;
              }).join('');
            return `<tr class="hover:bg-purple-50/40">
              <td class="py-1.5 px-2 font-bold text-slate-800">${escapeHtml(songTitle)}</td>
              <td class="py-1.5 px-2 text-center"><span class="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100/70 text-purple-700 border border-purple-200">×${rows.length}</span></td>
              <td class="py-1.5 px-2"><div class="flex flex-wrap gap-1">${badgesHtml}</div></td>
              <td class="py-1.5 px-2 font-mono text-right text-slate-500 whitespace-nowrap">${escapeHtml(latest.dateStr)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div class="py-8 text-center text-slate-400">該当する曲がありません</div>';
  openDetailModal(title, `${entries.length}曲（延べ ${list.length}回）`, html);
}

function openEditModal(kind, uid) {
  let item = null;
  if (kind === 'stream') item = appData.streams.find(x => x._uid === uid);
  else if (kind === 'full') item = appData.fullVideos.find(x => x._uid === uid);
  else if (kind === 'short') item = appData.shortVideos.find(x => x._uid === uid);
  else if (kind === 'event') item = appData.events.find(x => x._uid === uid);
  else if (kind === 'setlist') item = appData.setlist.find(x => x._uid === uid);
  if (!item) return;

  currentEditTarget = { kind, uid };
  const titleInput = document.getElementById('editFieldTitle');
  const tagsInput = document.getElementById('editFieldTags');
  const tagLabel = document.getElementById('editFieldTagLabel');
  const extraWrap = document.getElementById('editFieldExtraWrap');
  const extraLabel = document.getElementById('editFieldExtraLabel');
  const extraInput = document.getElementById('editFieldExtra');
  const flagWrap = document.getElementById('editFieldFlagWrap');
  const flagInput = document.getElementById('editFieldFlag');
  const flagLabel = document.getElementById('editFieldFlagLabel');

  titleInput.value = item.title || '';
  extraWrap.classList.add('hidden');
  flagWrap.classList.add('hidden');

  if (kind === 'stream') {
    document.getElementById('editModalHeading').textContent = '✏️ 配信ログを編集';
    tagLabel.textContent = '種別タグ（カンマ区切り）';
    tagsInput.value = (item.tags || []).join(', ');
    flagWrap.classList.remove('hidden');
    flagLabel.textContent = '配信回数カウントから除外する（接続エラー等）';
    flagInput.checked = !!item.isError;
  } else if (kind === 'full') {
    document.getElementById('editModalHeading').textContent = '✏️ Full動画を編集';
    tagLabel.textContent = '種別 (Solo / Original / Collab / Live action)';
    tagsInput.value = item.type || 'Solo';
    extraWrap.classList.remove('hidden');
    extraLabel.textContent = '作曲者';
    extraInput.value = item.composer || '';
    flagWrap.classList.remove('hidden');
    flagLabel.textContent = '本数カウントから除外する（作曲者未記入など）';
    flagInput.checked = isFullVideoExcluded(item);
  } else if (kind === 'short') {
    document.getElementById('editModalHeading').textContent = '✏️ Short動画を編集';
    tagLabel.textContent = '分類 (Full関連 / Shortのみ)';
    tagsInput.value = item.category || 'Shortのみ';
    extraWrap.classList.remove('hidden');
    extraLabel.textContent = '作曲者';
    extraInput.value = item.composer || '';
    flagWrap.classList.remove('hidden');
    flagLabel.textContent = '本数カウントから除外する（Xのみ投稿等）';
    flagInput.checked = !!item.isExcluded;
  } else if (kind === 'event') {
    document.getElementById('editModalHeading').textContent = '✏️ イベントを編集';
    tagLabel.textContent = '種別（ライブ / リリイベ / ファンミ / 特典会 等）';
    tagsInput.value = item.type || '';
    extraWrap.classList.remove('hidden');
    extraLabel.textContent = '区分（リアル / オンライン）';
    extraInput.value = item.channel || classifyEventChannel(item.title, item.type);
  } else if (kind === 'setlist') {
    document.getElementById('editModalHeading').textContent = '✏️ セトリ曲を編集';
    tagLabel.textContent = '種別（歌枠 / LIVE (solo) / LIVE (Comp) / LIVE (Guest) / カラオケ 等）';
    tagsInput.value = normalizeSetlistType(item.type);
    extraWrap.classList.remove('hidden');
    extraLabel.textContent = '配信・LIVEタイトル';
    extraInput.value = item.streamTitle || '';
    flagWrap.classList.remove('hidden');
    flagLabel.textContent = '回数カウントから除外する';
    flagInput.checked = isSetlistRowExcluded(item);
  }

  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  currentEditTarget = null;
  document.getElementById('editModal').classList.add('hidden');
}

function saveEditModal() {
  if (!currentEditTarget) return;
  const { kind, uid } = currentEditTarget;
  const titleVal = document.getElementById('editFieldTitle').value.trim();
  const tagsVal = document.getElementById('editFieldTags').value.trim();
  const extraVal = document.getElementById('editFieldExtra').value.trim();
  const flagVal = document.getElementById('editFieldFlag').checked;

  if (kind === 'stream') {
    const item = appData.streams.find(x => x._uid === uid);
    if (item) {
      item.title = titleVal || item.title;
      const parsedTags = splitMultiValues(tagsVal);
      item.tags = parsedTags.length ? parsedTags : ['雑談'];
      item.isError = flagVal;
    }
  } else if (kind === 'full') {
    const item = appData.fullVideos.find(x => x._uid === uid);
    if (item) {
      item.title = titleVal || item.title;
      item.type = tagsVal || 'Solo';
      item.composer = extraVal;
      item.isExcluded = flagVal;
    }
  } else if (kind === 'short') {
    const item = appData.shortVideos.find(x => x._uid === uid);
    if (item) {
      item.title = titleVal || item.title;
      item.category = tagsVal || 'Shortのみ';
      item.composer = extraVal;
      item.isExcluded = flagVal;
    }
  } else if (kind === 'event') {
    const item = appData.events.find(x => x._uid === uid);
    if (item) {
      item.title = titleVal || item.title;
      item.type = tagsVal || 'その他';
      item.channel = extraVal === 'オンライン' ? 'オンライン' : 'リアル';
    }
  } else if (kind === 'setlist') {
    const item = appData.setlist.find(x => x._uid === uid);
    if (item) {
      item.title = titleVal || item.title;
      item.type = normalizeSetlistType(tagsVal || '歌枠');
      item.streamTitle = extraVal || item.streamTitle;
      item.isExcluded = flagVal;
    }
  }

  saveStateToLocal();
  closeEditModal();
  renderAll();
  showToast('💾 変更を保存して反映しました');
}

