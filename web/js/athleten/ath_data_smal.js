(function () {
  const COLS = {
    gender: 0,
    name: 1,
    d1: 3,
    d2: 4,
    d3: 5,
    d4: 6,
    d5: 7,
    d6: 8,
    excelDate: 9,
    meet_name: 10,
    yy2: 11,
    ortsgruppe: 12,
    LV_state: 13,
    p1: 15,
    p2: 16,
    p3: 17,
    p4: 18,
    p5: 19,
    p6: 20,
    regelwerk: 22,
    startrecht: 24,
    BV_natio: 27
  };

  function excelSerialToISO(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + num * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function excelSerialToDate(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return null;
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + num * 86400000);
  }

  function formatDateDEFromExcelSerial(n) {
    const d = excelSerialToDate(n);
    if (!d) return "";
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  function regelwerkKind(v) {
    const t = String(v || "").toLowerCase().trim();
    if (t.startsWith("nat") || t.startsWith("national")) return "nat";
    if (t.startsWith("int") || t.startsWith("international")) return "int";
    return "other";
  }

  function parseTwoDigitYearWithMeetYear(twoDigit, meetISO) {
    const yy = Number(twoDigit);
    const meetYear = Number((meetISO || "").slice(0, 4));
    if (!Number.isFinite(yy) || !Number.isFinite(meetYear)) return null;
    let y = 1900 + yy;
    while (meetYear - y > 100) y += 100;
    return y;
  }

  function normalizePool(v) {
    const value = String(v || "").trim();
    return value === "25" || value === "50" ? value : "";
  }

  function normalizeStartrecht(s) {
    const value = String(s || "").trim().toUpperCase();
    return value === "OG" || value === "LV" || value === "BV" || value === "BZ" ? value : "";
  }

  function toNumOrBlank(v) {
    const n = parseInt(String(v).replace(/[^\d\-]/g, ""), 10);
    return Number.isFinite(n) ? String(n) : String(v || "").trim();
  }

  function makeAthleteId(name, gender, birthYear) {
    const base = (name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    const g = String(gender || "").toLowerCase().startsWith("w") ? "w" : "m";
    return `ath_${base}_${birthYear || "x"}_${g}`;
  }

  function buildIndicesFromRows(rows) {
    const byId = new Map();

    const isNewerNum = (curNum, prevNum) =>
      Number.isFinite(curNum) && (!Number.isFinite(prevNum) || curNum >= prevNum);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const name = String(row[COLS.name] || "").trim();
      const gender = String(row[COLS.gender] || "").trim();

      const dNum = Number(row[COLS.excelDate]);
      const iso = excelSerialToISO(row[COLS.excelDate]);

      const yy2 = row[COLS.yy2];
      const jahrgang = parseTwoDigitYearWithMeetYear(yy2, iso);

      const og = String(row[COLS.ortsgruppe] || "").trim();
      const kind = regelwerkKind(row[COLS.regelwerk]);

      const lv = String(row[COLS.LV_state] ?? "").trim().toUpperCase();
      const bv = String(row[COLS.BV_natio] ?? "").trim();
      const sr = String(row[COLS.startrecht] ?? "").trim().toUpperCase();

      if (!name || !jahrgang) continue;

      const id = makeAthleteId(name, gender, jahrgang);

      let rec = byId.get(id);
      if (!rec) {
        rec = {
          id,
          name,
          jahrgang,
          geschlecht: gender,
          _bestAnyNum: -Infinity,
          _bestAnyKind: "other",
          _bestOgAnyNum: -Infinity,
          _bestOgAny: "",
          _bestNatNum: -Infinity,
          _bestNat: null,
          _bestIntNum: -Infinity,
          _bestInt: null,
          _lastLVNum: -Infinity,
          _lastLV: "",
          _lastBVNum: -Infinity,
          _lastBV: "",
          _lastSRNum: -Infinity,
          _lastSR: ""
        };
        byId.set(id, rec);
      }

      if (isNewerNum(dNum, rec._bestAnyNum)) {
        rec._bestAnyNum = dNum;
        rec._bestAnyKind = kind;
      }

      if (lv && isNewerNum(dNum, rec._lastLVNum)) {
        rec._lastLVNum = dNum;
        rec._lastLV = lv;
      }
      if (bv && isNewerNum(dNum, rec._lastBVNum)) {
        rec._lastBVNum = dNum;
        rec._lastBV = bv;
      }
      if (sr && isNewerNum(dNum, rec._lastSRNum)) {
        rec._lastSRNum = dNum;
        rec._lastSR = sr;
      }

      if (og && isNewerNum(dNum, rec._bestOgAnyNum)) {
        rec._bestOgAnyNum = dNum;
        rec._bestOgAny = og;
      }

      if (og) {
        const packed = { og, lv, bv, sr };

        if (kind === "nat") {
          if (isNewerNum(dNum, rec._bestNatNum)) {
            rec._bestNatNum = dNum;
            rec._bestNat = packed;
          }
        } else if (kind === "int") {
          if (isNewerNum(dNum, rec._bestIntNum)) {
            rec._bestIntNum = dNum;
            rec._bestInt = packed;
          }
        }
      }
    }

    const athletes = Array.from(byId.values()).map((rec) => {
      const hasNat = !!rec._bestNat;
      const hasInt = !!rec._bestInt;

      let basis = null;

      if (hasNat && !hasInt) {
        basis = rec._bestNat;
      } else if (!hasNat && hasInt) {
        basis = rec._bestInt;
      } else if (hasNat && hasInt) {
        const lastWasInt = rec._bestAnyKind === "int";

        const natStaleVsLastInt =
          lastWasInt &&
          Number.isFinite(rec._bestAnyNum) &&
          Number.isFinite(rec._bestNatNum) &&
          rec._bestAnyNum - rec._bestNatNum >= 365;

        basis = natStaleVsLastInt ? rec._bestInt : rec._bestNat;
      }

      const ortsgruppe = String(basis?.og || rec._bestOgAny || "").trim();
      const LV_state = String(basis?.lv || rec._lastLV || "").trim().toUpperCase();
      const BV_natio = String(basis?.bv || rec._lastBV || "").trim();
      const Startrecht = String(basis?.sr || rec._lastSR || "OG").trim().toUpperCase();

      return {
        id: rec.id,
        name: rec.name,
        jahrgang: rec.jahrgang,
        geschlecht: rec.geschlecht,
        ortsgruppe,
        LV_state,
        BV_natio,
        Startrecht
      };
    });

    athletes.sort((l, r) => l.name.localeCompare(r.name, "de"));
    return athletes;
  }

  function mapRowToAthleteMinimal(row) {
    const name = String(row[COLS.name] || "").trim();
    const gender = String(row[COLS.gender] || "").trim();
    const iso = excelSerialToISO(row[COLS.excelDate]);
    const yy2 = row[COLS.yy2];
    const jahrgang = parseTwoDigitYearWithMeetYear(yy2, iso);
    const ortsgruppe = String(row[COLS.ortsgruppe] || "").trim();

    return {
      id: makeAthleteId(name, gender, jahrgang),
      name,
      jahrgang,
      geschlecht: gender,
      ortsgruppe,
      LV_state: String(row[COLS.LV_state] ?? "").trim().toUpperCase(),
      BV_natio: String(row[COLS.BV_natio] ?? "").trim(),
      Startrecht: String(row[COLS.startrecht] ?? "").trim().toUpperCase()
    };
  }

  function mapRowToMeet(row) {
    return {
      meet_name: String(row[COLS.meet_name] || "").trim(),
      date: excelSerialToISO(row[COLS.excelDate]),
      Ortsgruppe: String(row[COLS.ortsgruppe] || "").trim(),
      LV_state: String(row[COLS.LV_state] ?? "").trim().toUpperCase(),
      BV_natio: String(row[COLS.BV_natio] ?? "").trim(),
      Land: String(row[23] ?? "").trim().toUpperCase(),
      Startrecht: normalizeStartrecht(row[COLS.startrecht]),
      Regelwerk: String(row[COLS.regelwerk] || "").trim(),
      Wertung: String(row[25] || "").trim(),
      pool: normalizePool(row[21]),
      LSC: String(row[2] ?? "").trim(),
      Mehrkampf_Platz: toNumOrBlank(row[14]),
      "100m_Lifesaver_Zeit": String(row[COLS.d1] ?? "").trim(),
      "50m_Retten_Zeit": String(row[COLS.d2] ?? "").trim(),
      "200m_SuperLifesaver_Zeit": String(row[COLS.d3] ?? "").trim(),
      "100m_Kombi_Zeit": String(row[COLS.d4] ?? "").trim(),
      "100m_Retten_Zeit": String(row[COLS.d5] ?? "").trim(),
      "200m_Hindernis_Zeit": String(row[COLS.d6] ?? "").trim(),
      "100m_Lifesaver_Platz": toNumOrBlank(row[COLS.p1]),
      "50m_Retten_Platz": toNumOrBlank(row[COLS.p2]),
      "200m_SuperLifesaver_Platz": toNumOrBlank(row[COLS.p3]),
      "100m_Kombi_Platz": toNumOrBlank(row[COLS.p4]),
      "100m_Retten_Platz": toNumOrBlank(row[COLS.p5]),
      "200m_Hindernis_Platz": toNumOrBlank(row[COLS.p6])
    };
  }

  function buildAthletesWithMeets(rows) {
    const athleteById = new Map();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const athlete = mapRowToAthleteMinimal(row);
      if (!athlete.name || !athlete.jahrgang) continue;

      if (!athleteById.has(athlete.id)) {
        athleteById.set(athlete.id, { ...athlete, meets: [], _lastOgNum: -Infinity });
      }

      const rec = athleteById.get(athlete.id);
      const meet = mapRowToMeet(row);
      rec.meets.push(meet);

      const dateNum = Number(row[COLS.excelDate]);
      if (athlete.ortsgruppe && Number.isFinite(dateNum) && dateNum >= rec._lastOgNum) {
        rec._lastOgNum = dateNum;
        rec.ortsgruppe = athlete.ortsgruppe;
      }

      if (athlete.LV_state && Number.isFinite(dateNum) && dateNum >= (rec._lastLVNum ?? -Infinity)) {
        rec._lastLVNum = dateNum;
        rec.LV_state = athlete.LV_state;
      }

      if (athlete.BV_natio && Number.isFinite(dateNum) && dateNum >= (rec._lastBVNum ?? -Infinity)) {
        rec._lastBVNum = dateNum;
        rec.BV_natio = athlete.BV_natio;
      }

      if (athlete.Startrecht && Number.isFinite(dateNum) && dateNum >= (rec._lastSRNum ?? -Infinity)) {
        rec._lastSRNum = dateNum;
        rec.Startrecht = athlete.Startrecht;
      }
    }

    const athletes = Array.from(athleteById.values()).map((rec) => {
      const out = { ...rec };
      delete out._lastOgNum;
      delete out._lastLVNum;
      delete out._lastBVNum;
      delete out._lastSRNum;
      out.meets.sort((l, r) => new Date(l.date) - new Date(r.date));
      return out;
    });

    athletes.sort((l, r) => l.name.localeCompare(r.name, "de"));
    return athletes;
  }

  function isFilled(v) {
    return !(v == null || (typeof v === "string" && v.trim() === ""));
  }

  function formatPercent(value, total) {
    if (!total) return "0,0";
    return ((value / total) * 100).toFixed(1).replace(".", ",");
  }

  function computeOverviewStatsFromRows(rows) {
    const athletes = buildIndicesFromRows(rows);

    const meets = new Set();

    let firstMeetNum = Infinity;
    let lastMeetNum = -Infinity;

    let starts = 0;
    let d1Starts = 0;
    let d2Starts = 0;
    let d3Starts = 0;
    let d4Starts = 0;
    let d5Starts = 0;
    let d6Starts = 0;

    let women = 0;
    let men = 0;

    for (let i = 0; i < athletes.length; i++) {
      if (String(athletes[i].geschlecht || "").toLowerCase().startsWith("w")) women++;
      else men++;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const meet = String(row[COLS.meet_name] || "").trim();
      const dNum = Number(row[COLS.excelDate]);

      if (meet) {
        meets.add(meet);
        if (Number.isFinite(dNum) && dNum < firstMeetNum) firstMeetNum = dNum;
        if (Number.isFinite(dNum) && dNum > lastMeetNum) lastMeetNum = dNum;
      }

      if (isFilled(row[COLS.d1]) || isFilled(row[COLS.p1])) {
        starts++;
        d1Starts++;
      }
      if (isFilled(row[COLS.d2]) || isFilled(row[COLS.p2])) {
        starts++;
        d2Starts++;
      }
      if (isFilled(row[COLS.d3]) || isFilled(row[COLS.p3])) {
        starts++;
        d3Starts++;
      }
      if (isFilled(row[COLS.d4]) || isFilled(row[COLS.p4])) {
        starts++;
        d4Starts++;
      }
      if (isFilled(row[COLS.d5]) || isFilled(row[COLS.p5])) {
        starts++;
        d5Starts++;
      }
      if (isFilled(row[COLS.d6]) || isFilled(row[COLS.p6])) {
        starts++;
        d6Starts++;
      }
    }

    const persons = athletes.length;
    const firstMeetYear =
      Number.isFinite(firstMeetNum) ? excelSerialToDate(firstMeetNum).getUTCFullYear() : "";
    const lastMeetDate = Number.isFinite(lastMeetNum) ? formatDateDEFromExcelSerial(lastMeetNum) : "";

    return {
      persons,
      meets: meets.size,
      starts,
      women,
      men,
      firstMeetYear,
      lastMeetDate,
      disciplineStarts: {
        d1: d1Starts,
        d2: d2Starts,
        d3: d3Starts,
        d4: d4Starts,
        d5: d5Starts,
        d6: d6Starts
      },
      chip1Title: `${formatPercent(women, persons)}% Frauen / ${formatPercent(men, persons)}% Männer`,
      chip2Title: `${firstMeetYear || "-" } bis ${lastMeetDate || "-"}`,
      chip3Title:
        `100m Lifesaver: ${formatPercent(d1Starts, starts)}%\n` +
        `50m Retten: ${formatPercent(d2Starts, starts)}%\n` +
        `200m Super-Lifesaver: ${formatPercent(d3Starts, starts)}%\n` +
        `100m Kombi: ${formatPercent(d4Starts, starts)}%\n` +
        `100m Retten Flossen: ${formatPercent(d5Starts, starts)}%\n` +
        `200m Hindernis: ${formatPercent(d6Starts, starts)}%`
    };
  }

  function getExcelLoader() {
    if (!window.ExcelLoader || typeof window.ExcelLoader.loadSheetRows !== "function") {
      throw new Error("ExcelLoader missing");
    }

    return window.ExcelLoader;
  }

  async function loadWorkbookArray(sheetName = "Tabelle2", excelUrl = "") {
    const loader = getExcelLoader();
    const options = {
      sheetName,
      defval: ""
    };

    if (typeof excelUrl === "string" && excelUrl.trim()) {
      options.excelUrl = excelUrl;
    } else {
      options.urlKey = "athleteData";
    }

    return loader.loadSheetRows(options);
  }

  async function loadAthletes(opts = {}) {
    const excelUrl = typeof opts.excelUrl === "string" ? opts.excelUrl : "";
    const sheetName = typeof opts.sheetName === "string" ? opts.sheetName : "Tabelle2";
    const rows = await loadWorkbookArray(sheetName, excelUrl);
    return buildIndicesFromRows(rows);
  }

  async function loadAthletesAndStats(opts = {}) {
    const excelUrl = typeof opts.excelUrl === "string" ? opts.excelUrl : "";
    const sheetName = typeof opts.sheetName === "string" ? opts.sheetName : "Tabelle2";
    const rows = await loadWorkbookArray(sheetName, excelUrl);
    return {
      athletes: buildIndicesFromRows(rows),
      stats: computeOverviewStatsFromRows(rows)
    };
  }

  async function loadAthletesWithMeets(opts = {}) {
    const excelUrl = typeof opts.excelUrl === "string" ? opts.excelUrl : "";
    const sheetName = typeof opts.sheetName === "string" ? opts.sheetName : "Tabelle2";
    const rows = await loadWorkbookArray(sheetName, excelUrl);
    return buildAthletesWithMeets(rows);
  }

  window.AthDataSmall = {
    loadAthletes,
    loadAthletesAndStats,
    loadAthletesWithMeets,
    loadWorkbookArray,
    buildIndicesFromRows,
    buildAthletesWithMeets,
    computeOverviewStatsFromRows
  };
})();
