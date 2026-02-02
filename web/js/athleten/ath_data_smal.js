(function () {
  const DEFAULT_EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx";

  const COLS = {
    gender: 0,
    name: 1,
    excelDate: 9,
    meet_name: 10,
    yy2: 11,
    ortsgruppe: 12,
    LV_state: 13,
    regelwerk: 22,
    startrecht: 24,
    BV_natio: 27
  };

  const State = {
    excelUrl: DEFAULT_EXCEL_URL
  };

  function excelSerialToISO(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + num * 86400000);
    return d.toISOString().slice(0, 10);
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

  let xlsxScriptPromise = null;

  async function ensureXLSX() {
    if (window.XLSX) return;
    if (!xlsxScriptPromise) {
      xlsxScriptPromise = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    await xlsxScriptPromise;
  }

  let workbookPromise = null;
  let workbookUrl = null;

  async function getWorkbook(excelUrl) {
    const url = encodeURI(excelUrl);

    if (workbookPromise && workbookUrl === url) return workbookPromise;

    workbookUrl = url;
    workbookPromise = (async () => {
      await ensureXLSX();
      const resp = await fetch(url, { mode: "cors" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = await resp.arrayBuffer();
      return XLSX.read(buf, { type: "array" });
    })();

    return workbookPromise;
  }

  async function loadWorkbookArray(sheetName = "Tabelle2", excelUrl = State.excelUrl) {
    const wb = await getWorkbook(excelUrl);
    const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  }

  async function loadAthletes(opts = {}) {
    const excelUrl = typeof opts.excelUrl === "string" ? opts.excelUrl : State.excelUrl;
    const sheetName = typeof opts.sheetName === "string" ? opts.sheetName : "Tabelle2";
    const rows = await loadWorkbookArray(sheetName, excelUrl);
    return buildIndicesFromRows(rows);
  }

  window.AthDataSmall = { loadAthletes, buildIndicesFromRows, loadWorkbookArray };
})();
