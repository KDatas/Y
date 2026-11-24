// =========================================================================
// 17. 初期化
// =========================================================================
window.addEventListener('DOMContentLoaded', async () => {
  initThemeMode();
  const hasLocal = loadStateFromLocal();
  if (!hasLocal) {
    await loadHostedDefaultData(false);
  }
  setupDragAndDrop();
  refreshYearSelectors();
  updateLoadedStatusUI();
  renderAll();
});
