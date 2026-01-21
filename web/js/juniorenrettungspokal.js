const DP_BADGE_FOLDER = "./png/events/";

function dpBadgeUrlFromSlideImg(slideImgPath) {
  const m = String(slideImgPath).match(/(\d{4})/);
  if (!m) return null;
  const year = m[1];
  return DP_BADGE_FOLDER + encodeURIComponent(`JRP - ${year}.png`);
}

const DP_FOLDER = "./png/JRP-Team/";
const DP_MIN_YEAR = 2000;
const DP_MAX_YEAR = new Date().getFullYear() + 1;
const DP_EXTS = [".jpg"];

const DP_SLIDE_SETTINGS = {
  "2025": {
    text: "ausgefallen - FILCOW Cup",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.liveheats.com/events/389513",
    },
    bgPos: "center 50%",
  },
  "2024": {
    text: "ausgefallen - offene LMS Freigewässer Sachsen-Anhalt",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg.de/newsdetails/offene-landesmeisterschaften-im-freigewaesser-118339-n/",
    },
    bgPos: "center 40%",
  },
  "2023": {
    text: "LV-Gesamtwertung: 11. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/team-baden-kann-mehr-als-nur-baden-107339-n/",
    },
    bgPos: "center 40%",
  },
  "2022": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://ba.dlrg.de/newsdetails/junioren-rettungspokal-2022-95316-n/",
    },
    bgPos: "center 45%",
  },
  "2019": {
    text: "LV-Gesamtwertung: 12. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/junioren-rettungspokal-291-n/",
    },
    bgPos: "center 45%",
  },
  "2018": {
    text: "LV-Gesamtwertung: 13. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://sachsen-anhalt.dlrg.de/rettungssport/juniorenrettungspokal/jrp-2018/",
    },
    bgPos: "center 48%",
  },
  "2017": {
    text: "LV-Gesamtwertung: 13. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://emsbueren.dlrg.de/mitmachen/rettungssport/wettkaempfe-und-ergebnisse/wettkampfergebnisse-nach-jahren-details/junioren-rettungspokal-2017-teil-2-gold-282-n/",
    },
    bgPos: "center 55%",
  },
  "2016": {
    text: "LV-Gesamtwertung: 12. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://emsbueren.dlrg.de/mitmachen/rettungssport/wettkaempfe-und-ergebnisse/wettkampfergebnisse-nach-jahren-details/junioren-rettungspokal-2016-in-233-n/",
    },
    bgPos: "center 60%",
  },
  "2015": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://malsch.dlrg.de/fileadmin/groups/1070080/Informer/Informer_2015-07-08.-09.pdf",
    },
    bgPos: "center 30%",
  },
  "2013": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/junioren-rettungspokal-2013-18-n/",
    },
    bgPos: "center 30%",
  },
  "2011": {
    text: "LV-Gesamtwertung: 3. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.facebook.com/photo/?fbid=283788744993599&set=pb.100066777226581.-2207520000&locale=de_DE",
    },
    bgPos: "center 35%",
  },
  "2010": {
    text: "LV-Gesamtwertung: 11. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.facebook.com/photo/?fbid=283788841660256&set=pb.100066777226581.-2207520000&locale=de_DE",
    },
    bgPos: "center 55%",
  },
  "2007": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/fileadmin/user_upload/DLRG.de/Fuer-Mitglieder/Verbandskommunikation/Lebensretter/Lebensretter_2007/LR3-07_west.pdf",
    },
    bgPos: "center 40%",
  },
};

const DATA_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const CONFIG_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "JRP";
const CONFIG_TABLE_NAME = "JRP_konfig";

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

let PZ_CONFIGS = [];
let PZ_DATA_ROWS = [];
let PZ_MOUNT = null;

