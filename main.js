import { dispatchTranslations } from "./modules/translateDispatcher.js";
import { detectLanguageByIP } from "./modules/geoDetect.js";
import { showLanguageNotice } from "./modules/notice.js";
import { showTranslationStatus, hideTranslationStatus } from "./modules/translateStatus.js"; // 🆕 Eklendi

const worker = new Worker("./modules/translate.worker.js", { type: "module" });

async function populateLanguageDropdown() {
  const res = await fetch("./public/languages.json");
  const languageData = await res.json();
  const select = document.getElementById("languageSelect");

  select.innerHTML = "";

  for (const [code, { name, emoji }] of Object.entries(languageData)) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${emoji || "🌐"} ${name}`;
    select.appendChild(option);
  }

  return Object.keys(languageData);
}

const select = document.getElementById("languageSelect");

select.addEventListener("change", () => {
  const selectedLang = select.value;
  localStorage.setItem("preferredLang", selectedLang);
  showTranslationStatus(); // 🆕 Kullanıcı dil değiştirince bildirim göster
  dispatchTranslations(selectedLang, worker);

  const notice = document.getElementById("lang-notice");
  if (notice) notice.remove();
});

window.addEventListener("DOMContentLoaded", async () => {
  const dropdownLangs = await populateLanguageDropdown();
  const backFlag = sessionStorage.getItem("backToOriginal");

  let langToUse;
  let shouldShowNotice = false;

  if (!backFlag && !localStorage.getItem("preferredLang")) {
    let detectedLang = await detectLanguageByIP();
    if (!dropdownLangs.includes(detectedLang)) {
      detectedLang = "en";
    }

    langToUse = detectedLang;
    shouldShowNotice = true;
  } else {
    langToUse = localStorage.getItem("preferredLang") || "tr";
  }

  select.value = langToUse;
  showTranslationStatus(); // 🆕 Sayfa yüklenirken çeviri başlıyorsa bildirimi göster
  dispatchTranslations(langToUse, worker);

  if (shouldShowNotice) {
    showLanguageNotice(langToUse);
  }

  sessionStorage.removeItem("backToOriginal");
});

// 🧠 Çeviri bitince bildirim gizle
worker.addEventListener("message", (e) => {
  const msg = e.data;

  if (msg.type === "priority-result" || msg.type === "lazy-result") {
    const el = document.getElementById(msg.elId);
    if (el) {
      // ❌ Öncesi yok artık çünkü o iş dispatcher'da
      el.textContent = msg.translated;
      el.style.opacity = "1"; // ✅ çeviri sonrası netleştir
    }

    if (msg.type === "lazy-result") {
      hideTranslationStatus();
    }
  }
});