import { splitIntoChunks, getOptimalConcurrency } from "./chunkUtils.js"; // ✅ concurrency fonksiyonu eklendi

export function dispatchTranslations(lang, worker) {
  // 🎯 1. Kısa metinler (data-translate)
  document.querySelectorAll("[data-translate='true']:not([lazy-translate])").forEach((el, i) => {
    if (!el.id) el.id = `el-${Date.now()}-${i}`;
    const original = el.dataset.tr || el.textContent.trim();
  
    // ✅ Orijinali sabitle (bir kereye mahsus)
    if (!el.dataset.tr) {
      el.dataset.tr = original;
    }
  
    // ✅ Eğer bu dile ait çeviri zaten varsa tekrar fetch etme
    if (el.dataset[lang]) {
      el.textContent = el.dataset[lang];
      el.style.opacity = "1";
      return;
    }
  
    el.style.opacity = "0.3"; // saydamlaştır
    worker.postMessage({
      type: "priority",
      elId: el.id,
      text: original,
      target: lang
    });
  });

  // 📄 2. Uzun metinler (lazy-translate)
  document.querySelectorAll("[lazy-translate='true']").forEach((el, i) => {
    if (!el.id) el.id = `lazy-el-${Date.now()}-${i}`;
    const fullText = el.textContent.trim();
    const chunks = splitIntoChunks(fullText);

    const concurrency = getOptimalConcurrency(); // 💡 Dinamik concurrency değeri alındı

    el.style.opacity = "0.3"; // ✅ Çeviri başlamadan saydamlaştır

    worker.postMessage({
      type: "lazy",
      elId: el.id,
      chunks,
      target: lang,
      concurrency // ✅ Web Worker'a gönderildi
    });
  });
}