// 詳細一覧モーダル・編集モーダル制御
let currentUniqueListCache = [];
let currentUniqueSortMode = 'count';

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}

function openDetailModal(title, sub, itemsHtml) {
    document.getElementById('detailModalTitle').textContent = title;
    document.getElementById('detailModalSub').textContent = sub || '';
    document.getElementById('detailModalSortBar').classList.add('hidden');
    document.getElementById('detailModalBody').innerHTML = itemsHtml || '<p class="text-slate-400 text-center py-6">該当データがありません</p>';
    document.getElementById('detailModal').classList.remove('hidden');
}

function openUniqueSongListModal(title, sub, songStatsList) {
    currentUniqueListCache = [...songStatsList];
    currentUniqueSortMode = 'count';
    document.getElementById('detailModalTitle').textContent = title;
    document.getElementById('detailModalSub').textContent = sub || '';
    document.getElementById('detailModalSortBar').classList.remove('hidden');
    updateUniqueSortButtons();
    renderUniqueSongModalList();
    document.getElementById('detailModal').classList.remove('hidden');
}

function setUniqueModalSort(mode) {
    currentUniqueSortMode = mode;
    updateUniqueSortButtons();
    renderUniqueSongModalList();
}

function updateUniqueSortButtons() {
    const map = {
        count: 'btnUniqueSortCount',
        date_desc: 'btnUniqueSortDesc',
        date_asc: 'btnUniqueSortAsc'
    };
    Object.entries(map).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (k === currentUniqueSortMode) {
            el.className = 'px-2.5 py-1 rounded-full font-bold bg-purple-600 text-white';
        } else {
            el.className = 'px-2.5 py-1 rounded-full font-bold bg-white border border-slate-200 text-slate-600';
        }
    });
}

function renderUniqueSongModalList() {
    const sorted = [...currentUniqueListCache].sort((a, b) => {
        if (currentUniqueSortMode === 'date_desc') {
            return b.latestDate.localeCompare(a.latestDate) || b.count - a.count;
        }
        if (currentUniqueSortMode === 'date_asc') {
            return a.latestDate.localeCompare(b.latestDate) || b.count - a.count;
        }
        return b.count - a.count || b.latestDate.localeCompare(a.latestDate);
    });

    const html = sorted.map(item => `
        <div class="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 hover:bg-purple-50/40">
            <div class="min-w-0">
                <div class="font-bold truncate">${escapeHtml(item.title)}</div>
                <div class="text-[11px] text-slate-400">最新歌唱日: ${item.latestDate}</div>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-extrabold flex-shrink-0">×${item.count}</span>
        </div>
    `).join('');

    document.getElementById('detailModalBody').innerHTML = html || '<p class="text-slate-400 text-center py-6">該当曲がありません</p>';
}

function openEditModal(category, index) {
    const list = appState.data[category];
    if (!list || !list[index]) return;
    const item = list[index];
    document.getElementById('editCategory').value = category;
    document.getElementById('editIndex').value = index;
    document.getElementById('editDate').value = item.date || '';
    document.getElementById('editTitle').value = item.title || '';
    document.getElementById('editExtra').value = category === 'streams' ? (item.tag || '') : (item.type || '');
    document.getElementById('editModal').classList.remove('hidden');
}

function saveEditedItem() {
    const category = document.getElementById('editCategory').value;
    const index = parseInt(document.getElementById('editIndex').value, 10);
    const list = appState.data[category];
    if (!list || !list[index]) return;

    list[index].date = document.getElementById('editDate').value;
    list[index].title = document.getElementById('editTitle').value.trim();
    const extra = document.getElementById('editExtra').value.trim();
    if (category === 'streams') list[index].tag = extra;
    else if (category === 'setlists') list[index].type = classifySingType(extra);
    else list[index].type = extra;

    saveStateToStorage();
    closeModal('editModal');
    renderAll();
}

function deleteEditedItem() {
    if (!confirm('このデータを削除しますか？')) return;
    const category = document.getElementById('editCategory').value;
    const index = parseInt(document.getElementById('editIndex').value, 10);
    appState.data[category]?.splice(index, 1);
    saveStateToStorage();
    closeModal('editModal');
    renderAll();
}
