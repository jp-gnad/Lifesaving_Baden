(function () {
  "use strict";

  const number = new Intl.NumberFormat("de-DE");
  const percent = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" });
  const share = (value, total) => percent.format(total > 0 ? value / total : 0);
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const icons = {
    athletes: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5.2"/>',
    clubs: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
    competitions: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/>',
    starts: '<path d="m13 3-8 11h6l-1 7 9-12h-7z"/>',
    disqualifications: '<path d="M10.3 3.4 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.4a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>'
  };
  const rankingIcons = {
    clubs: icons.clubs,
    states: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
    federations: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    people: icons.athletes,
    disciplines: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    disqualifications: icons.disqualifications
  };
  const metrics = [
    { key: "athletes", label: "Athleten" },
    { key: "clubs", label: "Ortsgruppen" },
    { key: "competitions", label: "Wettkämpfe" },
    { key: "starts", label: "Ergebnisse" },
    { key: "disqualifications", label: "Disqualifikationen" }
  ];
  const ageViews = {
    compact: { key: "ages", label: "Kompakte Altersverteilung" },
    classes: { key: "ageClasses", label: "Altersklassen" }
  };
  const clubViews = {
    starts: "clubsByStarts",
    competitions: "clubsByCompetitions"
  };
  const lvViews = {
    starts: "landesverbaendeByStarts",
    competitions: "landesverbaendeByCompetitions"
  };
  const bvViews = {
    starts: "bundesverbaendeByStarts",
    competitions: "bundesverbaendeByCompetitions"
  };
  const personViews = {
    starts: "peopleByStarts",
    competitions: "peopleByCompetitions"
  };
  const lvCapCodes = {
    BAY: "BY",
    WU: "WÜ",
    WUE: "WÜ",
    "WÜ": "WÜ",
    NRH: "NR",
    NO: "NR",
    NW: "NR",
    NRW: "NR",
    WF: "WE",
    WL: "WE"
  };
  let ageMode = "compact";
  let activityMode = "starts";
  let loadedStats = null;

  function renderMetrics(stats) {
    return metrics.map((metric) => `
      <div class="overview-metric overview-metric--${metric.key}">
        <dt><span>${metric.label}</span><svg viewBox="0 0 24 24" aria-hidden="true">${icons[metric.key]}</svg></dt>
        <dd class="overview-metric-value${stats ? "" : " overview-skeleton"}">${stats ? number.format(stats[metric.key]) : '<span class="overview-sr-only">Wird geladen</span>'}</dd>
      </div>
    `).join("");
  }

  function renderGender(stats) {
    const groups = stats.genders.filter((item) => item.key !== "unknown" || item.count > 0);
    let offset = 0;
    const segments = groups.filter((item) => item.count > 0).map((item) => {
      const length = item.count / stats.athletes * 100;
      const segment = `<circle cx="120" cy="120" r="94" pathLength="100" fill="none" stroke="${item.color}" stroke-width="22" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}" />`;
      offset += length;
      return segment;
    }).join("");

    return `
      <div class="overview-gender-layout">
        <div class="overview-donut" aria-hidden="true">
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="94" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="22" />
            <g transform="rotate(-90 120 120)">${segments}</g>
          </svg>
          <div class="overview-donut-center"><strong>${share(groups[0]?.count || 0, stats.athletes)}</strong></div>
        </div>
        <ul class="overview-gender-legend" aria-label="Geschlechterverteilung">
          ${groups.map((item) => `
            <li style="--chart-color:${item.color}">
              <span class="overview-legend-label"><i aria-hidden="true"></i>${item.label}</span>
              <div><strong>${number.format(item.count)}</strong><span>${share(item.count, stats.athletes)}</span></div>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  function renderAges(stats, mode = ageMode) {
    const view = ageViews[mode] || ageViews.compact;
    const groups = stats[view.key] || [];
    const max = Math.max(1, ...groups.map((item) => item.count));
    return `<ul class="overview-age-chart" data-age-view="${mode}" aria-label="${view.label}" style="--age-columns:${groups.length}">
      ${groups.map((item) => `
        <li class="overview-age-bar overview-age-bar--${item.key}" style="--bar-height:${item.count / max * 100}%" tabindex="0" aria-label="${item.ariaLabel || (item.key === "unknown" ? "Alter unbekannt" : `${item.label} Jahre`)}: ${number.format(item.count)} Athleten">
          <span class="overview-age-value" aria-hidden="true">${number.format(item.count)}</span>
          <span class="overview-age-track" aria-hidden="true"><span></span></span>
          <span class="overview-age-label">${item.label}</span>
        </li>
      `).join("")}
    </ul>`;
  }

  function selectAgeView(mode) {
    if (!ageViews[mode]) return;
    ageMode = mode;
    document.querySelectorAll("[data-age-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.ageMode === mode));
    });
    if (loadedStats) {
      const chart = document.getElementById("overview-ages");
      chart.dataset.ageView = mode;
      chart.innerHTML = renderAges(loadedStats, mode);
    }
  }

  function renderRankingList(items, options = {}) {
    if (!items.length) return '<p class="overview-ranking-empty">Keine Daten</p>';
    return `<ol class="overview-ranking-list">
      ${items.map((item, index) => {
        const profileHref = item.profileId && options.profile === "club"
          ? `./clubs_profil.html?gliederung=${encodeURIComponent(item.profileId)}`
          : item.profileId && options.profile === "person"
            ? `./profil.html?ath=${encodeURIComponent(item.profileId)}`
            : "";
        const content = `
          <span class="overview-ranking-position" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <span class="overview-ranking-name${options.caps ? " overview-ranking-name--club" : ""}">
            ${options.caps ? `<span class="overview-club-cap" data-cap-key="${escapeHtml(item.capKey)}" data-lv-code="${escapeHtml(item.lvCode)}" aria-hidden="true"></span>` : ""}
            <span>${escapeHtml(item.label)}</span>
          </span>
          <strong>${number.format(item.count)}</strong>`;
        return `
        <li>
          ${profileHref
            ? `<a class="overview-ranking-row overview-ranking-link" href="${escapeHtml(profileHref)}" aria-label="${escapeHtml(item.label)}, ${number.format(item.count)}: Profil öffnen">${content}</a>`
            : `<div class="overview-ranking-row">${content}</div>`}
        </li>
      `;
      }).join("")}
    </ol>`;
  }

  function capKeyVariants(value) {
    const raw = String(value || "").trim();
    if (!raw) return [];
    const ascii = raw.replace(/ä/gi, "ae").replace(/ö/gi, "oe").replace(/ü/gi, "ue").replace(/ß/g, "ss");
    return [...new Set([
      raw.replace(/[\\/]/g, "-"),
      ascii.replace(/[\\/]/g, "-"),
      raw.replace(/[\\/]/g, ""),
      ascii.replace(/[\\/]/g, "")
    ].filter(Boolean))];
  }

  function capUrls(key) {
    return capKeyVariants(key).flatMap((variant) => {
      const encoded = encodeURIComponent(variant);
      return [`./assets/svg/Cap-${encoded}.svg`, `./assets/svg/CAP-${encoded}.svg`];
    });
  }

  function mountClubCaps(root = document) {
    root.querySelectorAll(".overview-club-cap:not([data-mounted])").forEach((host) => {
      host.dataset.mounted = "true";
      const lvCode = lvCapCodes[host.dataset.lvCode] || host.dataset.lvCode;
      const primary = capUrls(host.dataset.capKey).map((url) => ({ url, fallback: false }));
      const fallback = capUrls(lvCode).map((url) => ({ url, fallback: true }));
      const candidates = [...primary, ...fallback];
      if (!candidates.length) return;

      const image = document.createElement("img");
      image.alt = "";
      let index = 0;
      const loadNext = () => {
        const candidate = candidates[index++];
        if (!candidate) {
          host.hidden = true;
          return;
        }
        host.classList.toggle("is-fallback", candidate.fallback);
        image.src = candidate.url;
      };
      image.addEventListener("error", loadNext);
      host.appendChild(image);
      loadNext();
    });
  }

  function renderDisciplineChart(items) {
    if (!items.length) return '<p class="overview-ranking-empty">Keine Daten</p>';
    const max = Math.max(1, ...items.map((item) => item.count));
    return `<ol class="overview-discipline-chart">
      ${items.map((item, index) => `
        <li aria-label="${escapeHtml(item.label)}: ${number.format(item.count)} Ergebnisse">
          <div>
            <span class="overview-ranking-position" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            <span class="overview-ranking-name">${escapeHtml(item.label)}</span>
            <strong>${number.format(item.count)}</strong>
          </div>
          <span class="overview-discipline-track" aria-hidden="true"><span style="width:${item.count / max * 100}%"></span></span>
        </li>
      `).join("")}
    </ol>`;
  }

  function selectActivityView(mode) {
    if (!clubViews[mode]) return;
    activityMode = mode;
    document.querySelectorAll("[data-activity-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.activityMode === mode));
    });
    if (loadedStats) {
      const targets = [
        ["overview-clubs-ranking", clubViews[mode], { caps: true, profile: "club" }],
        ["overview-lv-ranking", lvViews[mode], { caps: true, profile: "club" }],
        ["overview-bv-ranking", bvViews[mode], { caps: true, profile: "club" }],
        ["overview-people-ranking", personViews[mode], { profile: "person" }]
      ];
      targets.forEach(([id, key, options]) => {
        const list = document.getElementById(id);
        if (!list) return;
        list.innerHTML = renderRankingList(loadedStats.rankings[key], options);
        mountClubCaps(list);
      });
    }
  }

  function renderRankingHeading(id, label, icon) {
    return `<div class="overview-ranking-heading"><h2 id="${id}"><svg viewBox="0 0 24 24" aria-hidden="true">${rankingIcons[icon]}</svg><span>${label}</span></h2></div>`;
  }

  function renderCarouselDots(targetId, count, label) {
    return `<div class="overview-carousel-dots" data-carousel-dots="${targetId}" aria-label="${label}">
      ${Array.from({ length: count }, (_, index) => `<button type="button" aria-label="Karte ${index + 1} von ${count}" aria-current="${index === 0 ? "true" : "false"}"></button>`).join("")}
    </div>`;
  }

  function initRankingCarousels(root) {
    root.querySelectorAll("[data-overview-carousel]").forEach((carousel) => {
      const dots = root.querySelector(`[data-carousel-dots="${carousel.id}"]`);
      if (!dots) return;
      const pages = Array.from(carousel.children);
      const buttons = Array.from(dots.querySelectorAll("button"));
      let frame = 0;

      const update = () => {
        frame = 0;
        const activeIndex = pages.reduce((best, page, index) => (
          Math.abs(page.offsetLeft - carousel.scrollLeft) < Math.abs(pages[best].offsetLeft - carousel.scrollLeft) ? index : best
        ), 0);
        buttons.forEach((button, index) => button.setAttribute("aria-current", String(index === activeIndex)));
      };

      carousel.addEventListener("scroll", () => {
        if (!frame) frame = requestAnimationFrame(update);
      }, { passive: true });
      buttons.forEach((button, index) => {
        button.addEventListener("click", () => carousel.scrollTo({
          left: pages[index].offsetLeft,
          behavior: "smooth"
        }));
      });
      update();
    });
  }

  function renderRankings(stats) {
    const clubRanking = stats.rankings[clubViews[activityMode]];
    const lvRanking = stats.rankings[lvViews[activityMode]];
    const bvRanking = stats.rankings[bvViews[activityMode]];
    const personRanking = stats.rankings[personViews[activityMode]];
    return `
      <div class="overview-ranking-grid overview-ranking-grid--secondary" id="overview-secondary-carousel" data-overview-carousel tabindex="0" aria-label="Disziplinen und Disqualifikationen, horizontal wischbar">
        <section class="overview-ranking-section" aria-labelledby="overview-disciplines-ranking-title">
          ${renderRankingHeading("overview-disciplines-ranking-title", "Beliebteste Disziplinen", "disciplines")}
          <div class="overview-ranking-card">${renderDisciplineChart(stats.rankings.disciplines)}</div>
        </section>
        <section class="overview-ranking-section" aria-labelledby="overview-dq-ranking-title">
          ${renderRankingHeading("overview-dq-ranking-title", "Disqualifikationen", "disqualifications")}
          <div class="overview-ranking-card">${renderRankingList(stats.rankings.disqualifications, { profile: "person" })}</div>
        </section>
      </div>
      ${renderCarouselDots("overview-secondary-carousel", 2, "Position im oberen Karussell")}
      <div class="overview-rankings-header">
        <h2 class="overview-rankings-title">Aktivste</h2>
        <div class="overview-ranking-switch" aria-label="Aktivität sortieren nach">
          <button type="button" data-activity-mode="starts" aria-pressed="${activityMode === "starts"}">Starts</button>
          <button type="button" data-activity-mode="competitions" aria-pressed="${activityMode === "competitions"}">Wettkämpfe</button>
        </div>
      </div>
      <div class="overview-ranking-grid overview-ranking-grid--activity" id="overview-activity-carousel" data-overview-carousel tabindex="0" aria-label="Aktivste Gliederungen und Personen, horizontal wischbar">
        <section class="overview-ranking-section" aria-labelledby="overview-clubs-ranking-title">
          ${renderRankingHeading("overview-clubs-ranking-title", "Ortsgruppen", "clubs")}
          <div class="overview-ranking-card" id="overview-clubs-ranking">${renderRankingList(clubRanking, { caps: true, profile: "club" })}</div>
        </section>
        <section class="overview-ranking-section" aria-labelledby="overview-lv-ranking-title">
          ${renderRankingHeading("overview-lv-ranking-title", "Landesverbände", "states")}
          <div class="overview-ranking-card" id="overview-lv-ranking">${renderRankingList(lvRanking, { caps: true, profile: "club" })}</div>
        </section>
        <section class="overview-ranking-section" aria-labelledby="overview-bv-ranking-title">
          ${renderRankingHeading("overview-bv-ranking-title", "Bundesverbände", "federations")}
          <div class="overview-ranking-card" id="overview-bv-ranking">${renderRankingList(bvRanking, { caps: true, profile: "club" })}</div>
        </section>
        <section class="overview-ranking-section" aria-labelledby="overview-people-ranking-title">
          ${renderRankingHeading("overview-people-ranking-title", "Personen", "people")}
          <div class="overview-ranking-card" id="overview-people-ranking">${renderRankingList(personRanking, { profile: "person" })}</div>
        </section>
      </div>
      ${renderCarouselDots("overview-activity-carousel", 4, "Position im Aktivste-Karussell")}
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.getElementById("content");
    if (!main) return;

    main.innerHTML = `
    <section class="hero" aria-labelledby="overview-title">
      <h1 id="overview-title">Übersicht</h1>
    </section>

    <div class="overview-wrap">
      <section class="overview-summary" aria-label="Datenbankstatistik">
        <p class="overview-period" id="overview-period">Zeitraum wird geladen …</p>
        <div id="overview-status" class="overview-status" role="status">Die Statistiken werden geladen …</div>
        <div id="overview-data" aria-busy="true">
          <dl class="overview-metrics" id="overview-metrics">${renderMetrics(null)}</dl>
          <section class="overview-demographics" aria-label="Verteilungen">
            <h2 class="overview-demographics-title">Demographie</h2>
            <div class="overview-charts">
              <section class="overview-chart-card" aria-labelledby="overview-gender-title">
                <div class="overview-chart-heading"><h2 id="overview-gender-title">Geschlechter</h2></div>
                <div id="overview-gender" class="overview-chart-content"><div class="overview-chart-skeleton overview-skeleton" aria-hidden="true"></div></div>
              </section>
              <section class="overview-chart-card" aria-labelledby="overview-age-title">
                <div class="overview-chart-heading overview-chart-heading--switchable">
                  <h2 id="overview-age-title">Alter</h2>
                  <div class="overview-age-switch" aria-label="Altersansicht">
                    <button type="button" data-age-mode="compact" aria-pressed="true" title="Alter bis 30+" disabled>Jahre</button>
                    <button type="button" data-age-mode="classes" aria-pressed="false" title="Altersklassen" disabled>AK</button>
                  </div>
                </div>
                <div id="overview-ages" class="overview-chart-content overview-chart-content--age"><div class="overview-chart-skeleton overview-skeleton" aria-hidden="true"></div></div>
              </section>
            </div>
          </section>
          <section id="overview-rankings" class="overview-rankings" aria-label="Ranglisten und Aktivität">
            <div class="overview-ranking-grid overview-ranking-grid--secondary">
              <div class="overview-ranking-card overview-ranking-placeholder overview-skeleton" aria-hidden="true"></div>
              <div class="overview-ranking-card overview-ranking-placeholder overview-skeleton" aria-hidden="true"></div>
            </div>
            <div class="overview-rankings-header"><h2 class="overview-rankings-title">Aktivste</h2></div>
            <div class="overview-ranking-grid overview-ranking-grid--activity">
              <div class="overview-ranking-card overview-ranking-placeholder overview-skeleton" aria-hidden="true"></div>
              <div class="overview-ranking-card overview-ranking-placeholder overview-skeleton" aria-hidden="true"></div>
              <div class="overview-ranking-card overview-ranking-placeholder overview-skeleton" aria-hidden="true"></div>
              <div class="overview-ranking-card overview-ranking-placeholder overview-skeleton" aria-hidden="true"></div>
            </div>
          </section>
        </div>
      </section>
      <details class="overview-method">
        <summary>Berechnung</summary>
        <div>
          <p>Jede Person zählt einmal. Das Alter gilt beim letzten erfassten Wettkampf. „?“ steht für fehlende Angaben.</p>
          <p>Ergebnisse zählen je Disziplin mit Zeit oder Platzierung, einschließlich Disqualifikationen. Wettkämpfe zählen einmal pro Jahr.</p>
          <p>Aktivitätsranglisten lassen sich nach Starts oder eindeutigen Wettkämpfen vergleichen; eine DQ zählt je betroffener Disziplin.</p>
        </div>
      </details>
    </div>
    `;

    const status = document.getElementById("overview-status");
    const data = document.getElementById("overview-data");
    document.querySelectorAll("[data-age-mode]").forEach((button) => {
      button.addEventListener("click", () => selectAgeView(button.dataset.ageMode));
    });
    document.getElementById("overview-rankings").addEventListener("click", (event) => {
      const button = event.target.closest("[data-activity-mode]");
      if (button) selectActivityView(button.dataset.activityMode);
    });

    async function load() {
      data.setAttribute("aria-busy", "true");
      data.hidden = false;
      status.className = "overview-status";
      status.textContent = "Die Statistiken werden geladen …";
      try {
        const rows = await window.ExcelLoader.loadSheetRows({ urlKey: "athleteData", sheetName: "Tabelle2", defval: "" });
        const stats = window.OverviewData.buildStats(rows, window.ClubsData.normalizeOrtsgruppeName);
        loadedStats = stats;
        document.getElementById("overview-metrics").innerHTML = renderMetrics(stats);
        document.getElementById("overview-gender").innerHTML = renderGender(stats);
        document.querySelectorAll("[data-age-mode]").forEach((button) => { button.disabled = false; });
        selectAgeView(ageMode);
        document.getElementById("overview-rankings").innerHTML = renderRankings(stats);
        initRankingCarousels(document.getElementById("overview-rankings"));
        selectActivityView(activityMode);
        document.getElementById("overview-period").textContent = stats.firstDate
          ? `${date.format(new Date(stats.firstDate))} – ${date.format(new Date(stats.lastDate))}`
          : "Kein Zeitraum erfasst";
        status.textContent = stats.athletes ? "Statistiken geladen." : "Noch keine Statistikdaten vorhanden.";
        status.classList.toggle("overview-sr-only", stats.athletes > 0);
      } catch (error) {
        console.error("Übersicht konnte nicht geladen werden:", error);
        data.hidden = true;
        document.getElementById("overview-period").textContent = "";
        status.textContent = "Die Statistiken konnten nicht geladen werden. ";
        const retry = document.createElement("button");
        retry.type = "button";
        retry.textContent = "Erneut versuchen";
        retry.addEventListener("click", () => window.location.reload());
        status.appendChild(retry);
      } finally {
        data.setAttribute("aria-busy", "false");
      }
    }

    load();
  });
})();
