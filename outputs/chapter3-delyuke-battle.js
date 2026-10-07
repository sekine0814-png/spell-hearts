/* Chapter 3 rebuilt scene loader. Kept at the legacy filename so the
   current spell-hearts.html does not need to be edited. */
(() => {
  if (window.__chapterThreeRebuildLoader) return;
  window.__chapterThreeRebuildLoader = true;
  const script = document.createElement('script');
  script.src = 'chapter3-rebuild.js?v=1';
  script.defer = true;
  document.head.append(script);
})();
