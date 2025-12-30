const DP_BADGE_FOLDER = "./png/events/";

function dpBadgeUrlFromSlideImg(slideImgPath) {
  const m = String(slideImgPath).match(/(\d{4})/);
  if (!m) return null;
  const year = m[1];
  const file = `DP - ${year}.png`;                 // exakt dein Name mit Leerzeichen
  return DP_BADGE_FOLDER + encodeURIComponent(file); // macht "DP%20-%202025.png"
}



/* =========================
   AUTO-SLIDES aus /png/DP-Team/
   - Bilder heißen: 2025.jpg, 2024.png, ...
   - Neue Datei in den Ordner legen => automatisch im Karussell
   ========================= */

/** Ordner + Suchbereich */
const DP_FOLDER = "./png/DP-Team/";
const DP_MIN_YEAR = 2000;
const DP_MAX_YEAR = new Date().getFullYear() + 1;

/** Dateiendungen, die akzeptiert werden */
const DP_EXTS = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG", ".webp", ".WEBP"];

/* =========================
   PRO-JAHR-KONFIG (separater Abschnitt)
   Hier trägst du optional pro Jahr ein:
   - text (Unterzeile)
   - cta (Button: label + href)
   - bgPos (background-position)
   - h (fixe Karussell-Höhe für dieses Jahr in px; sonst automatisch)
   - textPos ("bottom" | "center" | "top")
   - textAlign ("center" | "left" | "right")
   - contentBottom (optional: extra bottom-offset nur für dieses Jahr; z.B. "10px" oder "2vh")
   ========================= */

const DP_SLIDE_SETTINGS = {
  "2025": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://baden.dlrg.de/mitmachen/rettungssport/news-detail/drei-badische-rekorde-in-warendorf-134005-n/" 
    },
    bgPos: "center 25%",
  },
  "2024": {
    text: "LV-Gesamtwertung: 9. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/deutschlandpokal-2024/" 
    },
    bgPos: "center 40%",
  },
  "2023": {
    text: "LV-Gesamtwertung: 9. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/internationaler-deutschlandpokal-2023/" 
    },
    bgPos: "center 65%",
  },
  "2022": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/deutschlandpokal-2022/ergebnisse-einzel/#:~:text=Ergebnisse%20Einzel%20%2D%20Deutschlandpokal%202022%20%7C%20DLRG%20e.V." 
    },
    bgPos: "center 25%",
  },
  "2019": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/internationaler-deutschlandpokal-2019-312-n/" 
    },
    bgPos: "center 35%",
  },
  "2017": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/deutschlandpokal-2017-234-n/" 
    },
    bgPos: "center 50%",
  },
  "2016": {
    text: "LV-Gesamtwertung: 4. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/erfolgreicher-deutschlandpokal-2016-199-n/" 
    },
    bgPos: "center 15%",
  },
  "2015": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://www.youtube.com/watch?v=AwgeM_VwPOs" 
    },
    bgPos: "center 30%",
  },
  "2014": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://www.badische-zeitung.de/verena-weis-knackt-rekord" 
    },
    bgPos: "center 10%",
  },
  "2011": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: { 
      label: "Mehr Infos!", 
      href: "https://www.durlacher.de/start/neuigkeiten-archiv/artikel/2011/dezember/15/schwimmer-der-dlrg-durlach-auch-international-erfolgreich" 
    },
    bgPos: "center 30%",
  },
  "2000": {
    text: "LV-Gesamtwertung: 11. Platz",
    bgPos: "center 15%",
  },
};

// ===== Deutschlandpokal PDF Auto-Finder =====
const DP_PDF_BASE = "../nominierungsrichtlinien/";
const DP_PDF_MIN_YEAR = 2000;
const DP_PDF_MAX_YEAR = new Date().getFullYear() + 1;

const DP_PDF_NAME_PATTERNS = [
  (y) => `Deutschlandpokal - ${y}.pdf`,
];


/* =========================
   PAGE
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.getElementById("content");
  if (!main) return;

  // Platzhalter (optional)
  main.innerHTML = `
    <section class="wide-carousel" aria-label="Deutschlandpokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          <article class="wide-carousel__slide" style="background:#111">
            <div class="wide-carousel__content">
              <h2>Deutschlandpokal</h2>
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
          <h2>Deutschlandpokal</h2>
          <p>Keine Jahresbilder im Ordner <code>${DP_FOLDER}</code> gefunden.</p>
        </div>
      </section>
    `;
    return;
  }

  renderCarousel(main, slides);
  initWideCarousel();
  renderDeutschlandpokalGuidelinesCard();
});

/* =========================
   Slides bauen (automatisch aus Jahren)
   ========================= */

async function buildDpSlides() {
  const slides = [];

  for (let year = DP_MAX_YEAR; year >= DP_MIN_YEAR; year--) {
    const imgUrl = await firstExistingUrl(DP_FOLDER, year, DP_EXTS);
    if (!imgUrl) continue;

    const key = String(year);
    const cfg = DP_SLIDE_SETTINGS[key] || {};

    const title = cfg.title ?? `Deutschlandpokal ${year}`;
    const text = cfg.text ?? "";
    const cta = cfg.cta ?? null;

    slides.push({
      year,
      title,
      text,
      img: imgUrl,
      cta,
      bgPos: cfg.bgPos ?? "center center",
      h: cfg.h ?? null,
      textPos: cfg.textPos ?? "bottom",
      textAlign: cfg.textAlign ?? "center",
      contentBottom: cfg.contentBottom ?? null,
    });
  }

  return slides;
}

