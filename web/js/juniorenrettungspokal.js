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
    bgPos: "center 60%",
  },
  "2024": {
    text: "ausgefallen - offene LMS Freigewässer Sachsen-Anhalt",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg.de/newsdetails/offene-landesmeisterschaften-im-freigewaesser-118339-n/",
    },
    bgPos: "center 45%",
  },
  "2023": {
    text: "LV-Gesamtwertung: 11. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/team-baden-kann-mehr-als-nur-baden-107339-n/",
    },
    bgPos: "center 45%",
  },
  "2022": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://ba.dlrg.de/newsdetails/junioren-rettungspokal-2022-95316-n/",
    },
    bgPos: "center 50%",
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
    bgPos: "center 55%",
  },
  "2017": {
    text: "LV-Gesamtwertung: 13. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://emsbueren.dlrg.de/mitmachen/rettungssport/wettkaempfe-und-ergebnisse/wettkampfergebnisse-nach-jahren-details/junioren-rettungspokal-2017-teil-2-gold-282-n/",
    },
    bgPos: "center 65%",
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
    bgPos: "center 60%",
  },
};

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
    cacheKey: "lsb_dp_latest_pdf_v2",
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
