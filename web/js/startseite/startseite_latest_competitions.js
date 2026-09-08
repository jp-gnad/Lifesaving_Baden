(function (global) {
  "use strict";

  const COLS = {
    excelDate: 9,
    meetName: 10,
  };

  const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  function getDisplayName(name) {
    const separatorIndex = name.indexOf(" - ");
    return (separatorIndex >= 0 ? name.slice(0, separatorIndex) : name).trim();
  }

  function excelSerialToDate(value) {
    const serial = Number(value);
    if (!Number.isFinite(serial)) return null;

    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getLatestCompetition(rows) {
    const competitions = new Map();

    for (const row of rows) {
      if (!Array.isArray(row)) continue;

      const name = String(row[COLS.meetName] || "").trim();
      const date = excelSerialToDate(row[COLS.excelDate]);
      if (!name || !date) continue;

      const existing = competitions.get(name);
      if (!existing || date > existing.date) {
        competitions.set(name, { name, date });
      }
    }

    return Array.from(competitions.values())
      .sort((a, b) => b.date - a.date || a.name.localeCompare(b.name, "de"))[0] || null;
  }

  function renderCompetition(card, competition) {
    const date = document.createElement("time");
    const title = document.createElement("strong");
    const year = document.createElement("span");
    const displayName = getDisplayName(competition.name);

    date.className = "wide-carousel__latest-date";
    date.dateTime = competition.date.toISOString().slice(0, 10);
    date.textContent = DATE_FORMATTER.format(competition.date);
    date.setAttribute("aria-hidden", "true");

    title.className = "wide-carousel__latest-title";
    title.textContent = displayName;

    year.className = "wide-carousel__latest-year";
    year.textContent = String(competition.date.getUTCFullYear());

    const label = card.querySelector(".wide-carousel__latest-label");
    card.replaceChildren(...(label ? [label, title, year, date] : [title, year, date]));
    card.setAttribute("aria-busy", "false");
    card.addEventListener("click", () => {
      const isExpanded = card.getAttribute("aria-expanded") === "true";
      card.setAttribute("aria-expanded", String(!isExpanded));
      year.setAttribute("aria-hidden", String(!isExpanded));
      date.setAttribute("aria-hidden", String(isExpanded));
    });
  }

  function renderError(card) {
    const message = document.createElement("span");
    message.className = "wide-carousel__latest-error";
    message.textContent = "Der neueste Wettkampf konnte nicht geladen werden.";
    card.replaceChildren(message);
    card.disabled = true;
    card.setAttribute("aria-busy", "false");
  }

  async function init() {
    const card = document.querySelector("[data-latest-competition]");
    if (!card || !global.ExcelLoader?.loadSheetRows) return;

    try {
      const rows = await global.ExcelLoader.loadSheetRows({
        urlKey: "athleteData",
        sheetName: "Tabelle2",
        blankrows: false,
      });
      const competition = getLatestCompetition(rows);

      if (!competition) {
        renderError(card);
        return;
      }

      renderCompetition(card, competition);
    } catch (error) {
      console.error("Der neueste Wettkampf konnte nicht geladen werden.", error);
      renderError(card);
    }
  }

  global.StartseiteLatestCompetitions = { init };
})(window);
