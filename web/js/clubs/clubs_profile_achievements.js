(function () {
  const CATEGORIES = ["OMS", "BMS", "LMS", "DMM", "DEM", "JRP", "DP", "BP", "WG"];
  const STARTRECHT = { og: "OG", lv: "LV", bv: "BV" };
  const GROUP_LABELS = { og: "die Ortsgruppe", lv: "den Landesverband", bv: "den Bundesverband" };
  const emptyMedals = () => ({ gold: 0, silver: 0, bronze: 0 });
  const medalTotal = (medals) => medals.gold + medals.silver + medals.bronze;
  const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const hasResult = (value) => !!text(value) && !/^(?:[-—]|0(?:[,.]0+)?)$/.test(text(value));

  function getEdition(row, helpers) {
    const cols = helpers.COLS;
    const name = text(row[cols.meetName]).replace(/[–—]/g, "-");
    const suffix = name.match(/^(.*?)(?:\s*-\s*|\s+)((?:19|20)\d{2})$/);
    const title = text(suffix ? suffix[1] : name).replace(/\s*-\s*/g, "-");
    const folded = title.toLowerCase();
    let category = null;
    if (/^(?:wg|world[ -]?games)$/.test(folded)) category = "WG";
    else {
      const match = title.match(/^(OMS|BMS)(?:-.+)?$/i) || title.match(/^(LMS|DMM|DEM|JRP|DP|BP)$/i);
      if (match) category = match[1].toUpperCase();
    }
    if (!category) return null;

    const dateIso = hasResult(row[cols.excelDate]) ? helpers.excelSerialToISO(row[cols.excelDate]) : "";
    const year = suffix ? Number(suffix[2]) : Number(dateIso.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900) return null;
    const country = helpers.normalizeForCompare(row[cols.land] || row[cols.bvNatio]);
    return { category, year, dateIso, key: [category === "WG" ? "wg" : folded, year, country].join("|") };
  }

  function getPlace(row, placeCol, timeCol) {
    const place = text(row[placeCol]);
    const time = timeCol == null ? "" : text(row[timeCol]);
    if (/(?:dq|dsq|disq|ausg|dns|dnf)/i.test(`${place} ${time}`)) return 0;
    if (!place) return null;
    const match = place.match(/^([1-9]\d*)(?:[.,]0+|\.)?$/);
    return match ? Number(match[1]) : 0;
  }

  function finalPlace(rows, placeCol, timeCol, roundCol) {
    const results = timeCol == null ? rows
      : rows.filter((row) => hasResult(row[placeCol]) || hasResult(row[timeCol]));
    const round = (row) => Math.max(1, Number(row[roundCol]) || 1);
    const lastRound = Math.max(0, ...results.map(round));
    const places = new Set(results.filter((row) => round(row) === lastRound)
      .map((row) => getPlace(row, placeCol, timeCol)).filter((place) => place != null));
    // Repeated rows are one result; conflicting final rankings do not invent a medal.
    return places.size === 1 ? [...places][0] : 0;
  }

  function buildAchievementsData(rows, group, helpers) {
    const cols = helpers.COLS;
    const categories = CATEGORIES.map((key) => ({ key, label: key === "WG" ? "World Games" : key, editions: new Set(), medals: emptyMedals() }));
    const byCategory = new Map(categories.map((category) => [category.key, category]));
    const athletes = new Map();
    const years = new Set();
    const medals = emptyMedals();
    const medalTypes = { individual: 0, multi: 0 };
    const startrecht = STARTRECHT[group?.kind];

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!startrecht || text(row?.[cols.startrecht]).toUpperCase() !== startrecht || !helpers.groupMatchesRow(group, row)) continue;
      const name = text(row[cols.name]);
      if (!name) continue;
      const edition = getEdition(row, helpers);
      if (!edition) continue;
      byCategory.get(edition.category).editions.add(edition.key);
      years.add(edition.year);

      const birthYear = helpers.parseTwoDigitYearWithMeetYear(row[cols.yy2], edition.dateIso || `${edition.year}-01-01`);
      const athleteId = helpers.makeAthleteId(name, row[cols.gender], birthYear);
      const key = [edition.key, athleteId, text(row[cols.pool])].join("|");
      if (!athletes.has(key)) athletes.set(key, { category: edition.category, rows: [] });
      athletes.get(key).rows.push(row);
    }

    function addMedal(place, category, type) {
      const color = { 1: "gold", 2: "silver", 3: "bronze" }[place];
      if (!color) return;
      medals[color]++;
      byCategory.get(category).medals[color]++;
      medalTypes[type]++;
    }

    for (const athlete of athletes.values()) {
      const scoring = athlete.rows.map((row) => text(row[cols.wertung]).toLowerCase().replace(/[^a-z0-9]/g, ""));
      if (scoring.some((value) => value.includes("einzel"))) {
        for (const discipline of helpers.DISCIPLINES) {
          addMedal(finalPlace(athlete.rows, discipline.placeCol, discipline.col, cols.vorlaeufe), athlete.category, "individual");
        }
      }
      if (scoring.some((value) => value.includes("mehrkampf") || /^\d+kampf$/.test(value))) {
        addMedal(finalPlace(athlete.rows, cols.pMehrkampf, null, cols.vorlaeufe), athlete.category, "multi");
      }
    }

    return {
      categories: categories.map(({ editions, ...category }) => ({ ...category, count: editions.size })),
      competitions: categories.reduce((sum, category) => sum + category.editions.size, 0),
      medals, medalTypes,
      firstYear: years.size ? Math.min(...years) : null,
      lastYear: years.size ? Math.max(...years) : null
    };
  }

  function renderAchievements(data, group, h) {
    const format = (value) => Number(value).toLocaleString("de-DE");
    const maxCount = Math.max(1, ...data.categories.map((category) => category.count));
    const maxMedals = Math.max(1, data.medals.gold, data.medals.silver, data.medals.bronze);
    const range = data.firstYear == null ? "Alle erfassten Jahre"
      : data.firstYear === data.lastYear ? String(data.firstYear) : `${data.firstYear}–${data.lastYear}`;
    const title = (heading, total, unit) => h("div", { class: "club-achievements-card-head" },
      h("h3", {}, heading),
      h("span", { class: "club-achievements-total" }, h("strong", {}, format(total)), ` ${unit}`));

    return h("div", { class: "club-achievements" },
      h("p", { class: "club-achievements-scope" }, `Starts für ${GROUP_LABELS[group.kind]} · ${range}`),
      data.competitions ? null : h("p", { class: "club-achievements-empty" }, "Für diese Gliederung sind in diesen Wettkampfarten bisher keine Teilnahmen erfasst."),
      h("div", { class: "club-achievements-grid" },
        h("section", { class: "club-achievements-card", "aria-label": "Wettkampfbeteiligungen" },
          title("Wettkampfbeteiligungen", data.competitions, "Austragungen"),
          h("p", { class: "club-achievements-caption" }, "Jede Austragung zählt einmal, unabhängig von der Zahl der Sportler und Starts."),
          h("ul", { class: "club-achievements-participations" }, data.categories.map((category) =>
            h("li", {},
              h("span", { class: "club-achievements-event" }, category.label),
              h("span", { class: "club-achievements-track", "aria-hidden": "true" },
                h("span", { class: "club-achievements-bar", style: `width:${category.count / maxCount * 100}%` })),
              h("span", { class: "club-achievements-count" }, format(category.count)))))
        ),
        h("section", { class: "club-achievements-card club-achievements-card--medals", "aria-label": "Medaillen" },
          title("Medaillen", medalTotal(data.medals), "gesamt"),
          h("p", { class: "club-achievements-caption" }, "Abschließende Platzierungen in den neun Wettkampfarten."),
          h("div", { class: "club-achievements-medals" }, [
            { key: "gold", label: "Gold" }, { key: "silver", label: "Silber" }, { key: "bronze", label: "Bronze" }
          ].map(({ key, label }) => h("div", { class: `club-achievements-medal club-achievements-medal--${key}` },
            h("strong", { class: "club-achievements-medal-count" }, format(data.medals[key])),
            h("div", { class: "club-achievements-medal-track", "aria-hidden": "true" },
              h("span", { class: "club-achievements-medal-bar", style: `height:${data.medals[key] / maxMedals * 100}%` })),
            h("span", { class: "club-achievements-medal-label" }, label)))),
          h("div", { class: "club-achievements-medal-types" },
            h("span", {}, `Einzel: ${format(data.medalTypes.individual)}`),
            h("span", {}, `Mehrkampf: ${format(data.medalTypes.multi)}`))
        )
      )
    );
  }

  window.ClubsProfileAchievements = {
    async render(panel, group, helpers) {
      if (!panel || !group) return;
      const { h } = helpers;
      panel.innerHTML = "";
      const mount = h("div", {}, h("div", { class: "club-bests-status", role: "status" }, "Erfolge werden geladen …"));
      panel.appendChild(mount);
      try {
        const rows = await helpers.getBestenlisteRows();
        const data = buildAchievementsData(rows, group, helpers);
        mount.replaceChildren(renderAchievements(data, group, h));
      } catch (error) {
        console.error("Club-Erfolge konnten nicht geladen werden:", error);
        mount.replaceChildren(h("div", { class: "club-bests-status club-bests-status--error", role: "status" }, "Erfolge konnten nicht geladen werden."));
      }
    }
  };
})();
