document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Athleten</h1>
    </section>

    <section id="athleten-container-section">
      <div id="athleten-container"></div>
    </section>
  `;
});

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  };

  function openProfile(a) {
    if (!a) return;
    const id = a.id ? String(a.id) : "";
    const url = id
      ? `./profil.html?ath=${encodeURIComponent(id)}`
      : `./profil.html?name=${encodeURIComponent(String(a.name || "").trim())}`;
    window.location.href = url;
  }

  function renderApp() {
    const mount = $("#athleten-container");
    if (!mount) return;

    mount.innerHTML = "";
    const ui = h("section", { class: "ath-ui", role: "region", "aria-label": "Athletenbereich" });

    const searchMount = h("div", { id: "ath-search-mount" });
    ui.appendChild(searchMount);

    if (window.AthSearch && typeof window.AthSearch.mount === "function") {
      window.AthSearch.mount(searchMount, { openProfile });
    }

    const top10Mount = h("div", { id: "ath-top10", class: "ath-top10" });
    ui.appendChild(top10Mount);

    const openByName = (name) =>
      (typeof window.AthSearch?.openByName === "function" && window.AthSearch.openByName(name)) ||
      (typeof window.openAthleteProfileByName === "function" && window.openAthleteProfileByName(name));

    if (window.AthTop10 && typeof window.AthTop10.mount === "function") {
      window.AthTop10.mount(top10Mount, { openByName });
    }

    mount.appendChild(ui);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();
    await new Promise(requestAnimationFrame);

    try {
      if (!window.AthDataSmall || typeof window.AthDataSmall.loadAthletes !== "function") {
        throw new Error("AthDataSmall missing");
      }

      const athletes = await window.AthDataSmall.loadAthletes({ sheetName: "Tabelle2" });

      if (window.AthSearch && typeof window.AthSearch.setAthletes === "function") {
        window.AthSearch.setAthletes(athletes);
      }
    } catch (err) {
      if (window.AthSearch && typeof window.AthSearch.showError === "function") {
        window.AthSearch.showError("Fehler beim Laden der Daten.");
      }
    }
  });
})();
