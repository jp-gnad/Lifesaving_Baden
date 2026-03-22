(function () {
  const COLS = {
    ortsgruppe: 12,
    lvState: 13,
    bvNatio: 27
  };

  const STATE_MAP = {
    BA: "Baden",
    BAY: "Bayern",
    BY: "Bayern",
    BB: "Brandenburg",
    BE: "Berlin",
    HB: "Bremen",
    HH: "Hamburg",
    HE: "Hessen",
    MV: "Mecklenburg-Vorpommern",
    NI: "Niedersachsen",
    RP: "Rheinland-Pfalz",
    SL: "Saarland",
    SN: "Sachsen",
    ST: "Sachsen-Anhalt",
    SH: "Schleswig-Holstein",
    TH: "Thüringen",
    WU: "Württemberg",
    WUE: "Württemberg",
    "WÜ": "Württemberg",
    NR: "Nordrhein",
    NRH: "Nordrhein",
    NO: "Nordrhein",
    NW: "Nordrhein",
    WF: "Westfalen",
    WE: "Westfalen",
    WL: "Westfalen",
    NRW: "Nordrhein-Westfalen"
  };

  const BV_MAP = {
    GER: "Deutschland",
    DEU: "Deutschland"
  };

  const State = {
    groupsBySource: new Map()
  };

  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  const normalizeForSearch = (value) =>
    normalize(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[-/]+/g, " ")
      .replace(/ß/g, "ss");

  const slugify = (value) =>
    normalizeForSearch(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x";

  function kindLabel(kind) {
    if (kind === "og") return "Ortsgruppe";
    if (kind === "lv") return "Landesverband";
    if (kind === "bv") return "Bundesverband";
    return "Gliederung";
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

  function isHeaderRow(row) {
    const joined = [
      normalizeForSearch(row?.[COLS.ortsgruppe]),
      normalizeForSearch(row?.[COLS.lvState]),
      normalizeForSearch(row?.[COLS.bvNatio])
    ].join(" ");

    return joined.includes("orts") || joined.includes("lv") || joined.includes("bund") || joined.includes("natio");
  }

  function mapOrtsgruppe(raw) {
    const trimmed = normalize(raw).replace(/^og\s+/i, "");
    if (!trimmed) return "";

    const folded = normalizeForSearch(trimmed);
    if (folded === normalizeForSearch("Ettlingen") || folded === normalizeForSearch("Wettersbach")) {
      return "Ettlingen/Wettersbach";
    }

    return trimmed;
  }

  function normalizeLV(raw) {
    const value = normalize(raw);
    if (!value) return { code: "", name: "" };

    const code = value
      .toUpperCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "");

    if (STATE_MAP[code]) {
      return { code, name: STATE_MAP[code] };
    }

    const byName = Object.entries(STATE_MAP).find(([, name]) => normalizeForSearch(name) === normalizeForSearch(value));
    if (byName) {
      return { code: byName[0], name: byName[1] };
    }

    return { code, name: value };
  }

  function normalizeBV(raw) {
    const value = normalize(raw);
    if (!value) return { code: "", name: "" };

    const code = value.toUpperCase().replace(/\s+/g, "");
    if (BV_MAP[code]) {
      return { code, name: BV_MAP[code] };
    }

    const byName = Object.entries(BV_MAP).find(([, name]) => normalizeForSearch(name) === normalizeForSearch(value));
    if (byName) {
      return { code: byName[0], name: byName[1] };
    }

    return { code, name: value };
  }

  function pushUnique(list, value) {
    const normalizedValue = normalize(value);
    if (!normalizedValue || list.includes(normalizedValue)) return;
    list.push(normalizedValue);
  }

  function buildCapKeyVariants(raw) {
    const value = normalize(raw);
    if (!value) return [];

    const out = [];
    const ascii = value
      .replace(/ä/gi, "ae")
      .replace(/ö/gi, "oe")
      .replace(/ü/gi, "ue")
      .replace(/ß/g, "ss");

    pushUnique(out, value);
    pushUnique(out, ascii);
    pushUnique(out, value.replace(/[\/\\]/g, ""));
    pushUnique(out, ascii.replace(/[\/\\]/g, ""));
    pushUnique(out, value.replace(/[\/\\]/g, "-"));
    pushUnique(out, ascii.replace(/[\/\\]/g, "-"));
    pushUnique(out, value.replace(/\s+/g, ""));
    pushUnique(out, ascii.replace(/\s+/g, ""));

    return out;
  }

  function makeSearchKeys(parts) {
    const out = [];
    for (const part of parts || []) {
      pushUnique(out, part);
    }
    return out;
  }

  function createGroupId(kind, name) {
    return `group_${kind}_${slugify(name)}`;
  }

  function createGroupRecord({ kind, name, subtitle, searchKeys, parentName = "", parentCode = "" }) {
    return {
      id: createGroupId(kind, name),
      kind,
      name,
      label: kindLabel(kind),
      subtitle,
      parentName: normalize(parentName),
      parentCode: normalize(parentCode),
      searchKeys: makeSearchKeys([name, ...(searchKeys || [])])
    };
  }

  function createSingleAvatar(iconKeys) {
    return {
      mode: "single",
      iconKeys: makeSearchKeys(iconKeys)
    };
  }

  function createDualAvatar(leftKeys, rightKeys) {
    return {
      mode: "dual",
      leftKeys: makeSearchKeys(leftKeys),
      rightKeys: makeSearchKeys(rightKeys)
    };
  }

  function createFlipAvatar(frontKeys, backKeys) {
    return {
      mode: "flip",
      frontKeys: makeSearchKeys(frontKeys),
      backKeys: makeSearchKeys(backKeys)
    };
  }

  function buildGroupsFromRows(rows) {
    const ogMap = new Map();
    const lvMap = new Map();
    const bvMap = new Map();

    const startIndex = rows.length && isHeaderRow(rows[0]) ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i] || [];

      const ogName = mapOrtsgruppe(row[COLS.ortsgruppe]);
      const lv = normalizeLV(row[COLS.lvState]);
      const bv = normalizeBV(row[COLS.bvNatio]);

      if (ogName) {
        if (!ogMap.has(ogName)) {
          ogMap.set(ogName, {
            lvNames: new Set(),
            lvCodes: new Set(),
            bvNames: new Set(),
            bvCodes: new Set(),
            rawNames: new Set()
          });
        }

        const ogEntry = ogMap.get(ogName);
        ogEntry.rawNames.add(normalize(row[COLS.ortsgruppe]));
        if (ogName === "Ettlingen/Wettersbach") {
          ogEntry.rawNames.add("Ettlingen");
          ogEntry.rawNames.add("Wettersbach");
        }
        if (lv.name) ogEntry.lvNames.add(lv.name);
        if (lv.code) ogEntry.lvCodes.add(lv.code);
        if (bv.name) ogEntry.bvNames.add(bv.name);
        if (bv.code) ogEntry.bvCodes.add(bv.code);
      }

      if (lv.name) {
        if (!lvMap.has(lv.name)) {
          lvMap.set(lv.name, {
            codes: new Set(),
            bvNames: new Set(),
            bvCodes: new Set(),
            count: 0
          });
        }

        const lvEntry = lvMap.get(lv.name);
        lvEntry.count += 1;
        if (lv.code) lvEntry.codes.add(lv.code);
        if (bv.name) lvEntry.bvNames.add(bv.name);
        if (bv.code) lvEntry.bvCodes.add(bv.code);
      }

      if (bv.name) {
        if (!bvMap.has(bv.name)) {
          bvMap.set(bv.name, { codes: new Set() });
        }

        if (bv.code) {
          bvMap.get(bv.name).codes.add(bv.code);
        }
      }
    }

    const hasBaden = lvMap.has("Baden");
    const hasWuerttemberg = lvMap.has("Württemberg");
    const hasNordrhein = lvMap.has("Nordrhein");
    const hasWestfalen = lvMap.has("Westfalen");

    if ((hasBaden || hasWuerttemberg) && !lvMap.has("Baden-Württemberg")) {
      lvMap.set("Baden-Württemberg", {
        codes: new Set(["BW"]),
        bvNames: new Set(["Deutschland"]),
        bvCodes: new Set(["GER"]),
        count: (lvMap.get("Baden")?.count || 0) + (lvMap.get("Württemberg")?.count || 0)
      });
    }

    if ((hasNordrhein || hasWestfalen) && !lvMap.has("Nordrhein-Westfalen")) {
      lvMap.set("Nordrhein-Westfalen", {
        codes: new Set(["NRW"]),
        bvNames: new Set(["Deutschland"]),
        bvCodes: new Set(["GER"]),
        count: (lvMap.get("Nordrhein")?.count || 0) + (lvMap.get("Westfalen")?.count || 0)
      });
    }

    const groups = [];

    for (const [name, entry] of ogMap.entries()) {
      const lvName = Array.from(entry.lvNames)[0] || "";
      const lvCode = Array.from(entry.lvCodes)[0] || "";
      const bvName = Array.from(entry.bvNames)[0] || "";
      const bvCode = Array.from(entry.bvCodes)[0] || "";

      const avatar =
        name === "Ettlingen/Wettersbach"
          ? createFlipAvatar(["Ettlingen"], ["Wettersbach"])
          : createSingleAvatar([
              ...buildCapKeyVariants(name),
              ...buildCapKeyVariants(lvName),
              ...buildCapKeyVariants(lvCode),
              ...buildCapKeyVariants(bvCode),
              ...buildCapKeyVariants(bvName)
            ]);

      groups.push({
        ...createGroupRecord({
          kind: "og",
          name,
          subtitle: lvName ? `Ortsgruppe · ${lvName}` : "Ortsgruppe",
          parentName: lvName || bvName,
          parentCode: lvCode || bvCode,
          searchKeys: [...entry.rawNames]
        }),
        avatar
      });
    }

    for (const [name, entry] of lvMap.entries()) {
      const code = Array.from(entry.codes)[0] || "";
      const bvName = Array.from(entry.bvNames)[0] || "Deutschland";
      const bvCode = Array.from(entry.bvCodes)[0] || "GER";

      const avatar =
        name === "Baden-Württemberg"
          ? createDualAvatar(["BA", "Baden"], ["WÜ", "WU", "WUE", "Württemberg"])
          : name === "Nordrhein-Westfalen"
          ? createDualAvatar(["NR", "NW", "NO", "NRH", "Nordrhein"], ["WF", "WL", "WE", "Westfalen"])
          : createSingleAvatar([
              ...buildCapKeyVariants(name),
              ...buildCapKeyVariants(code),
              ...buildCapKeyVariants(bvCode),
              ...buildCapKeyVariants(bvName)
            ]);

      groups.push({
        ...createGroupRecord({
          kind: "lv",
          name,
          subtitle: bvName ? `Landesverband · ${bvName}` : "Landesverband",
          parentName: bvName,
          parentCode: bvCode,
          searchKeys: [code]
        }),
        avatar
      });
    }

    for (const [name, entry] of bvMap.entries()) {
      const code = Array.from(entry.codes)[0] || "GER";
      const avatar = createSingleAvatar([...buildCapKeyVariants(code), ...buildCapKeyVariants(name)]);

      groups.push({
        ...createGroupRecord({
          kind: "bv",
          name,
          subtitle: "Bundesverband",
          searchKeys: [code]
        }),
        avatar
      });
    }

    groups.sort((left, right) => {
      const nameCompare = left.name.localeCompare(right.name, "de", { sensitivity: "base" });
      if (nameCompare !== 0) return nameCompare;
      return left.label.localeCompare(right.label, "de", { sensitivity: "base" });
    });

    return {
      groups,
      stats: {
        ortsgruppen: groups.filter((group) => group.kind === "og").length,
        landesverbaende: groups.filter((group) => group.kind === "lv").length,
        bundesverbaende: groups.filter((group) => group.kind === "bv").length
      }
    };
  }

  async function loadGroupsAndStats(options = {}) {
    const loader = getExcelLoader();
    const sheetName = typeof options.sheetName === "string" ? options.sheetName : "Tabelle2";
    const excelUrl = typeof options.excelUrl === "string" && options.excelUrl.trim() ? options.excelUrl : "";
    const sourceKey = excelUrl || loader.getUrlCandidates("athleteData").join("||") || "athleteData";
    const cacheKey = `${sheetName}::${sourceKey}`;

    if (!State.groupsBySource.has(cacheKey)) {
      State.groupsBySource.set(
        cacheKey,
        (async () => {
          const rows = await loadWorkbookArray(sheetName, excelUrl);
          return buildGroupsFromRows(rows);
        })().catch(error => {
          State.groupsBySource.delete(cacheKey);
          throw error;
        })
      );
    }

    return State.groupsBySource.get(cacheKey);
  }

  function findGroupById(groups, id) {
    const target = normalize(id);
    if (!target) return null;
    return (Array.isArray(groups) ? groups : []).find((group) => String(group.id) === target) || null;
  }

  const api = {
    loadWorkbookArray,
    loadGroupsAndStats,
    findGroupById,
    kindLabel,
    normalizeOrtsgruppeName: mapOrtsgruppe
  };

  window.ClubsData = api;
  window.RekordeData = api;
})();