let PZ_PAGER_WIRED = false;
const PZ_TABLE_STATE = new Map();
const PZ_INFO_STATE = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="wide-carousel" aria-label="Junioren Rettungspokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          <article class="wide-carousel__slide" style="background:#111">
            <div class="wide-carousel__content">
              <h2>Junioren Rettungspokal</h2>
              <p>Lade Bilder…</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  `;

  const slides = await buildDpSlides();

  if (!slides.length) {
    main.innerHTML = `
      <section class="intro">
        <div class="container">
          <h2>Junioren Rettungspokal</h2>
          <p>Keine Jahresbilder im Ordner <code>${DP_FOLDER}</code> gefunden.</p>
        </div>
      </section>
    `;
    return;
  }

  renderPage(main, slides);
  initWideCarousel();
  loadLatestDpPdfAndRenderCard();
  initDpNominationListTables();
});

async function buildDpSlides() {
  const slides = [];
  for (let year = DP_MAX_YEAR; year >= DP_MIN_YEAR; year--) {
    const imgUrl = await firstExistingUrl(DP_FOLDER, year, DP_EXTS);
    if (!imgUrl) continue;

    const key = String(year);
    const cfg = DP_SLIDE_SETTINGS[key] || {};
    slides.push({
      year,
      title: cfg.title ?? `Junioren Rettungspokal ${year}`,
      text: cfg.text ?? "",
      img: imgUrl,
      cta: cfg.cta ?? null,
      bgPos: cfg.bgPos ?? "center center",
      h: cfg.h ?? null,
      textPos: cfg.textPos ?? "bottom",
      textAlign: cfg.textAlign ?? "center",
      contentBottom: cfg.contentBottom ?? null,
    });
  }
  return slides;
}

function renderPage(main, slides) {
  main.innerHTML = `
    <section class="wide-carousel" aria-label="Junioren Rettungspokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          ${slides
            .map((s, i) => {
              const justify =
                s.textPos === "top" ? "flex-start" : s.textPos === "center" ? "center" : "flex-end";
              const contentBottomVar = s.contentBottom ? String(s.contentBottom) : "";

              return `
                <article
                  class="wide-carousel__slide ${i === 0 ? "wide-carousel__slide--center" : ""}"
                  style="
                    background-image:url('${s.img}');
                    background-position:${s.bgPos || "center center"};
                    background-size:cover;
                    background-repeat:no-repeat;
                    --dp-justify:${justify};
                    --dp-text-align:${s.textAlign || "center"};
                    ${contentBottomVar ? `--dp-content-bottom:${contentBottomVar};` : ""}
                  "
                  ${s.h ? `data-h="${s.h}"` : ""}
                  role="group"
                  aria-roledescription="Folie"
                  aria-label="${i + 1} von ${slides.length}"
                >
                  ${
                    dpBadgeUrlFromSlideImg(s.img)
                      ? `<img class="wide-carousel__badge" src="${dpBadgeUrlFromSlideImg(s.img)}" alt="" loading="lazy" decoding="async">`
                      : ``
                  }
                  <div class="wide-carousel__content">
                    <h2>${escapeHtml(s.title)}</h2>
                    ${s.text ? `<p>${escapeHtml(s.text)}</p>` : ``}
                    ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${escapeHtml(s.cta.label)}</a>` : ``}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>

        <button class="wide-carousel__arrow wide-carousel__arrow--prev" type="button" aria-label="Vorherige Folie">
          <svg class="wide-carousel__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>

        <button class="wide-carousel__arrow wide-carousel__arrow--next" type="button" aria-label="Nächste Folie">
          <svg class="wide-carousel__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
      </div>
    </section>

    <section class="info-wrap" aria-label="Nominierungen">
      <section class="info-section" aria-labelledby="dp-guidelines-title">
        <h2 id="dp-guidelines-title">Aktuelle Nominierungsrichtlinien</h2>
        <div id="dp-guidelines" class="info-links">
          <p class="info-status">Lade Nominierungsrichtlinien…</p>
        </div>
      </section>

      <section class="info-section" aria-labelledby="dp-list-title">
        <h2 id="dp-list-title">Aktuelle Nominierungsliste</h2>
        <div id="dp-list" class="info-links">
          <div id="pflichtzeiten-root" class="pz-root">
            <p id="pflichtzeiten-status" class="pz-statusline">Lade Pflichtzeiten aus Excel …</p>
          </div>
        </div>
      </section>
    </section>
  `;

  document.querySelectorAll(".wide-carousel__badge").forEach((img) => {
    img.addEventListener("error", () => img.remove());
  });
}

function initWideCarousel() {
  const root = document.querySelector("[data-wide-carousel]");
  if (!root) return;

  const track = root.querySelector(".wide-carousel__slides");
  const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
  const prevBtn = root.querySelector(".wide-carousel__arrow--prev");
  const nextBtn = root.querySelector(".wide-carousel__arrow--next");
  const count = slides.length;

  let index = 0;
  let autoTimer = null;

  const startAuto = () => {
    stopAuto();
    autoTimer = setInterval(() => goTo(index + 1), 10000);
  };

  const stopAuto = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  };

  const readPxVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : fallback;
  };

  const fitHeight = () => {
    const active = slides[index];
    if (!active) return;

    const fixedH = parseFloat(active.dataset.h);
    if (Number.isFinite(fixedH)) {
      root.style.height = `${fixedH}px`;
      return;
    }

    const content = active.querySelector(".wide-carousel__content");
    if (!content) return;

    requestAnimationFrame(() => {
      const minH = readPxVar("--wide-min-h", 260);
      const maxH = readPxVar("--wide-max-h", 560);
      const desired = content.scrollHeight;
      const h = Math.max(minH, Math.min(maxH, desired));
      root.style.height = `${h}px`;
    });
  };

  const update = () => {
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    slides.forEach((s, i) => s.classList.toggle("wide-carousel__slide--center", i === index));
    fitHeight();
  };

  const goTo = (i) => {
    index = (i + count) % count;
    update();
  };

  prevBtn?.addEventListener("click", () => {
    goTo(index - 1);
    startAuto();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(index + 1);
    startAuto();
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
      startAuto();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
      startAuto();
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeight, 80);
  });

  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  startAuto();
  update();
}

async function firstExistingUrl(folder, year, exts) {
  for (const ext of exts) {
    const url = `${folder}${year}${ext}`;
    if (await urlExists(url)) return url;
  }
  return null;
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
    return res.ok;
  } catch {
    return await probeByImage(url, 3500);
  }
}

function probeByImage(url, timeoutMs) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      img.src = "";
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(false);
    };

    img.src = url;
  });
}

async function loadLatestDpPdfAndRenderCard() {
  const mount = document.getElementById("dp-guidelines");
  if (!mount) return;

  const cfg = {
    owner: "jp-gnad",
    repo: "Lifesaving_Baden",
    branch: "main",
    dirCandidates: ["nominierungsrichtlinien", "web/nominierungsrichtlinien"],
    cacheKey: "lsb_jrp_latest_pdf_v1",
    cacheTtlMs: 10 * 60 * 1000,
  };

  const cached = readCache(cfg.cacheKey, cfg.cacheTtlMs);
  if (cached?.year && cached?.fileName) {
    mount.innerHTML = renderDpPdfBriefCard(cached.year, cached.fileName);
    return;
  }

  try {
    const found = await fetchLatestDpPdfFromGitHub(cfg);
    writeCache(cfg.cacheKey, found);
    mount.innerHTML = renderDpPdfBriefCard(found.year, found.fileName);
  } catch (e) {
    const stale = readCache(cfg.cacheKey, Number.MAX_SAFE_INTEGER);
    if (stale?.year && stale?.fileName) {
      mount.innerHTML = renderDpPdfBriefCard(stale.year, stale.fileName);
      return;
    }
    mount.innerHTML = `<p class="info-status info-error">Nominierungsrichtlinien konnten nicht geladen werden.</p>`;
  }
}

async function fetchLatestDpPdfFromGitHub(cfg) {
  let items = null;

  for (const dirPath of cfg.dirCandidates) {
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
      dirPath
    )}?ref=${encodeURIComponent(cfg.branch)}`;

    const res = await fetchWithTimeout(apiUrl, 9000, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        items = data;
        break;
      }
    } else {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (res.status === 403 && remaining === "0") throw new Error("rate_limit");
    }
  }

  if (!items) throw new Error("no_dir");

  const re = /^junioren rettungspokal\s*(?:-|–)?\s*(19\d{2}|20\d{2})\.pdf$/i;

  let best = null;
  for (const it of items) {
    if (!it || it.type !== "file" || typeof it.name !== "string") continue;
    const m = it.name.match(re);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    if (!Number.isFinite(year)) continue;
    if (!best || year > best.year) best = { year, fileName: it.name };
  }

  if (!best) throw new Error("no_match");
  return best;
}

