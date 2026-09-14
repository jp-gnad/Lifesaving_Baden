(function () {
  "use strict";

  const number = new Intl.NumberFormat("de-DE");
  const percent = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" });
  const share = (value, total) => percent.format(total > 0 ? value / total : 0);
  const icons = {
    athletes: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-3-5.2"/>',
    clubs: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
    competitions: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/>',
    starts: '<path d="m13 3-8 11h6l-1 7 9-12h-7z"/>'
  };
  const metrics = [
    { key: "athletes", label: "Athleten", detail: "Einmalig erfasste Personen" },
    { key: "clubs", label: "Ortsgruppen", detail: "Aus dem gesamten Datenbestand" },
    { key: "competitions", label: "Wettkämpfe", detail: "Über alle erfassten Jahre" },
    { key: "starts", label: "Starts", detail: "In den sechs Pool-Disziplinen" }
  ];

  function renderMetrics(stats) {
    return metrics.map((metric) => `
      <div class="overview-metric overview-metric--${metric.key}">
        <dt><span>${metric.label}</span><svg viewBox="0 0 24 24" aria-hidden="true">${icons[metric.key]}</svg></dt>
        <dd class="overview-metric-value${stats ? "" : " overview-skeleton"}">${stats ? number.format(stats[metric.key]) : '<span class="overview-sr-only">Wird geladen</span>'}</dd>
        <dd class="overview-metric-detail">${metric.detail}</dd>
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
          <div class="overview-donut-center"><strong>${number.format(stats.athletes)}</strong><span>Athleten gesamt</span></div>
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

  function renderAges(stats) {
    const max = Math.max(1, ...stats.ages.map((item) => item.count));
    return `<ul class="overview-age-chart" aria-label="Athleten nach Altersklasse">
      ${stats.ages.map((item) => `
        <li style="--chart-color:${item.color};--bar-width:${item.count / max * 100}%">
          <span class="overview-age-label">${item.label}</span>
          <span class="overview-age-track" aria-hidden="true"><span></span></span>
          <strong>${number.format(item.count)}</strong>
          <span class="overview-age-percent">${share(item.count, stats.athletes)}</span>
        </li>
      `).join("")}
    </ul>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.getElementById("content");
    if (!main) return;

    main.innerHTML = `
    <section class="hero" aria-labelledby="overview-title">
      <h1 id="overview-title">Übersicht</h1>
      <p class="overview-hero-subtitle">Rettungssport in Zahlen.</p>
    </section>

    <div class="overview-wrap">
      <section class="overview-summary" aria-labelledby="overview-summary-title">
        <div class="overview-section-heading">
          <div><p class="overview-eyebrow">Gesamter Datenbestand</p><h2 id="overview-summary-title">Die Datenbank auf einen Blick</h2></div>
          <p class="overview-period" id="overview-period">Zeitraum wird geladen …</p>
        </div>
        <div id="overview-status" class="overview-status" role="status">Die Statistiken werden geladen …</div>
        <div id="overview-data" aria-busy="true">
          <dl class="overview-metrics" id="overview-metrics">${renderMetrics(null)}</dl>
          <section class="overview-demographics" aria-labelledby="overview-demographics-title">
            <div class="overview-section-heading">
              <div><p class="overview-eyebrow">Menschen hinter den Ergebnissen</p><h2 id="overview-demographics-title">Unsere Athleten</h2></div>
              <p class="overview-section-note">Jede Person zählt einmal.</p>
            </div>
            <div class="overview-charts">
              <section class="overview-chart-card" aria-labelledby="overview-gender-title">
                <div class="overview-chart-heading"><span class="overview-chart-index" aria-hidden="true">01</span><div><h3 id="overview-gender-title">Geschlechterverteilung</h3><p>Alle erfassten Athleten im Vergleich</p></div></div>
                <div id="overview-gender" class="overview-chart-content"><div class="overview-chart-skeleton overview-skeleton" aria-hidden="true"></div></div>
                <p class="overview-chart-footnote">Anzahl und Anteil am gesamten Athletenbestand.</p>
              </section>
              <section class="overview-chart-card" aria-labelledby="overview-age-title">
                <div class="overview-chart-heading"><span class="overview-chart-index" aria-hidden="true">02</span><div><h3 id="overview-age-title">Altersklassen</h3><p>Alter beim letzten erfassten Wettkampf</p></div></div>
                <div id="overview-ages" class="overview-chart-content"><div class="overview-chart-skeleton overview-skeleton" aria-hidden="true"></div></div>
                <p class="overview-chart-footnote">Wettkampfjahr minus Geburtsjahr. Fehlende Angaben: „Unbekannt“.</p>
              </section>
            </div>
          </section>
        </div>
      </section>
      <details class="overview-method">
        <summary>Wie werden die Zahlen gezählt?</summary>
        <div>
          <p>Berücksichtigt wird der gesamte erfasste Datenbestand einschließlich OMS-Wettkämpfen. Mehrere Wettkämpfe oder ein Vereinswechsel führen nicht dazu, dass eine Person mehrfach gezählt wird. Zur Unterscheidung dienen Name, Geschlecht und Jahrgang. Ein fehlender Jahrgang wird nur bei einer eindeutigen Zuordnung ergänzt.</p>
          <p>Die Ortsgruppen werden wie in der Club-Übersicht zusammengefasst: beispielsweise Ettlingen mit Wettersbach sowie Durlach mit seinen Stützpunkten. Landes- und Bundesverbände zählen nicht zusätzlich als Ortsgruppen.</p>
          <p>Ein Wettkampf zählt nach seinem normalisierten Namen einmal pro Kalenderjahr. Ein Start zählt je eingetragener Disziplin mit Zeit oder Platzierung, einschließlich Disqualifikationen. Leere Einträge, Striche und Nullwerte zählen nicht als Start.</p>
          <p>Für die Altersklasse gilt das Alter im Jahr des letzten erfassten Wettkampfs der jeweiligen Person. Jede Person wird genau einer Altersklasse zugeordnet; ohne bestimmbares Alter der Gruppe „Unbekannt“.</p>
        </div>
      </details>
    </div>
    `;

    const status = document.getElementById("overview-status");
    const data = document.getElementById("overview-data");

    async function load() {
      data.setAttribute("aria-busy", "true");
      data.hidden = false;
      status.className = "overview-status";
      status.textContent = "Die Statistiken werden geladen …";
      try {
        const rows = await window.ExcelLoader.loadSheetRows({ urlKey: "athleteData", sheetName: "Tabelle2", defval: "" });
        const stats = window.OverviewData.buildStats(rows, window.ClubsData.normalizeOrtsgruppeName);
        document.getElementById("overview-metrics").innerHTML = renderMetrics(stats);
        document.getElementById("overview-gender").innerHTML = renderGender(stats);
        document.getElementById("overview-ages").innerHTML = renderAges(stats);
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
