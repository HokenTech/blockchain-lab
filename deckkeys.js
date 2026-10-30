/* Incluso nelle pagine dentro le slide: rimanda al deck i tasti di navigazione (se non si sta scrivendo)
   e chiama window.onDeckShow() quando la slide che contiene la pagina viene mostrata. */
(function () {
  if (window.parent === window) return;
  var KEYS = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End", "f", "F", "n", "N", "h", "H", "Escape"];
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (typing || KEYS.indexOf(e.key) < 0) return;
    e.preventDefault();
    window.parent.postMessage({ deckKey: e.key, shift: e.shiftKey }, "*");
  });
  window.addEventListener("message", function (e) {
    if (e.data && e.data.deck === "show" && typeof window.onDeckShow === "function") window.onDeckShow();
  });
})();
