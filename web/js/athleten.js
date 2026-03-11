document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <div class="container hero-content">
        <div id="ath-search-mount"></div>
        <h1>Athleten</h1>
        <p class="hero-meta">Athletenprofile ・ Top 10 Listen ・ Leistungsstatistik</p>
        <p class="hero-info">Professionelle Athletenprofile aus dem Rettungssport. Es werden derzeit nur Einzelwettkämpfe, internationale Disziplinen und Pool-Wettkämpfe berücksichtigt.</p>
        <div id="ath-overview-chips" class="ath-overview-chips" aria-label="Übersicht"></div>
      </div>
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

  function formatNumber(n) {
    return new Intl.NumberFormat("de-DE").format(Number(n) || 0);
  }

  function createChip(key, label, value = "") {
    return h(
      "div",
      { class: "ath-overview-chip", "data-key": key, title: "" },
      h("span", { class: "ath-overview-chip-value" }, value),
      h("span", { class: "ath-overview-chip-label" }, label)
    );
  }

  function renderOverviewChipsSkeleton() {
    const mount = $("#ath-overview-chips");
    if (!mount) return;

    mount.classList.remove("is-filled");
    mount.innerHTML = "";
    mount.appendChild(createChip("persons", "Personen", ""));
    mount.appendChild(createChip("meets", "Wettkämpfe", ""));
    mount.appendChild(createChip("starts", "Starts", ""));
  }

  function animateChipWidth(chip, nextValue) {
    if (!chip) return;

    const valueEl = chip.querySelector(".ath-overview-chip-value");
    if (!valueEl) return;

    const startWidth = chip.offsetWidth;
    chip.style.width = startWidth + "px";

    valueEl.textContent = nextValue;

    chip.style.width = "auto";
    const targetWidth = chip.offsetWidth;

    chip.style.width = startWidth + "px";
    chip.offsetWidth;

    requestAnimationFrame(() => {
      chip.style.width = targetWidth + "px";
    });

    const onEnd = (e) => {
      if (e.propertyName !== "width") return;
      chip.style.width = "";
      chip.removeEventListener("transitionend", onEnd);
    };

    chip.addEventListener("transitionend", onEnd);
  }

  function fillOverviewChips(stats) {
    const mount = $("#ath-overview-chips");
    if (!mount) return;

    const chipPersons = mount.querySelector('[data-key="persons"]');
    const chipMeets = mount.querySelector('[data-key="meets"]');
    const chipStarts = mount.querySelector('[data-key="starts"]');

    animateChipWidth(chipPersons, formatNumber(stats?.persons));
    animateChipWidth(chipMeets, formatNumber(stats?.meets));
    animateChipWidth(chipStarts, formatNumber(stats?.starts));

    if (chipPersons) chipPersons.title = String(stats?.chip1Title || "");
    if (chipMeets) chipMeets.title = String(stats?.chip2Title || "");
    if (chipStarts) chipStarts.title = String(stats?.chip3Title || "");

    requestAnimationFrame(() => {
      mount.classList.add("is-filled");
    });
  }

  function renderApp() {
    const mount = $("#athleten-container");
    if (!mount) return;

    mount.innerHTML = "";

    const ui = h("section", {
      class: "ath-ui",
      role: "region",
      "aria-label": "Athletenbereich"
    });

    const searchMount = $("#ath-search-mount");
    if (searchMount && window.AthSearch && typeof window.AthSearch.mount === "function") {
      searchMount.innerHTML = "";
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
    renderOverviewChipsSkeleton();
    await new Promise(requestAnimationFrame);

    try {
      if (!window.AthDataSmall || typeof window.AthDataSmall.loadAthletesAndStats !== "function") {
        throw new Error("AthDataSmall missing");
      }

      const { athletes, stats } = await window.AthDataSmall.loadAthletesAndStats({ sheetName: "Tabelle2" });

      if (window.AthSearch && typeof window.AthSearch.setAthletes === "function") {
        window.AthSearch.setAthletes(athletes);
      }

      fillOverviewChips(stats);
    } catch (err) {
      fillOverviewChips({
        persons: 0,
        meets: 0,
        starts: 0,
        chip1Title: "",
        chip2Title: "",
        chip3Title: ""
      });

      if (window.AthSearch && typeof window.AthSearch.showError === "function") {
        window.AthSearch.showError("Fehler beim Laden der Daten.");
      }
    }
  });
})();