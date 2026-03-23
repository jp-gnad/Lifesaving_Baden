(function () {
  "use strict";

  const XLSX_CDN_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  const PAGES_WEB_BASE = "https://jp-gnad.github.io/Lifesaving_Baden/web";
  const PAGES_ROOT_BASE = "https://jp-gnad.github.io/Lifesaving_Baden";
  const REMOTE_DATA_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data";
  const REMOTE_LEGACY_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities";

  const URL_CANDIDATES = {
    athleteData:
      window.location.protocol === "file:"
        ? [
            `${PAGES_WEB_BASE}/data/test (1).xlsx`,
            `${PAGES_ROOT_BASE}/data/test (1).xlsx`,
            `${REMOTE_DATA_BASE}/test (1).xlsx`,
            `${REMOTE_LEGACY_BASE}/test (1).xlsx`
          ]
        : [
            "./data/test (1).xlsx",
            `${PAGES_WEB_BASE}/data/test (1).xlsx`,
            `${PAGES_ROOT_BASE}/data/test (1).xlsx`,
            `${REMOTE_DATA_BASE}/test (1).xlsx`,
            `${REMOTE_LEGACY_BASE}/test (1).xlsx`
          ],
    recordsCriteria:
      window.location.protocol === "file:"
        ? [
            `${PAGES_WEB_BASE}/data/records_kriterien.xlsx`,
            `${PAGES_ROOT_BASE}/data/records_kriterien.xlsx`,
            `${REMOTE_DATA_BASE}/records_kriterien.xlsx`,
            `${REMOTE_LEGACY_BASE}/records_kriterien.xlsx`
          ]
        : [
            "./data/records_kriterien.xlsx",
            `${PAGES_WEB_BASE}/data/records_kriterien.xlsx`,
            `${PAGES_ROOT_BASE}/data/records_kriterien.xlsx`,
            `${REMOTE_DATA_BASE}/records_kriterien.xlsx`,
            `${REMOTE_LEGACY_BASE}/records_kriterien.xlsx`
          ],
    top10Data:
      window.location.protocol === "file:"
        ? [
            `${PAGES_WEB_BASE}/data/top10.json`,
            `${PAGES_ROOT_BASE}/data/top10.json`,
            `${REMOTE_DATA_BASE}/top10.json`,
            `${REMOTE_LEGACY_BASE}/top10.json`
          ]
        : [
            "./data/top10.json",
            `${PAGES_WEB_BASE}/data/top10.json`,
            `${PAGES_ROOT_BASE}/data/top10.json`,
            `${REMOTE_DATA_BASE}/top10.json`,
            `${REMOTE_LEGACY_BASE}/top10.json`
          ]
  };

  let xlsxPromise = null;
  const workbookCache = new Map();

  function normalizeUrl(excelUrl) {
    const raw = String(excelUrl || "").trim();
    if (!raw) return "";

    try {
      return encodeURI(decodeURI(raw));
    } catch (_) {
      return encodeURI(raw);
    }
  }

  function dedupeUrls(urls) {
    const out = [];
    const seen = new Set();

    for (const url of Array.isArray(urls) ? urls : [urls]) {
      const value = String(url || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }

    return out;
  }

  function getUrlCandidates(urlKey) {
    return dedupeUrls(URL_CANDIDATES[String(urlKey || "").trim()] || []);
  }

  function getUrl(urlKey) {
    return getUrlCandidates(urlKey)[0] || "";
  }

  function getFetchOptions(url) {
    return /^https?:\/\//i.test(String(url || "").trim()) ? { mode: "cors" } : {};
  }

  async function fetchFirstAvailable(urls, init = {}) {
    const candidates = dedupeUrls(urls);
    let lastError = null;

    for (const candidate of candidates) {
      const normalized = normalizeUrl(candidate);

      try {
        const response = await fetch(normalized, {
          ...getFetchOptions(candidate),
          ...init
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return { response, url: normalized };
      } catch (error) {
        lastError = new Error(`${normalized} -> ${error?.message || error}`);
      }
    }

    throw lastError || new Error("No URL candidates available");
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
    const explicitUrls =
      typeof options === "object" && options && Array.isArray(options.excelUrls)
        ? options.excelUrls
        : [];
    const urlKey =
      typeof options === "object" && options && typeof options.urlKey === "string"
        ? options.urlKey
        : "";
    const excelUrls = dedupeUrls(explicitUrl ? [explicitUrl] : explicitUrls.length ? explicitUrls : getUrlCandidates(urlKey));
    const cacheKey = excelUrls.map(normalizeUrl).join("||");

    if (!cacheKey) {
      throw new Error("Excel URL missing");
    }

    if (!workbookCache.has(cacheKey)) {
      workbookCache.set(
        cacheKey,
        (async () => {
          await ensureXLSX();
          const { response } = await fetchFirstAvailable(excelUrls);
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
    const explicitUrls =
      typeof options === "object" && options && Array.isArray(options.excelUrls)
        ? options.excelUrls
        : [];
    const urlKey =
      typeof options === "object" && options && typeof options.urlKey === "string"
        ? options.urlKey
        : "";

    if (!explicitUrl && !explicitUrls.length && !urlKey) {
      workbookCache.clear();
      return;
    }

    const cacheKey = dedupeUrls(explicitUrl ? [explicitUrl] : explicitUrls.length ? explicitUrls : getUrlCandidates(urlKey))
      .map(normalizeUrl)
      .join("||");
    if (cacheKey) {
      workbookCache.delete(cacheKey);
    }
  }

  window.ExcelLoader = {
    urls: URL_CANDIDATES,
    getUrl,
    getUrlCandidates,
    fetchFirstAvailable,
    ensureXLSX,
    getWorkbook,
    loadSheetRows,
    clearWorkbookCache
  };
})();
