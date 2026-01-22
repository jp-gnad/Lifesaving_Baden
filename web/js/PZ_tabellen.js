/* PZ_tabellen.js
 * Tabellen-Engine für Pflichtzeiten/Nominierungslisten.
 *
 * Nutzung (ohne Module, klassisch):
 *   <script src=".../xlsx.full.min.js"></script>
 *   <script src="PZ_tabellen.js"></script>
 *   <script src="juniorenkader.js"></script>
 *
 * In juniorenkader.js dann:
 *   initPflichtzeitenTabellen("JRP", "JRP_konfig");
 */

(function (global) {
  "use strict";

  // ======= DEFAULTS (können bei Bedarf via opts überschrieben werden) =======
  const DEFAULT_DATA_EXCEL_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
  const DEFAULT_DATA_SHEET = "Tabelle2";

  const DEFAULT_CONFIG_EXCEL_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";

  // ======= DATA-Layout =======
  const DATA_COLS = {
    gender: 0,
    name: 1,
    zeit_100_lifesaver: 3,
    zeit_50_retten: 4,
    zeit_200_super: 5,
    zeit_100_kombi: 6,
    zeit_100_retten_flossen: 7,
    zeit_200_hindernis: 8,
    excelDatum: 9,
    meet_name: 10,
    yy2: 11,
    ortsgruppe: 12,
    landesverband: 13,
    poollaenge: 21,
    regelwerk: 22,
  };

  const DISCIPLINES = [
    { key: "ret50", label: "50m Retten", dataCol: DATA_COLS.zeit_50_retten },
    { key: "ret100", label: "100m Retten", dataCol: DATA_COLS.zeit_100_retten_flossen },
    { key: "kombi100", label: "100m Kombi", dataCol: DATA_COLS.zeit_100_kombi },
    { key: "life100", label: "100m Lifesaver", dataCol: DATA_COLS.zeit_100_lifesaver },
    { key: "super200", label: "200m Super-Lifesaver", dataCol: DATA_COLS.zeit_200_super },
    { key: "hind200", label: "200m Hindernis", dataCol: DATA_COLS.zeit_200_hindernis },
  ];

  const PZ_COLS = {
    pz1: {
      ret50: "PZ1 - 50m Retten",
      ret100: "PZ1 - 100m Retten",
      kombi100: "PZ1 - 100m Kombi",
      life100: "PZ1 - 100m Lifesaver",
      super200: "PZ1 - 200m Super-Lifesaver",
      hind200: "PZ1 - 200m Hindernis",
    },
    pz2: {
      ret50: "PZ2 - 50m Retten",
      ret100: "PZ2 - 100m Retten",
      kombi100: "PZ2 - 100m Kombi",
      life100: "PZ2 - 100m Lifesaver",
      super200: "PZ2 - 200m Super-Lifesaver",
      hind200: "PZ2 - 200m Hindernis",
    },
  };


  /**
   * Initialisiert die Pflichtzeiten-Tabellen.
   *
   * @param {string} configSheet
   * @param {string} configTableName
   * @param {object} [opts]
   * @param {string} [opts.mountId="pflichtzeiten-root"]
   * @param {string} [opts.statusId="pflichtzeiten-status"]
   * @param {string} [opts.dataExcelUrl=DEFAULT_DATA_EXCEL_URL]
   * @param {string} [opts.dataSheet=DEFAULT_DATA_SHEET]
   * @param {string} [opts.configExcelUrl=DEFAULT_CONFIG_EXCEL_URL]
   */

  function initPflichtzeitenTabellen(configSheet, configTableName, opts = {}) {
    const instance = createInstance(configSheet, configTableName, opts);
    instance.init();
    return instance;
  }

  global.initPflichtzeitenTabellen = initPflichtzeitenTabellen;
  global.PZTabellen = global.PZTabellen || {};
  global.PZTabellen.initPflichtzeitenTabellen = initPflichtzeitenTabellen;

  function createInstance(configSheet, configTableName, opts) {
    const state = {
      configSheet: String(configSheet || "").trim(),
      configTableName: String(configTableName || "").trim(),

      mountId: opts.mountId || "pflichtzeiten-root",
      statusId: opts.statusId || "pflichtzeiten-status",

      dataExcelUrl: opts.dataExcelUrl || DEFAULT_DATA_EXCEL_URL,
      dataSheet: opts.dataSheet || DEFAULT_DATA_SHEET,

      configExcelUrl: opts.configExcelUrl || DEFAULT_CONFIG_EXCEL_URL,

      configs: [],
      dataRows: [],
      mount: null,

      pagerWired: false,
      tableState: new Map(),
      infoState: new Map(),
      infoRangeState: new Map(),
    };

    async function init() {
      if (typeof XLSX === "undefined") {
        throw new Error("XLSX ist nicht geladen. Bitte XLSX CDN Script einbinden.");
      }

      state.mount = document.getElementById(state.mountId);
      if (!state.mount) return;

      const status = document.getElementById(state.statusId);
      if (status) status.textContent = "Lade Pflichtzeiten aus Excel …";

      try {
        await renderAllFromExcel();
      } catch (err) {
        console.error(err);
        if (status) status.textContent = "Fehler beim Laden/Verarbeiten der Excel-Dateien.";
      }
    }

    async function renderAllFromExcel() {
      const status = document.getElementById(state.statusId);
      if (status) status.textContent = "Lade Konfiguration …";

      if (!state.configSheet) throw new Error("configSheet fehlt.");
      if (!state.configTableName) throw new Error("configTableName fehlt.");

      const cfgWb = XLSX.read(await (await fetch(state.configExcelUrl, { cache: "no-store" })).arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      const wsCfg = cfgWb.Sheets[state.configSheet];
      if (!wsCfg) throw new Error(`Arbeitsblatt "${state.configSheet}" nicht gefunden.`);

      let cfgRows = readRowsFromNamedRange(cfgWb, wsCfg, state.configSheet, state.configTableName);

      if (!cfgRows) {
        cfgRows = XLSX.utils.sheet_to_json(wsCfg, { header: 1, raw: true, defval: "", blankrows: false });
      }

      const rowCfgs = parseConfigsFromRows(cfgRows);
      state.configs = mergeConfigsByTableName(rowCfgs);

      if (!state.configs.length) {
        if (status) status.textContent = "Keine Konfigurationen gefunden.";
        return;
      }

      if (status) status.textContent = "Lade Daten …";

      const dataWb = XLSX.read(await (await fetch(state.dataExcelUrl, { cache: "no-store" })).arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      const wsData = dataWb.Sheets[state.dataSheet];
      if (!wsData) throw new Error(`Arbeitsblatt "${state.dataSheet}" nicht gefunden.`);

      let rows = XLSX.utils.sheet_to_json(wsData, { header: 1, raw: true, defval: "", blankrows: false });
      rows = rows.filter((r) => Array.isArray(r) && r.some((v) => String(v ?? "").trim() !== ""));

      const g0 = normalizeGender(rows[0]?.[DATA_COLS.gender]);
      const d0 = String(rows[0]?.[DATA_COLS.excelDatum] ?? "").toLowerCase();
      const startIdx = g0.includes("gender") || g0.includes("geschlecht") || d0.includes("datum") ? 1 : 0;

      state.dataRows = rows.slice(startIdx);

      if (status) status.remove();

      state.mount.classList.add("pz-grid");
      renderTablesIntoMount();

      if (!state.pagerWired) {
        state.pagerWired = true;
        wirePagerAndToggles();
      }
    }

    function wirePagerAndToggles() {
      state.mount.addEventListener("click", (ev) => {
        const infoBtn = ev.target.closest("button[data-info]");
        if (infoBtn) {
          const tableId = infoBtn.dataset.info;
          const next = !state.infoState.get(tableId);
          state.infoState.set(tableId, next);

          infoBtn.setAttribute("aria-expanded", next ? "true" : "false");

          const block = infoBtn.closest(".pz-block");
          const infoBox = block?.querySelector(`.pz-info[data-table="${tableId}"]`);
          if (infoBox) setCollapsibleOpen(infoBox, next);
          return;
        }

        const rangeBtn = ev.target.closest("button[data-range]");
        if (rangeBtn) {
          const tableId = rangeBtn.dataset.table;
          const idx = Number(rangeBtn.dataset.idx);
          const key = `${tableId}|${idx}`;

          const next = !state.infoRangeState.get(key);
          state.infoRangeState.set(key, next);

          rangeBtn.setAttribute("aria-expanded", next ? "true" : "false");

          const targetId = rangeBtn.getAttribute("aria-controls");
          const rangeWrap = targetId ? document.getElementById(targetId) : null;
          if (rangeWrap) setCollapsibleOpen(rangeWrap, next);

          const infoBox = rangeBtn.closest(".pz-info");
          if (infoBox && infoBox.classList.contains("is-open")) {
            const infoInner = infoBox.querySelector(":scope > .pz-collapsible__inner");
            if (infoInner && infoInner.style.maxHeight !== "none") {
              infoInner.style.maxHeight = infoInner.scrollHeight + "px";
            }
          }
          return;
        }

        const btn = ev.target.closest("button[data-table]");
        if (!btn) return;

        const tableId = btn.dataset.table;
        const action = btn.dataset.action;
        const pageAttr = btn.dataset.page;

        const cfg = state.configs.find((x) => x.id === tableId);
        if (!cfg) return;

        const fullList = buildPeopleForConfigGroup(state.dataRows, cfg).sort(personSort);

        const pageSize = Math.max(1, Number(cfg.pageSize || 5));
        const maxPage = getMaxPage(fullList, pageSize);

        let page = state.tableState.get(tableId) || 1;

        if (action === "prev") page = clamp(page - 1, 1, maxPage);
        else if (action === "next") page = clamp(page + 1, 1, maxPage);
        else if (pageAttr) {
          const p = Number(pageAttr);
          if (Number.isFinite(p)) page = clamp(p, 1, maxPage);
        }

        state.tableState.set(tableId, page);
        renderTablesIntoMount();
      });
    }

    function renderTablesIntoMount() {
      if (!state.mount) return;

      state.mount.innerHTML = "";

      const pairs = pairConfigsByTitle(state.configs);

      for (const p of pairs) {
        if (p.w && p.m) {
          const listW = buildPeopleForConfigGroup(state.dataRows, p.w).sort(personSort);
          state.mount.appendChild(buildTableBlock(p.w, listW));

          const listM = buildPeopleForConfigGroup(state.dataRows, p.m).sort(personSort);
          state.mount.appendChild(buildTableBlock(p.m, listM));
          continue;
        }

        if (p.w) {
          const listW = buildPeopleForConfigGroup(state.dataRows, p.w).sort(personSort);
          const el = buildTableBlock(p.w, listW);
          el.classList.add("pz-block--span2");
          state.mount.appendChild(el);
          continue;
        }

        if (p.m) {
          const listM = buildPeopleForConfigGroup(state.dataRows, p.m).sort(personSort);
          const el = buildTableBlock(p.m, listM);
          el.classList.add("pz-block--span2");
          state.mount.appendChild(el);
          continue;
        }
      }

      if (!pairs.length) {
        const p = document.createElement("p");
        p.className = "pz-empty";
        p.textContent = "Keine Einträge.";
        state.mount.appendChild(p);
      }
    }

    function readRowsFromNamedRange(wb, ws, sheetName, tableName) {
      const names = wb?.Workbook?.Names;
      if (!Array.isArray(names) || !tableName) return null;

      const want = String(tableName).trim().toLowerCase();

      const hit =
        names.find((n) => String(n?.Name ?? "").trim().toLowerCase() === want) ||
        names.find((n) => String(n?.Name ?? "").trim().toLowerCase() === `_${want}`);

      const ref = String(hit?.Ref ?? "").trim();
      if (!ref) return null;

      const parsed = parseExcelRef(ref);
      if (!parsed) return null;

      if (parsed.sheet && normHeader(parsed.sheet) !== normHeader(sheetName)) return null;

      const range = parsed.range;
      if (!range) return null;

      return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: false, range });
    }

    function parseExcelRef(ref) {
      const s = String(ref).trim();

      const m1 = s.match(/^(?:'([^']+)'|([^!]+))!(.+)$/);
      if (m1) {
        const sheet = (m1[1] || m1[2] || "").trim();
        const range = (m1[3] || "").replace(/\$/g, "").trim();
        return { sheet, range };
      }

      if (/[A-Z]+\d+:[A-Z]+\d+/i.test(s)) {
        return { sheet: "", range: s.replace(/\$/g, "").trim() };
      }

      return null;
    }

    function parseConfigsFromRows(rows) {
      const headerIdx = findHeaderRowIndex(rows);
      if (headerIdx < 0) return [];

      const header = rows[headerIdx].map((x) => String(x ?? "").trim());
      const col = buildHeaderMap(header);

      const out = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !Array.isArray(r)) continue;

        const tableName = getCell(r, col, "Tabellen Name");
        const gender = normalizeGender(getCell(r, col, "Geschlecht"));
        if (!tableName || (gender !== "m" && gender !== "w")) continue;

        const minAge = parseIntSafe(getCell(r, col, "Mindest Alter"));
        const maxAge = parseIntSafe(getCell(r, col, "Maximales Alter"));

        const qualiStart = tryParseExcelDate(getCellRaw(r, col, "Qualizeitraum anfang"));
        const qualiEnd = tryParseExcelDate(getCellRaw(r, col, "Qualizeitraum Ende"));
        if (!qualiStart || !qualiEnd) continue;

        const lastActive = tryParseExcelDate(getCellRaw(r, col, "Letzter Wettkampf am"));

        const lv = String(getCell(r, col, "Landesverband") ?? "").trim().toUpperCase();
        const omsRaw = String(getCell(r, col, "OMS") ?? "").trim().toLowerCase();
        const omsFilter = omsRaw === "ja" || omsRaw === "true" || omsRaw === "1";

        const poolLength = String(getCell(r, col, "Pool-Länge") ?? "").trim();
        const rulebook = normalizeRulebook(getCell(r, col, "Regelwerk"));

        const pageSize = parseIntSafe(getCell(r, col, "Seiten Anzahl"));
        const seasonYear = qualiEnd.getFullYear();

        const pz1 = {};
        const pz2 = {};
        for (const d of DISCIPLINES) {
          const h1 = PZ_COLS.pz1[d.key];
          const h2 = PZ_COLS.pz2[d.key];
          const v1 = getCellRaw(r, col, h1);
          const v2 = getCellRaw(r, col, h2);
          pz1[d.key] = parseExcelTimeToCentiOrNull(v1);
          pz2[d.key] = parseExcelTimeToCentiOrNull(v2);
        }

        const id = `cfg-${out.length + 1}-${slug(String(tableName))}-${gender}`;

        out.push({
          id,
          title: String(tableName).trim(),
          gender,
          minAge: Number.isFinite(minAge) ? minAge : null,
          maxAge: Number.isFinite(maxAge) ? maxAge : null,
          qualiStart,
          qualiEnd,
          lastActive: lastActive || null,
          lv: lv || "",
          omsFilter,
          poolLength,
          rulebook,
          pageSize: Number.isFinite(pageSize) ? pageSize : 5,
          seasonYear,
          pz1,
          pz2,
        });
      }

      return out;
    }

    function mergeConfigsByTableName(cfgs) {
      const map = new Map();
      const out = [];

      for (const cfg of cfgs) {
        const title = String(cfg.title ?? "").trim();
        const gender = cfg.gender;
        if (!title || (gender !== "m" && gender !== "w")) continue;

        const key = `${normHeader(title)}|${gender}`;

        let g = map.get(key);
        if (!g) {
          g = {
            id: `tbl-${slug(title)}-${gender}`,
            title,
            gender,
            pageSize: Number.isFinite(Number(cfg.pageSize)) ? Number(cfg.pageSize) : 5,
            variants: [],
          };
          map.set(key, g);
          out.push(g);
        }

        g.variants.push(cfg);

        const ps = Number(cfg.pageSize);
        if (Number.isFinite(ps)) g.pageSize = Math.max(g.pageSize, ps);
      }

      return out;
    }

    function buildPeopleForConfigGroup(rows, cfgGroup) {
      const variants = Array.isArray(cfgGroup?.variants) && cfgGroup.variants.length ? cfgGroup.variants : [cfgGroup];
      const merged = new Map();

      for (const cfg of variants) {
        const list = buildPeopleForConfig(rows, cfg);

        for (const rec of list) {
          const key = `${rec.name}|${rec.gender}|${rec.birthYear}`;
          const prev = merged.get(key);

          if (!prev || isBetterRec(rec, prev)) merged.set(key, rec);
        }
      }

      return Array.from(merged.values());
    }

    function isBetterRec(a, b) {
      const a1 = a.pz1Count ?? 0,
        b1 = b.pz1Count ?? 0;
      if (a1 !== b1) return a1 > b1;

      const a2 = a.pz2Count ?? 0,
        b2 = b.pz2Count ?? 0;
      if (a2 !== b2) return a2 > b2;

      const ad = a.lastStartDate instanceof Date ? a.lastStartDate.getTime() : 0;
      const bd = b.lastStartDate instanceof Date ? b.lastStartDate.getTime() : 0;
      if (ad !== bd) return ad > bd;

      return false;
    }

    function pairConfigsByTitle(cfgs) {
      const order = [];
      const map = new Map();

      for (let i = 0; i < cfgs.length; i++) {
        const cfg = cfgs[i];
        const key = normHeader(cfg.title);

        let p = map.get(key);
        if (!p) {
          p = { key, order: i, w: null, m: null };
          map.set(key, p);
          order.push(p);
        }

        if (cfg.gender === "w") p.w = cfg;
        else if (cfg.gender === "m") p.m = cfg;
      }

      order.sort((a, b) => a.order - b.order);
      return order;
    }

    function findHeaderRowIndex(rows) {
      const needed = ["Tabellen Name", "Geschlecht", "Qualizeitraum anfang", "Qualizeitraum Ende"];
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const r = rows[i];
        if (!Array.isArray(r)) continue;
        const set = new Set(r.map((x) => normHeader(x)));
        if (needed.every((h) => set.has(normHeader(h)))) return i;
      }
      return -1;
    }

    function buildHeaderMap(headerRow) {
      const m = new Map();
      for (let i = 0; i < headerRow.length; i++) {
        const key = normHeader(headerRow[i]);
        if (key) m.set(key, i);
      }
      return m;
    }

    function getCell(row, map, headerName) {
      const idx = map.get(normHeader(headerName));
      if (idx === undefined) return "";
      return row[idx] ?? "";
    }

    function getCellRaw(row, map, headerName) {
      const idx = map.get(normHeader(headerName));
      if (idx === undefined) return null;
      return row[idx];
    }

    function normHeader(v) {
      return String(v ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    }

    function slug(s) {
      return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    }

    function buildPeopleForConfig(rows, cfg) {
      const dict = new Map();

      const qualiStart = cfg.qualiStart;
      const qualiEnd = cfg.qualiEnd;
      const endInc = endOfDay(qualiEnd);

      let rowIdx = -1;
      for (const row of rows) {
        rowIdx++;
        if (!row) continue;

        const lv = String(row[DATA_COLS.landesverband] ?? "").trim().toUpperCase();
        if (cfg.lv && lv !== cfg.lv) continue;

        const g = normalizeGender(row[DATA_COLS.gender]);
        if (g !== cfg.gender) continue;

        const nm = String(row[DATA_COLS.name] ?? "").trim();
        if (!nm) continue;

        const birthYear = normalizeBirthYear(String(row[DATA_COLS.yy2] ?? "").trim());
        if (!birthYear) continue;

        const wkDate = tryParseExcelDate(row[DATA_COLS.excelDatum]);
        if (!wkDate) continue;
        if (wkDate < qualiStart || wkDate > endInc) continue;

        const compName = String(row[DATA_COLS.meet_name] ?? "").trim();
        if (cfg.omsFilter && compName.toUpperCase().startsWith("OMS-")) continue;

        if (cfg.poolLength !== "") {
          const pl = normalizePoolLength(row[DATA_COLS.poollaenge]);
          if (pl !== Number(cfg.poolLength)) continue;
        }

        const rwRow = normalizeRulebook(row[DATA_COLS.regelwerk]);
        if (cfg.rulebook !== "") {
          const want = String(cfg.rulebook).trim().toLowerCase();
          if (rwRow !== want) continue;
        }

        const og = String(row[DATA_COLS.ortsgruppe] ?? "").trim();

        const key = `${nm}|${g}|${birthYear}`;
        const rec = dict.get(key) ?? initPersonRec({ name: nm, gender: g, ortsgruppe: "", birthYear });

        if (!rec.lastStartDate || wkDate > rec.lastStartDate) {
          rec.lastStartDate = wkDate;
          rec.lastStartComp = compName;
        }

        if (og) {
          if (rwRow === "national") {
            const newerNat =
              !rec.ogNatDate ||
              wkDate > rec.ogNatDate ||
              (wkDate.getTime() === rec.ogNatDate.getTime() && rowIdx > rec.ogNatRow);

            if (newerNat) {
              rec.ogNat = og;
              rec.ogNatDate = wkDate;
              rec.ogNatRow = rowIdx;
            }
          } else if (rwRow === "international") {
            if (!rec.ogNatDate) {
              const newerInt =
                !rec.ogIntDate ||
                wkDate > rec.ogIntDate ||
                (wkDate.getTime() === rec.ogIntDate.getTime() && rowIdx > rec.ogIntRow);

              if (newerInt) {
                rec.ogInt = og;
                rec.ogIntDate = wkDate;
                rec.ogIntRow = rowIdx;
              }
            }
          }

          rec.ortsgruppe = rec.ogNat || rec.ogInt || "";
        }

        for (let i = 0; i < DISCIPLINES.length; i++) {
          const colIdx = DISCIPLINES[i].dataCol;
          updateBest(rec, i, row[colIdx], compName);
        }

        dict.set(key, rec);
      }

      const people = [];
      for (const rec of dict.values()) {
        const age = cfg.seasonYear - rec.birthYear;
        if (cfg.minAge !== null && age < cfg.minAge) continue;
        if (cfg.maxAge !== null && age > cfg.maxAge) continue;

        if (cfg.lastActive) {
          if (!rec.lastStartDate || rec.lastStartDate.getTime() < cfg.lastActive.getTime()) continue;
        }

        const { pz1Count, pz2Count, qualifies } = computePZCountsFromConfig(rec, cfg);
        if (!qualifies) continue;

        rec.pz1Count = pz1Count;
        rec.pz2Count = pz2Count;
        rec._cfg = cfg;

        people.push(rec);
      }

      return people;
    }

    function buildTableBlock(cfg, fullList) {
      const wrap = document.createElement("section");
      wrap.className = "pz-block";
      wrap.dataset.tableid = cfg.id;

      const head = document.createElement("div");
      head.className = "pz-head";

      const h3 = document.createElement("h3");
      h3.className = "pz-title";
      h3.textContent = cfg.title;

      const infoBtn = document.createElement("button");
      infoBtn.type = "button";
      infoBtn.className = "pz-info-btn";
      infoBtn.dataset.info = cfg.id;

      const icon = document.createElement("img");
      icon.src = "./svg/icon_info.svg";
      icon.alt = "Info";
      icon.className = "pz-info-icon";
      icon.width = 18;
      icon.height = 18;

      infoBtn.appendChild(icon);
      infoBtn.title = "Pflichtzeiten anzeigen";
      infoBtn.setAttribute("aria-label", "Pflichtzeiten anzeigen");

      const infoId = `pz-info-${safeDomId(cfg.id)}`;
      infoBtn.setAttribute("aria-controls", infoId);

      const isInfoOpen = !!state.infoState.get(cfg.id);
      infoBtn.setAttribute("aria-expanded", isInfoOpen ? "true" : "false");

      head.appendChild(h3);
      head.appendChild(infoBtn);
      wrap.appendChild(head);

      const infoBox = buildPflichtzeitenInfoBox(cfg);
      infoBox.id = infoId;
      wrap.appendChild(infoBox);
      initCollapsible(infoBox, isInfoOpen);

      const table = document.createElement("table");
      table.className = "pz-table";

      const thead = document.createElement("thead");
      const trh = document.createElement("tr");

      const th1 = document.createElement("th");
      th1.textContent = "Name / Gliederung";

      const th2 = document.createElement("th");
      th2.textContent = "Status";
      th2.className = "pz-th-status";

      trh.appendChild(th1);
      trh.appendChild(th2);
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      const pageSize = Math.max(1, Number(cfg.pageSize || 5));
      const maxPage = getMaxPage(fullList, pageSize);
      const currentPage = clamp(state.tableState.get(cfg.id) || 1, 1, maxPage);
      state.tableState.set(cfg.id, currentPage);

      const start = (currentPage - 1) * pageSize;
      const list = fullList.slice(start, start + pageSize);

      if (list.length === 0) {
        const trEmpty = document.createElement("tr");
        const tdEmpty = document.createElement("td");
        tdEmpty.colSpan = 2;
        tdEmpty.className = "pz-empty";
        tdEmpty.textContent = "Keine Einträge.";
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
      } else {
        list.forEach((rec) => {
          const mainRow = document.createElement("tr");
          mainRow.className = "pz-row";
          mainRow.tabIndex = 0;
          mainRow.setAttribute("aria-expanded", "false");

          const tdLeft = document.createElement("td");
          const person = document.createElement("div");
          person.className = "pz-person";

          const cap = document.createElement("img");
          cap.className = "pz-cap";
          cap.alt = "";
          cap.loading = "lazy";
          cap.decoding = "async";
          cap.src = capSrcFromOrtsgruppe(rec.ortsgruppe);
          cap.addEventListener("error", () => {
            cap.src = "./svg/Cap-Baden_light.svg";
          });

          const text = document.createElement("div");
          text.className = "pz-person-text";

          const nameLine = document.createElement("div");
          nameLine.className = "pz-name";
          nameLine.textContent = `${rec.name} (${yearLabel2(rec.birthYear)})`;

          const ogLine = document.createElement("div");
          ogLine.className = "pz-og";
          ogLine.textContent = rec.ortsgruppe || "";

          text.appendChild(nameLine);
          text.appendChild(ogLine);

          person.appendChild(cap);
          person.appendChild(text);
          tdLeft.appendChild(person);

          const tdRight = document.createElement("td");
          tdRight.className = "pz-status";

          const dots = document.createElement("div");
          dots.className = "pz-dots";
          dots.setAttribute("aria-label", `Status: ${rec.pz1Count}x PZ1, ${rec.pz2Count}x PZ2`);

          const total = DISCIPLINES.length;
          const pz1 = Math.max(0, Math.min(rec.pz1Count || 0, total));
          const pz2 = Math.max(0, Math.min(rec.pz2Count || 0, total - pz1));

          for (let i = 0; i < total; i++) {
            const dot = document.createElement("span");
            dot.className = "pz-dot";
            if (i < pz1) dot.classList.add("is-pz1");
            else if (i < pz1 + pz2) dot.classList.add("is-pz2");
            else dot.classList.add("is-none");
            dots.appendChild(dot);
          }

          tdRight.appendChild(dots);

          mainRow.appendChild(tdLeft);
          mainRow.appendChild(tdRight);

          const detailRow = document.createElement("tr");
          if (rec.pz1Count > 0) {
            mainRow.classList.add("has-pz1");
            detailRow.classList.add("has-pz1");
          } else if (rec.pz2Count > 0) {
            mainRow.classList.add("has-pz2");
            detailRow.classList.add("has-pz2");
          }

          detailRow.className = "pz-detail";
          const detailTd = document.createElement("td");
          detailTd.colSpan = 2;

          const detailWrap = document.createElement("div");
          detailWrap.className = "pz-detail-wrap";

          const reached = [];
          for (let i = 0; i < DISCIPLINES.length; i++) {
            const best = rec.best[i];
            const level = disciplineLevelFromConfig(best, rec._cfg, DISCIPLINES[i].key);
            if (level === "PZ1" || level === "PZ2") reached.push({ i, level, best });
          }

          const prio = { PZ1: 0, PZ2: 1 };
          reached.sort((a, b) => {
            const pa = prio[a.level] ?? 9;
            const pb = prio[b.level] ?? 9;
            if (pa !== pb) return pa - pb;
            return a.i - b.i;
          });

          for (const item of reached) {
            const i = item.i;
            const best = item.best;
            const level = item.level;

            const line = document.createElement("div");
            line.className = "pz-detail-line";

            const left = document.createElement("div");
            left.className = "pz-detail-left";

            const disc = document.createElement("div");
            disc.className = "pz-detail-discipline";
            disc.textContent = DISCIPLINES[i].label;

            const meta = document.createElement("div");
            meta.className = "pz-detail-meta";
            meta.textContent = `${best.text}  |  ${best.comp || "—"}`;

            left.appendChild(disc);
            left.appendChild(meta);

            const right = document.createElement("div");
            right.className = "pz-detail-right";

            const badge = document.createElement("span");
            badge.className = "pz-badge";
            badge.textContent = level;
            badge.classList.add(level === "PZ1" ? "is-pz1" : "is-pz2");

            right.appendChild(badge);

            line.appendChild(left);
            line.appendChild(right);

            detailWrap.appendChild(line);
          }

          const detailInner = document.createElement("div");
          detailInner.className = "pz-detail-inner";
          detailInner.style.maxHeight = "0px";

          detailInner.appendChild(detailWrap);
          detailTd.appendChild(detailInner);
          detailRow.appendChild(detailTd);

          const toggle = () => {
            const detailInner = detailRow.querySelector(".pz-detail-inner");
            if (!detailInner) return;

            const isCurrentlyOpen = detailRow.classList.contains("is-open");

            if (!isCurrentlyOpen) {
              mainRow.classList.add("is-open");
              detailRow.classList.add("is-open");
              mainRow.setAttribute("aria-expanded", "true");

              detailInner.style.maxHeight = "0px";
              requestAnimationFrame(() => {
                detailInner.style.maxHeight = detailInner.scrollHeight + "px";
              });
            } else {
              mainRow.classList.remove("is-open");
              mainRow.setAttribute("aria-expanded", "false");

              detailInner.style.maxHeight = detailInner.scrollHeight + "px";
              requestAnimationFrame(() => {
                detailInner.style.maxHeight = "0px";
              });

              const onEnd = (e) => {
                if (e.propertyName !== "max-height") return;
                detailRow.classList.remove("is-open");
                detailInner.removeEventListener("transitionend", onEnd);
              };
              detailInner.addEventListener("transitionend", onEnd);
            }
          };

          mainRow.addEventListener("click", toggle);
          mainRow.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          });

          tbody.appendChild(mainRow);
          tbody.appendChild(detailRow);
        });
      }

      table.appendChild(tbody);
      wrap.appendChild(table);
      wrap.appendChild(renderPager(cfg.id, currentPage, maxPage));

      return wrap;
    }

    function renderPager(tableId, page, maxPage) {
      const nav = document.createElement("div");
      nav.className = "pz-pager";
      nav.setAttribute("role", "navigation");
      nav.setAttribute("aria-label", `Seitenwahl ${tableId}`);

      if (maxPage <= 1) return nav;

      const group = document.createElement("div");
      group.className = "pz-pager__group";

      const mkBtn = (txt, opts = {}) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pz-pager__btn" + (opts.active ? " is-active" : "");
        b.textContent = txt;
        b.dataset.table = tableId;

        if (opts.action) b.dataset.action = opts.action;
        if (opts.page) b.dataset.page = String(opts.page);
        if (opts.disabled) b.disabled = true;
        if (opts.ariaCurrent) b.setAttribute("aria-current", "page");
        if (opts.ariaLabel) b.setAttribute("aria-label", opts.ariaLabel);

        return b;
      };

      group.appendChild(mkBtn("‹", { action: "prev", disabled: page <= 1, ariaLabel: "Vorherige Seite" }));

      const items = getPagerItems(page, maxPage);
      for (const it of items) {
        if (it.type === "dots") {
          const sp = document.createElement("span");
          sp.className = "pz-pager__ellipsis";
          sp.textContent = "…";
          group.appendChild(sp);
          continue;
        }
        const isActive = it.page === page;
        group.appendChild(mkBtn(String(it.page), { page: it.page, active: isActive, ariaCurrent: isActive }));
      }

      group.appendChild(mkBtn("›", { action: "next", disabled: page >= maxPage, ariaLabel: "Nächste Seite" }));

      nav.appendChild(group);
      return nav;
    }

    function getMaxPage(list, pageSize) {
      const n = Array.isArray(list) ? list.length : 0;
      return Math.max(1, Math.ceil(n / pageSize));
    }

    function getPagerItems(current, max) {
      if (max <= 7) return Array.from({ length: max }, (_, i) => ({ type: "page", page: i + 1 }));
      const items = [];
      const addPage = (p) => items.push({ type: "page", page: p });
      const addDots = () => items.push({ type: "dots" });

      addPage(1);

      let start = Math.max(2, current - 1);
      let end = Math.min(max - 1, current + 1);

      if (current <= 3) {
        start = 2;
        end = 4;
      }

      if (current >= max - 2) {
        start = max - 3;
        end = max - 1;
      }

      if (start > 2) addDots();
      for (let p = start; p <= end; p++) addPage(p);
      if (end < max - 1) addDots();

      addPage(max);
      return items;
    }

    function clamp(n, min, max) {
      return Math.min(max, Math.max(min, n));
    }

    function personSort(a, b) {
      if ((b.pz1Count ?? 0) !== (a.pz1Count ?? 0)) return (b.pz1Count ?? 0) - (a.pz1Count ?? 0);
      if ((b.pz2Count ?? 0) !== (a.pz2Count ?? 0)) return (b.pz2Count ?? 0) - (a.pz2Count ?? 0);

      const nameCmp = (a.name || "").localeCompare(b.name || "", "de");
      if (nameCmp !== 0) return nameCmp;
      return (a.ortsgruppe || "").localeCompare(b.ortsgruppe || "", "de");
    }

    function initPersonRec({ name, gender, ortsgruppe, birthYear }) {
      return {
        name,
        gender,
        ortsgruppe,
        birthYear,
        ogNat: "",
        ogNatDate: null,
        ogNatRow: -1,
        ogInt: "",
        ogIntDate: null,
        ogIntRow: -1,
        pz1Count: 0,
        pz2Count: 0,
        _cfg: null,
        lastStartDate: null,
        lastStartComp: "",
        best: Array.from({ length: DISCIPLINES.length }, () => ({
          centi: 99999999,
          text: "",
          comp: "",
        })),
      };
    }

    function updateBest(rec, dIdx, timeVal, compName) {
      const t = String(timeVal ?? "").trim();
      if (!t) return;

      const centi = timeTextToCenti(t);
      if (centi <= 0) return;

      if (centi < rec.best[dIdx].centi) {
        rec.best[dIdx] = { centi, text: t, comp: compName || "" };
      }
    }

    function computePZCountsFromConfig(rec, cfg) {
      let pz1Count = 0;
      let pz2Count = 0;
      let qualifies = false;

      for (let i = 0; i < DISCIPLINES.length; i++) {
        const dKey = DISCIPLINES[i].key;
        const best = rec.best[i];
        if (!(best.centi < 99999999)) continue;

        const t1 = cfg.pz1?.[dKey];
        const t2 = cfg.pz2?.[dKey];

        if (!Number.isFinite(t2)) continue;

        if (Number.isFinite(t1) && best.centi <= t1) {
          pz1Count += 1;
          qualifies = true;
        } else if (best.centi <= t2) {
          pz2Count += 1;
          qualifies = true;
        }
      }

      return { pz1Count, pz2Count, qualifies };
    }

    function disciplineLevelFromConfig(best, cfg, dKey) {
      if (!cfg || !best || !(best.centi < 99999999)) return "—";

      const t1 = cfg.pz1?.[dKey];
      const t2 = cfg.pz2?.[dKey];

      if (!Number.isFinite(t2)) return "—";
      if (Number.isFinite(t1) && best.centi <= t1) return "PZ1";
      if (best.centi <= t2) return "PZ2";
      return "—";
    }

    function capSrcFromOrtsgruppe(ortsgruppe) {
      const og = String(ortsgruppe ?? "").trim();
      if (!og) return "./svg/Cap-Baden_light.svg";
      const safe = og.replace(/[\/\\]/g, "-");
      return `./svg/Cap-${encodeURIComponent(safe)}.svg`;
    }

    function normalizePoolLength(v) {
      const s = String(v ?? "").trim().toLowerCase();
      if (!s) return null;

      const m = s.match(/(25|50)/);
      if (m) return Number(m[1]);

      if (typeof v === "number" && (v === 25 || v === 50)) return v;
      return null;
    }

    function normalizeRulebook(v) {
      const s = String(v ?? "").trim().toLowerCase();
      if (!s) return "";
      if (s === "national") return "national";
      if (s === "international") return "international";
      if (s.startsWith("nat")) return "national";
      if (s.startsWith("inter")) return "international";
      return "";
    }

    function normalizeGender(v) {
      const s = String(v ?? "").trim().toLowerCase();
      if (!s) return "";
      if (s === "m" || s.startsWith("m")) return "m";
      if (s === "w" || s.startsWith("w")) return "w";
      return "";
    }

    function parseIntSafe(v) {
      const s = String(v ?? "").trim();
      if (!s) return NaN;
      const n = Number(s);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    }

    function normalizeBirthYear(yTxt) {
      const s = String(yTxt ?? "").trim();
      if (!s) return 0;
      if (!/^\d+$/.test(s)) return 0;

      const y = Number(s);
      if (y >= 1900 && y <= 2099) return y;

      if (y >= 0 && y <= 99) {
        const yyNow = new Date().getFullYear() % 100;
        return y <= yyNow ? 2000 + y : 1900 + y;
      }
      return 0;
    }

    function tryParseExcelDate(v) {
      if (v === null || v === undefined || v === "") return null;
      if (v instanceof Date && !isNaN(v.getTime())) return v;

      if (typeof v === "number" && isFinite(v) && v > 1) {
        const ms = Date.UTC(1899, 11, 30) + Math.round(v) * 86400 * 1000;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }

      const s = String(v).trim();
      if (!s) return null;

      const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (m) {
        const dd = Number(m[1]);
        const mm = Number(m[2]) - 1;
        const yyyy = Number(m[3]);
        const d = new Date(yyyy, mm, dd);
        return isNaN(d.getTime()) ? null : d;
      }

      const d2 = new Date(s);
      return isNaN(d2.getTime()) ? null : d2;
    }

    function endOfDay(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }

    function parseExcelTimeToCentiOrNull(v) {
      if (v === null || v === undefined || v === "") return null;

      if (v instanceof Date && !isNaN(v.getTime())) {
        const h = v.getHours();
        const m = v.getMinutes();
        const s = v.getSeconds();
        const ms = v.getMilliseconds();
        return (h * 3600 + m * 60 + s) * 100 + Math.round(ms / 10);
      }

      if (typeof v === "number" && Number.isFinite(v)) {
        const frac = ((v % 1) + 1) % 1;
        return Math.round(frac * 86400 * 100);
      }

      const s = String(v).trim();
      if (!s) return null;
      const c = timeTextToCenti(s);
      return c > 0 ? c : null;
    }

    function timeTextToCenti(s) {
      try {
        let t = String(s ?? "").trim();
        if (!t) return -1;

        t = t.replace(".", ",");
        const parts = t.split(":");
        if (parts.length !== 2) return -1;

        const mm = Number(parts[0]);
        if (!Number.isFinite(mm)) return -1;

        const secParts = parts[1].split(",");
        const ss = Number(secParts[0]);
        if (!Number.isFinite(ss)) return -1;

        let cc = 0;
        if (secParts.length >= 2) {
          let cctxt = String(secParts[1]);
          if (cctxt.length === 1) cctxt = cctxt + "0";
          if (cctxt.length > 2) cctxt = cctxt.slice(0, 2);
          cc = Number(cctxt);
          if (!Number.isFinite(cc)) cc = 0;
        }

        return (mm * 60 + ss) * 100 + cc;
      } catch {
        return -1;
      }
    }

    function pad2(n) {
      return String(n).padStart(2, "0");
    }

    function yearLabel2(birthYear) {
      return String(birthYear % 100).padStart(2, "0");
    }

    function buildPflichtzeitenInfoBox(cfgGroup) {
      const box = document.createElement("div");
      box.className = "pz-info pz-collapsible";
      box.dataset.table = cfgGroup.id;

      const inner = document.createElement("div");
      inner.className = "pz-collapsible__inner pz-info__inner";
      box.appendChild(inner);

      const variants = Array.isArray(cfgGroup?.variants) && cfgGroup.variants.length ? cfgGroup.variants : [cfgGroup];

      const sorted = variants.slice().sort((a, b) => {
        const ra = calcBirthYearRange(a);
        const rb = calcBirthYearRange(b);
        if (ra.low !== rb.low) return ra.low - rb.low;
        return ra.high - rb.high;
      });

      const multi = sorted.length > 1;

      sorted.forEach((v, idx) => {
        const sec = document.createElement("section");
        sec.className = "pz-info-sec";

        const range = calcBirthYearRange(v);
        const label = rangeLabel(range);

        const showPZ2 = variantNeedsPZ2(v);
        const rangeInnerId = `pz-range-${safeDomId(cfgGroup.id)}-${idx}`;

        if (multi) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "pz-range-toggle";

          const txtWrap = document.createElement("span");
          txtWrap.className = "pz-range-toggle__text";

          const top = document.createElement("span");
          top.className = "pz-range-title";
          top.textContent = `Pflichtzeiten: (${cfgGroup.gender}) ${label}`;

          const meta = document.createElement("span");
          meta.className = "pz-info-meta";
          meta.textContent = buildQualiMetaText(v);

          txtWrap.appendChild(top);
          txtWrap.appendChild(meta);
          btn.appendChild(txtWrap);

          btn.dataset.range = "1";
          btn.dataset.table = cfgGroup.id;
          btn.dataset.idx = String(idx);
          btn.setAttribute("aria-controls", rangeInnerId);

          const key = `${cfgGroup.id}|${idx}`;
          const isOpen = !!state.infoRangeState.get(key);
          btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

          sec.appendChild(btn);

          const rangeWrap = document.createElement("div");
          rangeWrap.className = "pz-range pz-collapsible";
          rangeWrap.id = rangeInnerId;

          const rInner = document.createElement("div");
          rInner.className = "pz-collapsible__inner pz-range__inner";
          rInner.appendChild(buildPflichtzeitenTable(v, showPZ2));
          rangeWrap.appendChild(rInner);

          sec.appendChild(rangeWrap);

          initCollapsible(rangeWrap, isOpen);
        } else {
          const title = document.createElement("div");
          title.className = "pz-info-range";
          title.textContent = `Pflichtzeiten: (${cfgGroup.gender}) ${label}`;
          sec.appendChild(title);

          const meta = document.createElement("div");
          meta.className = "pz-info-meta";
          meta.textContent = buildQualiMetaText(v);
          sec.appendChild(meta);

          sec.appendChild(buildPflichtzeitenTable(v, showPZ2));
        }

        inner.appendChild(sec);
      });

      initCollapsible(box, false);
      return box;
    }

    function buildPflichtzeitenTable(cfg, showPZ2) {
      const table = document.createElement("table");
      table.className = "pz-info-table";

      const thead = document.createElement("thead");
      const trh = document.createElement("tr");

      const thDisc = document.createElement("th");
      thDisc.textContent = "Disziplin";
      trh.appendChild(thDisc);

      const th1 = document.createElement("th");
      th1.textContent = "PZ1";
      trh.appendChild(th1);

      if (showPZ2) {
        const th2 = document.createElement("th");
        th2.textContent = "PZ2";
        trh.appendChild(th2);
      }

      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      for (const d of DISCIPLINES) {
        const tr = document.createElement("tr");

        const tdDisc = document.createElement("td");
        tdDisc.textContent = d.label;
        tr.appendChild(tdDisc);

        const t1 = cfg.pz1?.[d.key];
        const t2 = cfg.pz2?.[d.key];

        if (!showPZ2) {
          const val = Number.isFinite(t1) ? t1 : t2;
          const td1 = document.createElement("td");
          td1.textContent = centiToTimeText(val);
          tr.appendChild(td1);
        } else {
          const td1 = document.createElement("td");
          td1.textContent = centiToTimeText(t1);
          tr.appendChild(td1);

          const td2 = document.createElement("td");
          td2.textContent = centiToTimeText(t2);
          tr.appendChild(td2);
        }

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      return table;
    }

    function calcBirthYearRange(cfg) {
      const seasonYear = Number(cfg?.seasonYear);
      const minAge = Number.isFinite(cfg?.minAge) ? cfg.minAge : null;
      const maxAge = Number.isFinite(cfg?.maxAge) ? cfg.maxAge : null;

      if (!Number.isFinite(seasonYear) || minAge === null || maxAge === null) {
        return { low: 0, high: 0, valid: false };
      }

      const high = seasonYear - minAge;
      const low = seasonYear - maxAge;

      return { low, high, valid: true };
    }

    function rangeLabel(r) {
      if (!r?.valid) return "—";
      if (r.low === r.high) return String(r.low);
      return `${r.low}-${r.high}`;
    }

    function variantNeedsPZ2(cfg) {
      for (const d of DISCIPLINES) {
        const t1 = cfg.pz1?.[d.key];
        const t2 = cfg.pz2?.[d.key];
        if (Number.isFinite(t1) && Number.isFinite(t2) && t1 !== t2) return true;
      }
      return false;
    }

    function centiToTimeText(centi) {
      if (!Number.isFinite(centi)) return "—";
      const c = Math.max(0, Math.trunc(centi));
      const totalSec = Math.floor(c / 100);
      const cc = c % 100;
      const mm = Math.floor(totalSec / 60);
      const ss = totalSec % 60;
      return `${mm}:${pad2(ss)},${pad2(cc)}`;
    }

  function safeDomId(s) {
    return String(s ?? "").replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function initCollapsible(wrap, open) {
    const inner = wrap?.querySelector(":scope > .pz-collapsible__inner");
    if (!inner) return;

    if (open) {
      wrap.classList.add("is-open");
      inner.style.maxHeight = "none";
      inner.style.opacity = "1";
    } else {
      wrap.classList.remove("is-open");
      inner.style.maxHeight = "0px";
      inner.style.opacity = "0";
    }
  }

  function setCollapsibleOpen(wrap, open) {
    const inner = wrap?.querySelector(":scope > .pz-collapsible__inner");
    if (!inner) return;

    if (open) {
      wrap.classList.add("is-open");
      inner.style.maxHeight = "0px";
      inner.style.opacity = "0";

      requestAnimationFrame(() => {
        inner.style.maxHeight = inner.scrollHeight + "px";
        inner.style.opacity = "1";
      });

      const onEnd = (e) => {
        if (e.propertyName !== "max-height") return;
        inner.style.maxHeight = "none";
        inner.removeEventListener("transitionend", onEnd);
      };
      inner.addEventListener("transitionend", onEnd);
    } else {
      inner.style.maxHeight = inner.scrollHeight + "px";
      inner.style.opacity = "1";

      requestAnimationFrame(() => {
        inner.style.maxHeight = "0px";
        inner.style.opacity = "0";
      });

      const onEnd = (e) => {
        if (e.propertyName !== "max-height") return;
        wrap.classList.remove("is-open");
        inner.removeEventListener("transitionend", onEnd);
      };
      inner.addEventListener("transitionend", onEnd);
    }
  }

  function fmtDateDE(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  function buildQualiMetaText(cfg) {
    const a = fmtDateDE(cfg?.qualiStart);
    const b = fmtDateDE(cfg?.qualiEnd);

    const plRaw = String(cfg?.poolLength ?? "").trim();
    let pl = "25m/50m";
    if (plRaw === "25") pl = "25m";
    else if (plRaw === "50") pl = "50m";

    const rw = String(cfg?.rulebook ?? "").trim();

    if (rw) return `${a}-${b}  |  ${pl}  |  ${rw}`;
    return `${a}-${b}  |  ${pl}`;
  }

  global.PZTabellen = global.PZTabellen || {};
  global.PZTabellen.safeDomId = safeDomId;
  global.PZTabellen.initCollapsible = initCollapsible;
  global.PZTabellen.setCollapsibleOpen = setCollapsibleOpen;
  global.PZTabellen.fmtDateDE = fmtDateDE;
  global.PZTabellen.buildQualiMetaText = buildQualiMetaText;

    return {
      init,
    };
  }

})(typeof window !== "undefined" ? window : globalThis);
