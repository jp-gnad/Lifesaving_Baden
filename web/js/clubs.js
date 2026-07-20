document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <div class="container hero-content">
        <div id="rek-search-mount"></div>
        <h1>Clubs</h1>
        <p class="hero-meta">Ortsgruppen &middot; Landesverbände &middot; Bundesverbände</p>
        <p class="hero-info">Suche nach einer Gliederung und springe direkt in ihre Clubansicht.</p>
        <div id="rek-overview-chips" class="ath-overview-chips" aria-label="Clubs-Übersicht"></div>
      </div>
    </section>

    <section id="rekorde-container-section">
      <div id="rekorde-container"></div>
    </section>
  `;
});

(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const CLUBS_TOP10_SCRIPT_URL = "./js/clubs/clubs_top10.js?v=20260711-1";
  let top10ScriptPromise = null;

  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") el.className = value;
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
    }

    for (const child of children.flat()) {
      if (child == null) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }

    return el;
  };

  function openGroup(group) {
    if (!group) return;
    const url = `./clubs_profil.html?gliederung=${encodeURIComponent(String(group.id || ""))}`;
    window.location.href = url;
  }

  function formatNumber(n) {
    return new Intl.NumberFormat("de-DE").format(Number(n) || 0);
  }

  function createChip(key, label, value = "") {
    return h(
      "div",
      { class: "ath-overview-chip", "data-key": key },
      h("span", { class: "ath-overview-chip-value" }, value),
      h("span", { class: "ath-overview-chip-label" }, label)
    );
  }

  function renderOverviewChipsSkeleton() {
    const mount = $("#rek-overview-chips");
    if (!mount) return;

    mount.classList.remove("is-filled");
    mount.innerHTML = "";
    mount.appendChild(createChip("og", "Ortsgruppen"));
    mount.appendChild(createChip("lv", "Landesverbände"));
    mount.appendChild(createChip("bv", "Bundesverbände"));
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

    const onEnd = (event) => {
      if (event.propertyName !== "width") return;
      chip.style.width = "";
      chip.removeEventListener("transitionend", onEnd);
    };

    chip.addEventListener("transitionend", onEnd);
  }

  function fillOverviewChips(stats) {
    const mount = $("#rek-overview-chips");
    if (!mount) return;

    animateChipWidth(mount.querySelector('[data-key="og"]'), formatNumber(stats?.ortsgruppen));
    animateChipWidth(mount.querySelector('[data-key="lv"]'), formatNumber(stats?.landesverbaende));
    animateChipWidth(mount.querySelector('[data-key="bv"]'), formatNumber(stats?.bundesverbaende));

    requestAnimationFrame(() => {
      mount.classList.add("is-filled");
    });
  }

  function renderApp() {
    const mount = $("#rekorde-container");
    if (!mount) return null;

    mount.innerHTML = "";

    const ui = h("section", {
      class: "rek-ui",
      role: "region",
      "aria-label": "Clubs-Bereich"
    });

    const top10Mount = h("div", { id: "clubs-top10", class: "clubs-top10" });

    const searchMount = $("#rek-search-mount");
    if (searchMount && window.ClubsSearch && typeof window.ClubsSearch.mount === "function") {
      searchMount.innerHTML = "";
      window.ClubsSearch.mount(searchMount, { openProfile: openGroup });
    }

    ui.appendChild(top10Mount);
    mount.appendChild(ui);

    return top10Mount;
  }

  function loadTop10Script() {
    if (window.ClubsTop10 && typeof window.ClubsTop10.mount === "function") {
      return Promise.resolve();
    }

    if (!top10ScriptPromise) {
      top10ScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = CLUBS_TOP10_SCRIPT_URL;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("clubs_top10.js konnte nicht geladen werden."));
        document.head.appendChild(script);
      });
    }

    return top10ScriptPromise;
  }

  async function mountTop10(top10Mount) {
    if (!top10Mount) return;
    top10Mount.innerHTML = '<div class="ath10-status ath10-status--loading">Top-10 wird geladen ...</div>';
    await loadTop10Script();

    if (window.ClubsTop10 && typeof window.ClubsTop10.mount === "function") {
      window.ClubsTop10.mount(top10Mount, { openProfile: openGroup });
      return;
    }

    throw new Error("ClubsTop10 missing");
  }

  function scheduleTop10(top10Mount) {
    if (!top10Mount) return;

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      mountTop10(top10Mount).catch((error) => {
        console.error(error);
        top10Mount.innerHTML = '<div class="ath10-status ath10-status--error">Top-10 konnten nicht geladen werden.</div>';
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(start, { timeout: 1500 });
        } else {
          window.setTimeout(start, 250);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const top10Mount = renderApp();
    renderOverviewChipsSkeleton();
    await new Promise(requestAnimationFrame);

    try {
      if (!window.ClubsData || typeof window.ClubsData.loadGroupsAndStats !== "function") {
        throw new Error("ClubsData missing");
      }

      const { groups, stats } = await window.ClubsData.loadGroupsAndStats({ sheetName: "Tabelle2" });

      if (window.ClubsSearch && typeof window.ClubsSearch.setGroups === "function") {
        window.ClubsSearch.setGroups(groups);
      }

      fillOverviewChips(stats);
    } catch (err) {
      fillOverviewChips({
        ortsgruppen: 0,
        landesverbaende: 0,
        bundesverbaende: 0
      });

      if (window.ClubsSearch && typeof window.ClubsSearch.showError === "function") {
        window.ClubsSearch.showError("Fehler beim Laden der Daten.");
      }
    }

    scheduleTop10(top10Mount);
  });
})();
