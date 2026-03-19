(function () {
  const COLS = {
    gender: 0,
    name: 1,
    excelDate: 9,
    meetName: 10,
    yy2: 11,
    ortsgruppe: 12,
    pool: 21,
    land: 23,
    startrecht: 24
  };

  const TOP10_GROUPS = [
    { key: "competition_presence", label: "Wettkämpfe besucht" },
    { key: "athlete_count", label: "Sportler je Ortsgruppe" },
    { key: "foreign_competitions", label: "Wettkämpfe im Ausland" },
    { key: "pool50_competitions", label: "Wettkämpfe auf 50m-Bahn" },
    { key: "bv_startrecht", label: "Startrecht Bundesverband" },
    { key: "loyalty_average", label: "Ø Wettkämpfe pro Sportler" }
  ];

  const GROUP_VALUE_LABEL = {
    competition_presence: "Wettkämpfe",
    athlete_count: "Sportler",
    foreign_competitions: "Wettkämpfe",
    pool50_competitions: "Wettkämpfe",
    bv_startrecht: "BV-Starts",
    loyalty_average: "Ø Wettkämpfe"
  };

  const GROUP_NOTES = {
    competition_presence:
      "Gezählt werden eindeutige Wettkämpfe pro Ortsgruppe. Mehrere Sportler derselben Ortsgruppe bei einem Wettkampf werden nur einmal gewertet. Ettlingen und Wettersbach zählen dabei gemeinsam als eine Ortsgruppe.",
    athlete_count:
      "Gezählt werden eindeutige Sportler pro Ortsgruppe. Mehrere Starts derselben Person für dieselbe Ortsgruppe zählen nur einmal.",
    foreign_competitions:
      "Gezählt werden eindeutige Auslands-Wettkämpfe pro Ortsgruppe. Mehrere Sportler derselben Ortsgruppe bei einem Wettkampf werden nur einmal gewertet.",
    pool50_competitions:
      "Gezählt werden eindeutige Wettkämpfe auf 50m-Bahn pro Ortsgruppe. Mehrere Sportler derselben Ortsgruppe bei einem Wettkampf werden nur einmal gewertet.",
    bv_startrecht:
      "Gezählt werden eindeutige Kombinationen aus Sportler und Wettkampf pro Ortsgruppe, sobald das Startrecht auf `BV` steht. Mehrere Zeilen derselben Person beim selben Wettkampf zählen dabei nur einmal.",
    loyalty_average:
      "Pro Ortsgruppe wird für jede Person gezählt, auf wie vielen eindeutigen Wettkämpfen sie dort gestartet ist. Diese Werte werden anschließend pro Ortsgruppe gemittelt. Ettlingen und Wettersbach werden dabei gemeinsam als `Ettlingen/Wettersbach` behandelt."
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") el.className = value;
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key === "text") el.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
    }

    for (const child of children.flat()) {
      if (child == null) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }

    return el;
  }

  const State = {
    mount: null,
    groups: null,
    currentKey: "competition_presence",
    openProfile: null
  };

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function excelSerialToISO(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + num * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function parseTwoDigitYearWithMeetYear(twoDigit, meetISO) {
    const yy = Number(twoDigit);
    const meetYear = Number((meetISO || "").slice(0, 4));
    if (!Number.isFinite(yy) || !Number.isFinite(meetYear)) return null;

    let year = 1900 + yy;
    while (meetYear - year > 100) year += 100;
    return year;
  }

  function splitNameParts(name) {
    const raw = String(name || "").trim();
    if (!raw) return { lastName: "", firstName: "" };

    if (raw.includes(",")) {
      const [lastName, firstName] = raw.split(/,(.+)/).map((part) => String(part || "").trim());
      return { lastName, firstName };
    }

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { lastName: raw, firstName: "" };
    }

    return {
      lastName: parts[parts.length - 1],
      firstName: parts.slice(0, -1).join(" ")
    };
  }

  function slugPart(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  function makeAthleteId(name, gender, birthYear) {
    const { lastName, firstName } = splitNameParts(name);
    const last = slugPart(lastName) || "x";
    const first = slugPart(firstName) || "x";
    const g = String(gender || "").toLowerCase().startsWith("w") ? "w" : "m";
    return `${last},${first}_${g}_${birthYear || "x"}`;
  }

  function normalizeMeetName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/\s+-\s+.*$/, "")
      .trim();
  }

  function normalizeLand(value) {
    const land = String(value || "").trim();
    if (!land) return "";
    if (land.toUpperCase() === "GER") return "Deutschland";
    return land;
  }

  function buildMeetKey(row) {
    const meetName = normalizeMeetName(row?.[COLS.meetName]);
    if (!meetName) return "";

    const iso = excelSerialToISO(row?.[COLS.excelDate]);
    const year = iso ? iso.slice(0, 4) : "";
    return `${normalizeText(meetName)}|${year || "x"}`;
  }

  function isHeaderRow(row) {
    const meetName = normalizeText(row?.[COLS.meetName]);
    const ogName = normalizeText(row?.[COLS.ortsgruppe]);
    return meetName.includes("meet") || meetName.includes("wett") || ogName.includes("orts");
  }

  function normalizeRank(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function formatAverage(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0,0";
    return num.toFixed(1).replace(".", ",");
  }

  function tieKeyFromValue(value) {
    const num = Number(value);
    return Number.isFinite(num) ? `n:${num}` : `s:${String(value ?? "")}`;
  }

  function applyRanks(rows) {
    let prevKey = null;
    let prevRank = 0;

    return rows.map((row, idx) => {
      const key = tieKeyFromValue(row.value);
      const displayRank = idx === 0 ? 1 : key === prevKey ? prevRank : idx + 1;
      prevKey = key;
      prevRank = displayRank;
      return { ...row, displayRank, rank: normalizeRank(row.rank, idx + 1) };
    });
  }

  function interactiveProps(row) {
    if (!row?.group || typeof State.openProfile !== "function") return {};

    return {
      role: "button",
      tabindex: "0",
      onclick: () => State.openProfile(row.group),
      onkeydown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          State.openProfile(row.group);
        }
      }
    };
  }

  function renderClubAvatar(group, size = "md") {
    const wrapper = h("span", { class: `ath10-cap ath10-cap--${size} clubs10-cap-host` });

    if (window.ClubsSearch && typeof window.ClubsSearch.renderAvatar === "function") {
      wrapper.appendChild(window.ClubsSearch.renderAvatar(group, "sm", "clubs10-avatar"));
    }

    return wrapper;
  }

  function renderCategorySelect(available, currentKey) {
    const select = h(
      "select",
      { class: "ath10-select", "aria-label": "Top-10 Kategorie auswählen" },
      available.map((group) => h("option", { value: group.key, selected: group.key === currentKey }, group.label))
    );

    select.addEventListener("change", (event) => {
      State.currentKey = event.target.value;
      renderTop10();
    });

    return select;
  }

  function renderToolbar(available, currentKey) {
    const tabs = h(
      "div",
      { class: "ath10-tabs", role: "tablist", "aria-label": "Top-10 Kategorien" },
      available.map((group) =>
        h(
          "button",
          {
            class: `ath10-tab${group.key === currentKey ? " is-active" : ""}`,
            type: "button",
            role: "tab",
            "aria-selected": group.key === currentKey ? "true" : "false",
            onclick: () => {
              State.currentKey = group.key;
              renderTop10();
            }
          },
          group.label
        )
      )
    );

    return h("div", { class: "ath10-toolbar" }, tabs);
  }

  function podiumPlaceClass(displayRank) {
    if (displayRank === 1) return "place1";
    if (displayRank === 2) return "place2";
    if (displayRank === 3) return "place3";
    return "placeX";
  }

  function renderPodiumCard(row, slotPos, valueLabel) {
    const slotClass = `ath10-podium-slot--pos${slotPos}`;

    if (!row) {
      return h(
        "div",
        { class: `ath10-podium-slot ${slotClass} is-empty`, "aria-hidden": "true" },
        h("div", { class: "ath10-podium-card ath10-podium-card--empty" }),
        h("div", { class: "ath10-podium-base ath10-podium-base--placeX" })
      );
    }

    const place = row.displayRank || row.rank || slotPos;
    const placeCls = podiumPlaceClass(place);

    return h(
      "div",
      { class: `ath10-podium-slot ${slotClass}` },
      h(
        "div",
        {
          class: `ath10-podium-card ath10-podium-card--${placeCls}`,
          ...interactiveProps(row)
        },
        h(
          "div",
          { class: "ath10-podium-athlete" },
          renderClubAvatar(row.group, place === 1 ? "lg" : "md"),
          h(
            "div",
            { class: "ath10-podium-meta" },
            h("div", { class: "ath10-podium-name" }, row.name || "—"),
            h("div", { class: "ath10-podium-og" }, row.subtitle || "Ortsgruppe")
          )
        ),
        h(
          "div",
          { class: "ath10-podium-score" },
          h("span", { class: "ath10-podium-score-value" }, String(row.displayValue ?? row.value ?? "")),
          h("span", { class: "ath10-podium-score-label" }, valueLabel || "Wert")
        )
      ),
      h(
        "div",
        { class: `ath10-podium-base ath10-podium-base--${placeCls}` },
        h("span", { class: "ath10-podium-base-rank" }, `${place}. Platz`)
      )
    );
  }

  function renderPodium(group) {
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    if (!rows.length) return null;

    const topRows = rows.slice(0, 3);
    return h(
      "section",
      { class: "ath10-podium-section", "aria-label": "Podest Top 3" },
      h(
        "div",
        { class: "ath10-podium-grid" },
        renderPodiumCard(topRows[1] || null, 2, group.valueLabel),
        renderPodiumCard(topRows[0] || null, 1, group.valueLabel),
        renderPodiumCard(topRows[2] || null, 3, group.valueLabel)
      )
    );
  }

  function renderRemainingTable(group) {
    const rows = Array.isArray(group?.rows) ? group.rows.slice(3) : [];
    if (!rows.length) return null;

    return h(
      "section",
      { class: "ath10-rest-section", "aria-label": "Weitere Platzierungen" },
      h("div", { class: "ath10-rest-head" }),
      h(
        "div",
        { class: "ath10-table-wrap" },
        h(
          "table",
          { class: "ath10-table" },
          h("thead", {}),
          h(
            "tbody",
            {},
            rows.map((row, idx) =>
              h(
                "tr",
                { class: "ath10-row", ...interactiveProps(row) },
                h(
                  "td",
                  { class: "ath10-td ath10-td-rank" },
                  h("span", { class: "ath10-rank-badge" }, `${row.displayRank ?? normalizeRank(row.rank, idx + 4)}.`)
                ),
                h(
                  "td",
                  { class: "ath10-td ath10-td-athlete" },
                  h(
                    "div",
                    { class: "ath10-athlete" },
                    renderClubAvatar(row.group, "md"),
                    h(
                      "div",
                      { class: "ath10-athlete-meta" },
                      h("div", { class: "ath10-athlete-name" }, row.name || "—"),
                      h("div", { class: "ath10-athlete-og" }, row.subtitle || "Ortsgruppe")
                    )
                  )
                ),
                h(
                  "td",
                  { class: "ath10-td ath10-td-value" },
                  h("span", { class: "ath10-value-pill" }, String(row.displayValue ?? row.value ?? ""))
                )
              )
            )
          )
        )
      )
    );
  }

  function renderPanelHeader(group, available, currentKey) {
    return h(
      "div",
      { class: "ath10-panel-head" },
      h(
        "div",
        { class: "ath10-panel-title-wrap" },
        h("div", { class: "ath10-panel-kicker" }, "Kategorie"),
        h("div", { class: "ath10-panel-tabs-wrap" }, renderToolbar(available, currentKey)),
        h(
          "div",
          { class: "ath10-select-wrap ath10-select-wrap--panel" },
          renderCategorySelect(available, currentKey)
        )
      )
    );
  }

  function renderNote(group) {
    if (!group?.note) return null;
    return h(
      "div",
      { class: "ath10-note", role: "note" },
      h("div", { class: "ath10-note-title" }, "Hinweis"),
      h("div", { class: "ath10-note-text" }, group.note)
    );
  }

  function buildMeetCountGroup(rows, allGroups, config) {
    const groupByName = new Map(
      (Array.isArray(allGroups) ? allGroups : [])
        .filter((group) => group?.kind === "og")
        .map((group) => [String(group.name || "").trim(), group])
    );

    const counts = new Map();
    const startIndex = rows.length && isHeaderRow(rows[0]) ? 1 : 0;

    for (let index = startIndex; index < rows.length; index++) {
      const row = rows[index] || [];
      const ogName = window.ClubsData?.normalizeOrtsgruppeName
        ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
        : String(row[COLS.ortsgruppe] || "").trim();
      const meetKey = buildMeetKey(row);

      if (!ogName || !meetKey) continue;
      if (typeof config.filter === "function" && !config.filter(row)) continue;

      if (!counts.has(ogName)) {
        counts.set(ogName, { meetKeys: new Set() });
      }

      counts.get(ogName).meetKeys.add(meetKey);
    }

    const sortedRows = Array.from(counts.entries())
      .map(([name, entry]) => {
        const group = groupByName.get(name) || null;
        return {
          name,
          subtitle: group?.subtitle || "Ortsgruppe",
          value: entry.meetKeys.size,
          group
        };
      })
      .sort((left, right) => {
        const diff = Number(right.value) - Number(left.value);
        if (diff !== 0) return diff;
        return String(left.name || "").localeCompare(String(right.name || ""), "de", { sensitivity: "base" });
      })
      .slice(0, 10)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      key: config.key,
      label: config.label,
      valueLabel: config.valueLabel,
      note: config.note,
      rows: applyRanks(sortedRows)
    };
  }

  function buildCompetitionPresenceGroup(rows, allGroups) {
    return buildMeetCountGroup(rows, allGroups, {
      key: "competition_presence",
      label: TOP10_GROUPS[0].label,
      valueLabel: GROUP_VALUE_LABEL.competition_presence,
      note: GROUP_NOTES.competition_presence
    });
  }

  function buildAthleteCountGroup(rows, allGroups) {
    const groupByName = new Map(
      (Array.isArray(allGroups) ? allGroups : [])
        .filter((group) => group?.kind === "og")
        .map((group) => [String(group.name || "").trim(), group])
    );

    const counts = new Map();
    const startIndex = rows.length && isHeaderRow(rows[0]) ? 1 : 0;

    for (let index = startIndex; index < rows.length; index++) {
      const row = rows[index] || [];
      const ogName = window.ClubsData?.normalizeOrtsgruppeName
        ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
        : String(row[COLS.ortsgruppe] || "").trim();
      const name = String(row[COLS.name] || "").trim();
      const gender = String(row[COLS.gender] || "").trim();
      const meetISO = excelSerialToISO(row[COLS.excelDate]);
      const birthYear = parseTwoDigitYearWithMeetYear(row[COLS.yy2], meetISO);
      const athleteId = makeAthleteId(name, gender, birthYear);

      if (!ogName || !name) continue;

      if (!counts.has(ogName)) {
        counts.set(ogName, { athleteIds: new Set() });
      }

      counts.get(ogName).athleteIds.add(athleteId);
    }

    const sortedRows = Array.from(counts.entries())
      .map(([name, entry]) => {
        const group = groupByName.get(name) || null;
        return {
          name,
          subtitle: group?.subtitle || "Ortsgruppe",
          value: entry.athleteIds.size,
          group
        };
      })
      .sort((left, right) => {
        const diff = Number(right.value) - Number(left.value);
        if (diff !== 0) return diff;
        return String(left.name || "").localeCompare(String(right.name || ""), "de", { sensitivity: "base" });
      })
      .slice(0, 10)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      key: "athlete_count",
      label: TOP10_GROUPS[1].label,
      valueLabel: GROUP_VALUE_LABEL.athlete_count,
      note: GROUP_NOTES.athlete_count,
      rows: applyRanks(sortedRows)
    };
  }

  function buildForeignCompetitionGroup(rows, allGroups) {
    return buildMeetCountGroup(rows, allGroups, {
      key: "foreign_competitions",
      label: TOP10_GROUPS[2].label,
      valueLabel: GROUP_VALUE_LABEL.foreign_competitions,
      note: GROUP_NOTES.foreign_competitions,
      filter: (row) => {
        const land = normalizeLand(row?.[COLS.land]);
        return !!land && land !== "Deutschland";
      }
    });
  }

  function buildPool50CompetitionGroup(rows, allGroups) {
    return buildMeetCountGroup(rows, allGroups, {
      key: "pool50_competitions",
      label: TOP10_GROUPS[3].label,
      valueLabel: GROUP_VALUE_LABEL.pool50_competitions,
      note: GROUP_NOTES.pool50_competitions,
      filter: (row) => String(row?.[COLS.pool] || "").trim() === "50"
    });
  }

  function buildBvStartrechtGroup(rows, allGroups) {
    const groupByName = new Map(
      (Array.isArray(allGroups) ? allGroups : [])
        .filter((group) => group?.kind === "og")
        .map((group) => [String(group.name || "").trim(), group])
    );

    const counts = new Map();
    const startIndex = rows.length && isHeaderRow(rows[0]) ? 1 : 0;

    for (let index = startIndex; index < rows.length; index++) {
      const row = rows[index] || [];
      const startrecht = String(row?.[COLS.startrecht] || "").trim().toUpperCase();
      if (startrecht !== "BV") continue;

      const ogName = window.ClubsData?.normalizeOrtsgruppeName
        ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
        : String(row[COLS.ortsgruppe] || "").trim();
      const meetKey = buildMeetKey(row);
      const name = String(row[COLS.name] || "").trim();
      const gender = String(row[COLS.gender] || "").trim();
      const meetISO = excelSerialToISO(row[COLS.excelDate]);
      const birthYear = parseTwoDigitYearWithMeetYear(row[COLS.yy2], meetISO);
      const athleteId = makeAthleteId(name, gender, birthYear);

      if (!ogName || !meetKey || !name) continue;

      if (!counts.has(ogName)) {
        counts.set(ogName, { athleteMeetKeys: new Set() });
      }

      counts.get(ogName).athleteMeetKeys.add(`${athleteId}||${meetKey}`);
    }

    const sortedRows = Array.from(counts.entries())
      .map(([name, entry]) => {
        const group = groupByName.get(name) || null;
        return {
          name,
          subtitle: group?.subtitle || "Ortsgruppe",
          value: entry.athleteMeetKeys.size,
          group
        };
      })
      .sort((left, right) => {
        const diff = Number(right.value) - Number(left.value);
        if (diff !== 0) return diff;
        return String(left.name || "").localeCompare(String(right.name || ""), "de", { sensitivity: "base" });
      })
      .slice(0, 10)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      key: "bv_startrecht",
      label: TOP10_GROUPS[4].label,
      valueLabel: GROUP_VALUE_LABEL.bv_startrecht,
      note: GROUP_NOTES.bv_startrecht,
      rows: applyRanks(sortedRows)
    };
  }

  function buildLoyaltyAverageGroup(rows, allGroups) {
    const groupByName = new Map(
      (Array.isArray(allGroups) ? allGroups : [])
        .filter((group) => group?.kind === "og")
        .map((group) => [String(group.name || "").trim(), group])
    );

    const counts = new Map();
    const startIndex = rows.length && isHeaderRow(rows[0]) ? 1 : 0;

    for (let index = startIndex; index < rows.length; index++) {
      const row = rows[index] || [];
      const ogName = window.ClubsData?.normalizeOrtsgruppeName
        ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
        : String(row[COLS.ortsgruppe] || "").trim();
      const meetKey = buildMeetKey(row);
      const name = String(row[COLS.name] || "").trim();
      const gender = String(row[COLS.gender] || "").trim();
      const meetISO = excelSerialToISO(row[COLS.excelDate]);
      const birthYear = parseTwoDigitYearWithMeetYear(row[COLS.yy2], meetISO);
      const athleteId = makeAthleteId(name, gender, birthYear);

      if (!ogName || !meetKey || !name) continue;

      if (!counts.has(ogName)) {
        counts.set(ogName, new Map());
      }

      const athleteMap = counts.get(ogName);
      if (!athleteMap.has(athleteId)) {
        athleteMap.set(athleteId, new Set());
      }

      athleteMap.get(athleteId).add(meetKey);
    }

    const sortedRows = Array.from(counts.entries())
      .map(([name, athleteMap]) => {
        const group = groupByName.get(name) || null;
        const athleteMeetCounts = Array.from(athleteMap.values()).map((meetKeys) => meetKeys.size);
        const total = athleteMeetCounts.reduce((sum, count) => sum + count, 0);
        const average = athleteMeetCounts.length ? total / athleteMeetCounts.length : 0;

        return {
          name,
          subtitle: group?.subtitle || "Ortsgruppe",
          athleteCount: athleteMeetCounts.length,
          value: Number(average.toFixed(3)),
          displayValue: formatAverage(average),
          group
        };
      })
      .filter((row) => Number(row.athleteCount) >= 10)
      .sort((left, right) => {
        const diff = Number(right.value) - Number(left.value);
        if (diff !== 0) return diff;
        return String(left.name || "").localeCompare(String(right.name || ""), "de", { sensitivity: "base" });
      })
      .slice(0, 10)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      key: "loyalty_average",
      label: TOP10_GROUPS[5].label,
      valueLabel: GROUP_VALUE_LABEL.loyalty_average,
      note: `${GROUP_NOTES.loyalty_average} Berücksichtigt werden nur Ortsgruppen mit mindestens 10 Sportlern.`,
      rows: applyRanks(sortedRows)
    };
  }

  async function buildGroups() {
    const rows = await window.ClubsData.loadWorkbookArray("Tabelle2");
    const { groups: allGroups } = await window.ClubsData.loadGroupsAndStats({ sheetName: "Tabelle2" });

    return {
      competition_presence: buildCompetitionPresenceGroup(rows, allGroups),
      athlete_count: buildAthleteCountGroup(rows, allGroups),
      foreign_competitions: buildForeignCompetitionGroup(rows, allGroups),
      pool50_competitions: buildPool50CompetitionGroup(rows, allGroups),
      bv_startrecht: buildBvStartrechtGroup(rows, allGroups),
      loyalty_average: buildLoyaltyAverageGroup(rows, allGroups)
    };
  }

  function renderTop10() {
    const mount = State.mount;
    if (!mount) return;

    const groups = State.groups || {};
    const available = TOP10_GROUPS
      .map((def) => groups[def.key])
      .filter((group) => group && Array.isArray(group.rows) && group.rows.length > 0);

    if (!available.length) {
      mount.innerHTML = '<div class="ath10-status ath10-status--empty">Keine Top-10 Daten vorhanden.</div>';
      return;
    }

    if (!available.some((group) => group.key === State.currentKey)) {
      State.currentKey = available[0].key;
    }

    const current = available.find((group) => group.key === State.currentKey) || available[0];

    const shell = h(
      "section",
      { class: "ath10-shell", "aria-label": "Top-10 Ranglisten" },
      h(
        "header",
        { class: "ath10-header" },
        h(
          "div",
          { class: "ath10-header-text" },
          h("div", { class: "ath10-kicker" }, "Clubstatistik"),
          h("h2", { class: "ath10-title" }, "Top-10 Ranglisten")
        )
      ),
      h(
        "section",
        { class: "ath10-panel" },
        renderPanelHeader(current, available, State.currentKey),
        renderPodium(current),
        renderRemainingTable(current)
      ),
      renderNote(current)
    );

    mount.innerHTML = "";
    mount.classList.add("ath10-root");
    mount.appendChild(shell);
  }

  async function init() {
    const mount = State.mount;
    if (!mount) return;

    try {
      State.groups = await buildGroups();
      renderTop10();
    } catch (error) {
      console.error(error);
      mount.innerHTML = '<div class="ath10-status ath10-status--error">Top-10 konnten nicht geladen werden.</div>';
    }
  }

  function mountComponent(mountEl, options = {}) {
    const el = typeof mountEl === "string" ? $(mountEl) : mountEl;
    if (!el) return;

    State.mount = el;
    State.openProfile = typeof options.openProfile === "function" ? options.openProfile : null;
    State.currentKey = "competition_presence";
    State.groups = null;

    el.innerHTML = '<div class="ath10-status ath10-status--loading">Top-10 wird geladen ...</div>';
    init();
  }

  window.ClubsTop10 = { mount: mountComponent };
})();
