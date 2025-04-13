async function fetchTranslation(text, target) {
    const res = await fetch("http://localhost:8000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target })
    });
  
    const data = await res.json();
    return data.translated_text;
  }
  
  // 🔁 Web Worker gelen mesajı işliyor
  self.onmessage = async (e) => {
    const msg = e.data;
  
    if (msg.type === "lazy") {
      const chunks = msg.chunks;
      const target = msg.target;
      const elId = msg.elId;
      const concurrency = msg.concurrency || 4;
  
      const results = [];
      let index = 0;
  
      while (index < chunks.length) {
        const batch = chunks.slice(index, index + concurrency);
  
        const promises = batch.map(({ index, text }) =>
          fetchTranslation(text, target)
            .then(translated => ({ index, translated }))
            .catch(() => ({ index, translated: "" }))
        );
  
        const settled = await Promise.allSettled(promises);
  
        settled.forEach((res) => {
          if (res.status === "fulfilled") results.push(res.value);
        });
  
        index += concurrency;
      }
  
      const ordered = results
        .sort((a, b) => a.index - b.index)
        .map(r => r.translated);
  
      const finalText = ordered.join(" ");
  
      self.postMessage({
        type: "lazy-result",
        elId,
        translated: finalText
      });
    }
  
    if (msg.type === "priority") {
      const { elId, text, target } = msg;
  
      try {
        const translated = await fetchTranslation(text, target);
  
        self.postMessage({
          type: "priority-result",
          elId,
          translated
        });
      } catch (err) {
        console.error("Çeviri hatası:", err);
      }
    }
  };