async function fetchWithTimeout(url, ms, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function renderDpPdfBriefCard(year, fileName) {
  const href = `../nominierungsrichtlinien/${encodeURIComponent(fileName)}`;

  return `
    <a class="info-brief" href="${href}" target="_blank" rel="noopener noreferrer"
       aria-label="Junioren Rettungspokal Nominierungsrichtlinien ${escapeHtml(year)} öffnen">
      <img class="info-brief__img" src="./png/icons/brief.png" alt="" loading="lazy" decoding="async" />
      <div class="info-brief__overlay" aria-hidden="true">
        <div class="info-brief__t1">Junioren Rettungspokal</div>
        <div class="info-brief__t2">Nominierungsrichtlinien ${escapeHtml(year)}</div>
        <div class="info-brief__spacer"></div>
        <div class="info-brief__t3">Landesverband Baden</div>
      </div>
    </a>
  `;
}

function readCache(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (!obj.ts || Date.now() - obj.ts > ttlMs) return null;
    return obj.data || null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initDpNominationListTables() {
  const outer = document.getElementById("dp-list");
  if (!outer) return;

  PZ_MOUNT = document.getElementById("pflichtzeiten-root");

  renderAllFromExcel().catch((err) => {
    console.error(err);
    const status = document.getElementById("pflichtzeiten-status");
    if (status) status.textContent = "Fehler beim Laden/Verarbeiten der Excel-Dateien.";
  });
}

async function renderAllFromExcel() {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX ist nicht geladen. Bitte XLSX CDN Script einbinden.");
  }
  if (!PZ_MOUNT) return;

  const status = document.getElementById("pflichtzeiten-status");
  if (status) status.textContent = "Lade Konfiguration …";

  const cfgWb = XLSX.read(await (await fetch(CONFIG_EXCEL_URL, { cache: "no-store" })).arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const wsCfg = cfgWb.Sheets[CONFIG_SHEET];
  if (!wsCfg) throw new Error(`Arbeitsblatt "${CONFIG_SHEET}" nicht gefunden.`);

  const cfgRows = XLSX.utils.sheet_to_json(wsCfg, { header: 1, raw: true, defval: "", blankrows: false });
  console.log("cfgRows[0..15]:", cfgRows.slice(0, 15));
  const hi = findHeaderRowIndex(cfgRows);
  console.log("headerIdx:", hi);
  if (hi >= 0) console.log("headerRow:", cfgRows[hi]);

  const rowCfgs = parseConfigsFromRows(cfgRows);
  PZ_CONFIGS = mergeConfigsByTableName(rowCfgs);

  if (!PZ_CONFIGS.length) {
    if (status) status.textContent = "Keine Konfigurationen gefunden.";
    return;
  }

  if (status) status.textContent = "Lade Daten …";

  const dataWb = XLSX.read(await (await fetch(DATA_EXCEL_URL, { cache: "no-store" })).arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const wsData = dataWb.Sheets[DATA_SHEET];
  if (!wsData) throw new Error(`Arbeitsblatt "${DATA_SHEET}" nicht gefunden.`);

  let rows = XLSX.utils.sheet_to_json(wsData, { header: 1, raw: true, defval: "", blankrows: false });
  rows = rows.filter((r) => Array.isArray(r) && r.some((v) => String(v ?? "").trim() !== ""));

  const g0 = normalizeGender(rows[0]?.[DATA_COLS.gender]);
  const d0 = String(rows[0]?.[DATA_COLS.excelDatum] ?? "").toLowerCase();
  const startIdx = g0.includes("gender") || g0.includes("geschlecht") || d0.includes("datum") ? 1 : 0;

  PZ_DATA_ROWS = rows.slice(startIdx);

  if (status) status.remove();

  PZ_MOUNT.classList.add("pz-grid");
  renderTablesIntoMount();

  if (!PZ_PAGER_WIRED) {
    PZ_PAGER_WIRED = true;

    PZ_MOUNT.addEventListener("click", (ev) => {
    const infoBtn = ev.target.closest("button[data-info]");
    if (infoBtn) {
      const tableId = infoBtn.dataset.info;
      const isOpen = !!PZ_INFO_STATE.get(tableId);
      PZ_INFO_STATE.set(tableId, !isOpen);
      renderTablesIntoMount();
      return;
    }

    const btn = ev.target.closest("button[data-table]");
    if (!btn) return;

    const tableId = btn.dataset.table;
    const action = btn.dataset.action;
    const pageAttr = btn.dataset.page;

    const cfg = PZ_CONFIGS.find((x) => x.id === tableId);
    if (!cfg) return;

    const fullList = buildPeopleForConfigGroup(PZ_DATA_ROWS, cfg).sort(personSort);

    const pageSize = Math.max(1, Number(cfg.pageSize || 5));
    const maxPage = getMaxPage(fullList, pageSize);

    let page = PZ_TABLE_STATE.get(tableId) || 1;

    if (action === "prev") page = clamp(page - 1, 1, maxPage);
    else if (action === "next") page = clamp(page + 1, 1, maxPage);
    else if (pageAttr) {
      const p = Number(pageAttr);
      if (Number.isFinite(p)) page = clamp(p, 1, maxPage);
    }

    PZ_TABLE_STATE.set(tableId, page);
    renderTablesIntoMount();
  });
  }
}

function renderTablesIntoMount() {
  if (!PZ_MOUNT) return;

  PZ_MOUNT.innerHTML = "";

  const pairs = pairConfigsByTitle(PZ_CONFIGS);

  for (const p of pairs) {
    if (p.w && p.m) {
      const listW = buildPeopleForConfigGroup(PZ_DATA_ROWS, p.w).sort(personSort);
      PZ_MOUNT.appendChild(buildTableBlock(p.w, listW));

      const listM = buildPeopleForConfigGroup(PZ_DATA_ROWS, p.m).sort(personSort);
      PZ_MOUNT.appendChild(buildTableBlock(p.m, listM));

      continue;
    }

    if (p.w) {
      const listW = buildPeopleForConfigGroup(PZ_DATA_ROWS, p.w).sort(personSort);
      const el = buildTableBlock(p.w, listW);
      el.classList.add("pz-block--span2");
      PZ_MOUNT.appendChild(el);
      continue;
    }

    if (p.m) {
      const listM = buildPeopleForConfigGroup(PZ_DATA_ROWS, p.m).sort(personSort);
      const el = buildTableBlock(p.m, listM);
      el.classList.add("pz-block--span2");
      PZ_MOUNT.appendChild(el);
      continue;
    }
  }


  if (!pairs.length) {
    const p = document.createElement("p");
    p.className = "pz-empty";
    p.textContent = "Keine Einträge.";
    PZ_MOUNT.appendChild(p);
  }
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

      if (!prev || isBetterRec(rec, prev)) {
        merged.set(key, rec);
      }
    }
  }

  return Array.from(merged.values());
}

function isBetterRec(a, b) {
  const a1 = a.pz1Count ?? 0, b1 = b.pz1Count ?? 0;
  if (a1 !== b1) return a1 > b1;

  const a2 = a.pz2Count ?? 0, b2 = b.pz2Count ?? 0;
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
    const ok = needed.every((h) => set.has(normHeader(h)));
    if (ok) return i;
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

  const head = document.createElement("div");
  head.className = "pz-head";

  const h3 = document.createElement("h3");
  h3.className = "pz-title";
  h3.textContent = cfg.title;

  const infoBtn = document.createElement("button");
  infoBtn.type = "button";
  infoBtn.className = "pz-info-btn";
  infoBtn.textContent = "Info";
  infoBtn.dataset.info = cfg.id;

  const infoId = `pz-info-${cfg.id}`;
  infoBtn.setAttribute("aria-controls", infoId);

  const isInfoOpen = !!PZ_INFO_STATE.get(cfg.id);
  infoBtn.setAttribute("aria-expanded", isInfoOpen ? "true" : "false");

  head.appendChild(h3);
  head.appendChild(infoBtn);
  wrap.appendChild(head);

  const infoBox = buildPflichtzeitenInfoBox(cfg);
  infoBox.id = infoId;
  infoBox.hidden = !isInfoOpen;
  wrap.appendChild(infoBox);

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
  const currentPage = clamp(PZ_TABLE_STATE.get(cfg.id) || 1, 1, maxPage);
  PZ_TABLE_STATE.set(cfg.id, currentPage);

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
        if (level === "PZ1" || level === "PZ2") {
          reached.push({ i, level, best });
        }
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

function timeTextToCentiOrNull(s) {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const c = timeTextToCenti(t);
  return c > 0 ? c : null;
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

function ymdLocal(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function cfgPairKey(cfg) {
  return [
    cfg.minAge ?? "",
    cfg.maxAge ?? "",
    ymdLocal(cfg.qualiStart),
    ymdLocal(cfg.qualiEnd),
    ymdLocal(cfg.lastActive),
    String(cfg.lv ?? ""),
    cfg.omsFilter ? "1" : "0",
    String(cfg.poolLength ?? ""),
    String(cfg.rulebook ?? ""),
    String(cfg.pageSize ?? ""),
  ].join("|");
}

function pairConfigsByCriteria(cfgs) {
  const order = [];
  const map = new Map();

  for (let i = 0; i < cfgs.length; i++) {
    const cfg = cfgs[i];
    const key = cfgPairKey(cfg);

    let p = map.get(key);
    if (!p) {
      p = { key, order: i, w: null, m: null };
      map.set(key, p);
      order.push(p);
    }

    if (cfg.gender === "w") {
      if (!p.w) p.w = cfg;
      else {
        const key2 = key + "#w#" + i;
        const p2 = { key: key2, order: i, w: cfg, m: null };
        order.push(p2);
        map.set(key2, p2);
      }
    } else if (cfg.gender === "m") {
      if (!p.m) p.m = cfg;
      else {
        const key2 = key + "#m#" + i;
        const p2 = { key: key2, order: i, w: null, m: cfg };
        order.push(p2);
        map.set(key2, p2);
      }
    }
  }

  order.sort((a, b) => a.order - b.order);
  return order;
}

function yearLabel2(birthYear) {
  return String(birthYear % 100).padStart(2, "0");
}

function buildPflichtzeitenInfoBox(cfgGroup) {
  const root = document.createElement("div");
  root.className = "pz-info";

  const variants = Array.isArray(cfgGroup?.variants) && cfgGroup.variants.length
    ? cfgGroup.variants
    : [cfgGroup];

  const sorted = variants.slice().sort((a, b) => {
    const ra = calcBirthYearRange(a);
    const rb = calcBirthYearRange(b);
    if (ra.low !== rb.low) return ra.low - rb.low;
    return ra.high - rb.high;
  });

  for (const v of sorted) {
    const sec = document.createElement("section");
    sec.className = "pz-info-sec";

    const range = calcBirthYearRange(v);
    const label = rangeLabel(range);

    const title = document.createElement("div");
    title.className = "pz-info-range";
    title.textContent = `Pflichtzeiten: ${label}`;
    sec.appendChild(title);

    const showPZ2 = variantNeedsPZ2(v);

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

      const t1 = v.pz1?.[d.key];
      const t2 = v.pz2?.[d.key];

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
    sec.appendChild(table);

    root.appendChild(sec);
  }

  return root;
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
  return `${r.high}-${r.low}`;
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