function renderCarousel(main, slides) {
  main.innerHTML = `
    <section class="wide-carousel" aria-label="Deutschlandpokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          ${slides
            .map((s, i) => {
              const justify =
                s.textPos === "top" ? "flex-start" :
                s.textPos === "center" ? "center" :
                "flex-end";

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
                    --dp-text-align:${s.textAlign};
                    ${contentBottomVar ? `--dp-content-bottom:${contentBottomVar};` : ""}
                  "
                  role="group" aria-roledescription="Folie"
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
          <p class="info-status">—</p>
        </div>
      </section>

      <section class="info-section" aria-labelledby="dp-list-title">
        <h2 id="dp-list-title">Aktuelle Nominierungsliste</h2>
        <div id="dp-list" class="info-links">
          <p class="info-status">—</p>
        </div>
      </section>
    </section>
  `;

  document.querySelectorAll(".wide-carousel__badge").forEach(img => {
    img.addEventListener("error", () => img.remove());
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderDpGuidelinesCard(slides) {
  const mount = document.getElementById("dp-guidelines");
  if (!mount) return;

  const years = (slides || []).map(s => Number(s.year)).filter(Number.isFinite);
  const latestYear = years.length ? Math.max(...years) : new Date().getFullYear();

  // Ziel-Link: anpassen, falls du eine spezifische Untersektion hast
  const href = "./nominierung.html#deutschlandpokal";

  mount.innerHTML = renderBriefCard({
    href,
    aria: `Nominierungsrichtlinien ${latestYear} öffnen`,
    t1: `Nominierung ${latestYear}`,
    t2: "Deutschlandpokal",
    t3: "Landeskader Baden",
  });
}

function renderBriefCard({ href, aria, t1, t2, t3 }) {
  return `
    <a class="info-brief" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(aria)}">
      <img
        class="info-brief__img"
        src="./png/icons/brief.png"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div class="info-brief__overlay" aria-hidden="true">
        <div class="info-brief__t1">${escapeHtml(t1)}</div>
        <div class="info-brief__t2">${escapeHtml(t2)}</div>
        <div class="info-brief__spacer"></div>
        <div class="info-brief__t3">${escapeHtml(t3)}</div>
      </div>
    </a>
  `;
}


/* =========================
   Carousel-Logik (wie zuvor, mit pro-slide Höhe)
   ========================= */

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

    // 1) Pro-Slide fixe Höhe, falls gesetzt
    const fixedH = parseFloat(active.dataset.h);
    if (Number.isFinite(fixedH)) {
      root.style.height = `${fixedH}px`;
      return;
    }

    // 2) Sonst: dynamisch aus Content
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

  prevBtn?.addEventListener("click", () => { goTo(index - 1); startAuto(); });
  nextBtn?.addEventListener("click", () => { goTo(index + 1); startAuto(); });

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); startAuto(); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); startAuto(); }
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

/* =========================
   Datei-Existenz prüfen (Jahr + Endungen)
   ========================= */

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

async function renderDeutschlandpokalGuidelinesCard() {
  const mount = document.getElementById("dp-guidelines");
  if (!mount) return;

  mount.innerHTML = `<p class="info-status">Lade…</p>`;

  const found = await findLatestDeutschlandpokalPdf();
  if (!found) {
    mount.innerHTML = `<p class="info-status info-error">Keine Deutschlandpokal-PDF gefunden.</p>`;
    return;
  }

  const { year, href } = found;

  mount.innerHTML = renderBriefCard({
    href,
    aria: `Deutschlandpokal Nominierungsrichtlinien ${year} öffnen`,
    t1: "Deutschlandpokal",
    t2: `Nominierungsrichtlinien ${year}`,
    t3: "Landesverband Baden",
  });

  // optional: Platzhalter für die zweite Box
  const listMount = document.getElementById("dp-list");
  if (listMount) listMount.innerHTML = `<p class="info-status">—</p>`;
}

async function findLatestDeutschlandpokalPdf() {
  for (let y = DP_PDF_MAX_YEAR; y >= DP_PDF_MIN_YEAR; y--) {
    for (const makeName of DP_PDF_NAME_PATTERNS) {
      const fileName = makeName(y);
      const href = DP_PDF_BASE + encodeURIComponent(fileName);
      if (await pdfUrlExists(href)) return { year: y, href };
    }
  }
  return null;
}

// Wichtig: eigener Name, damit es NICHT mit deiner Bild-urlExists() kollidiert
async function pdfUrlExists(url) {
  // 1) HEAD (wenn erlaubt)
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (r.ok) return true;
  } catch {}

  // 2) Fallback: kleiner Range-GET
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

function renderBriefCard({ href, aria, t1, t2, t3 }) {
  return `
    <a class="info-brief" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(aria)}">
      <img class="info-brief__img" src="./png/icons/brief.png" alt="" loading="lazy" decoding="async" />
      <div class="info-brief__overlay" aria-hidden="true">
        <div class="info-brief__t1">${escapeHtml(t1)}</div>
        <div class="info-brief__t2">${escapeHtml(t2)}</div>
        <div class="info-brief__spacer"></div>
        <div class="info-brief__t3">${escapeHtml(t3)}</div>
      </div>
    </a>
  `;
}



