(function () {
  "use strict";

  const XLSX_CDN_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

  const URLS = {
    athleteData: "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx",
    recordsCriteria:
      window.location.protocol === "file:"
        ? "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx"
        : "./utilities/records_kriterien.xlsx"
  };

  let xlsxPromise = null;
  const workbookCache = new Map();

  function normalizeUrl(excelUrl) {
    return encodeURI(String(excelUrl || "").trim());
  }

  function getUrl(urlKey) {
    return URLS[String(urlKey || "").trim()] || "";
  }

  function getFetchOptions(url) {
    return /^https?:\/\//i.test(String(url || "").trim()) ? { mode: "cors" } : {};
  }

  function ensureXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);

    if (!xlsxPromise) {
      xlsxPromise = new Promise((resolve, reject) => {
        const existing = Array.from(document.scripts).find(
          (script) => script.src && script.src.includes("xlsx.full.min.js")
        );

        if (existing) {
          existing.addEventListener("load", () => resolve(window.XLSX), { once: true });
          existing.addEventListener("error", reject, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = XLSX_CDN_URL;
        script.onload = () => resolve(window.XLSX);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    return xlsxPromise;
  }

  async function getWorkbook(options = {}) {
    const explicitUrl =
      typeof options === "string"
        ? options
        : typeof options.excelUrl === "string"
        ? options.excelUrl
        : "";
    const urlKey =
      typeof options === "object" && options && typeof options.urlKey === "string"
        ? options.urlKey
        : "";
    const excelUrl = explicitUrl || getUrl(urlKey);
    const cacheKey = normalizeUrl(excelUrl);

    if (!cacheKey) {
      throw new Error("Excel URL missing");
    }

    if (!workbookCache.has(cacheKey)) {
      workbookCache.set(
        cacheKey,
        (async () => {
          await ensureXLSX();

          const response = await fetch(cacheKey, getFetchOptions(cacheKey));
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const buffer = await response.arrayBuffer();
          return window.XLSX.read(buffer, { type: "array" });
        })()
      );
    }

    try {
      return await workbookCache.get(cacheKey);
    } catch (error) {
      workbookCache.delete(cacheKey);
      throw error;
    }
  }

  async function loadSheetRows(options = {}) {
    const workbook = await getWorkbook(options);
    const sheetName =
      typeof options.sheetName === "string" && options.sheetName.trim()
        ? options.sheetName.trim()
        : "Tabelle2";
    const worksheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];

    return window.XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: options.raw !== false,
      defval: Object.prototype.hasOwnProperty.call(options, "defval") ? options.defval : "",
      blankrows: Object.prototype.hasOwnProperty.call(options, "blankrows") ? options.blankrows : true
    });
  }

  function clearWorkbookCache(options = {}) {
    const explicitUrl =
      typeof options === "string"
        ? options
        : typeof options.excelUrl === "string"
        ? options.excelUrl
        : "";
    const urlKey =
      typeof options === "object" && options && typeof options.urlKey === "string"
        ? options.urlKey
        : "";

    if (!explicitUrl && !urlKey) {
      workbookCache.clear();
      return;
    }

    const cacheKey = normalizeUrl(explicitUrl || getUrl(urlKey));
    if (cacheKey) {
      workbookCache.delete(cacheKey);
    }
  }

  window.ExcelLoader = {
    urls: URLS,
    getUrl,
    ensureXLSX,
    getWorkbook,
    loadSheetRows,
    clearWorkbookCache
  };
})();
