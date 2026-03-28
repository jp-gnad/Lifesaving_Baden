(function () {
  window.initPictureKarussel = async function initPictureKarussel(options = {}) {
    const rootSelector = options.rootSelector || "[data-wide-carousel]";
    const root = document.querySelector(rootSelector);
    if (!root) throw new Error("carousel_missing");

    const track = root.querySelector(".wide-carousel__slides");
    if (!track) throw new Error("carousel_missing");

    const cfg = {
      folder: options.folder || "",
      minYear: Number.isFinite(options.minYear) ? options.minYear : 2000,
      maxYear: Number.isFinite(options.maxYear) ? options.maxYear : new Date().getFullYear() + 1,
      exts: normalizeExts(Array.isArray(options.exts) && options.exts.length ? options.exts : [".jpg"]),
      yearSuffixes: normalizeYearSuffixes(options.yearSuffixes),
      slides: Array.isArray(options.slides) ? options.slides : [],
      slideSettings: options.slideSettings || {},
      fallbackSlide: options.fallbackSlide && typeof options.fallbackSlide === "object"
        ? options.fallbackSlide
        : null,
      titleBase: typeof options.titleBase === "string" && options.titleBase.trim()
        ? options.titleBase.trim()
        : "Junioren Rettungspokal",
    };

    const explicitSlides = buildExplicitSlides(cfg);
    if (explicitSlides.length) {
      track.innerHTML = explicitSlides
        .map((slide, index) => slideToHtml(slide, index === 0))
        .join("");

      initWideCarousel(root);
      initSlideLazyLoading(root);
      return;
    }

    const first = await findLatestSlide(cfg);
    const fallback = first ? null : buildFallbackSlide(cfg);
    const initialSlide = first ? first.slide : fallback;
    if (!initialSlide) throw new Error("no_slides");

    track.innerHTML = slideToHtml(initialSlide, true);

    initWideCarousel(root);
    initSlideLazyLoading(root);

    if (first) {
      loadRemainingSlides(root, cfg, first.year, first.url).catch(console.error);
    }
  };

  function normalizeExts(exts) {
    const out = [];
    const seen = new Set();

    for (const ext of exts || []) {
      const raw = String(ext || "").trim();
      if (!raw) continue;
      const normalized = raw.startsWith(".") ? raw : `.${raw}`;

      for (const variant of [normalized, normalized.toLowerCase(), normalized.toUpperCase()]) {
        if (!variant || seen.has(variant)) continue;
        seen.add(variant);
        out.push(variant);
      }
    }

    return out.length ? out : [".jpg", ".JPG"];
  }

  function normalizeYearSuffixes(suffixes) {
    const input = Array.isArray(suffixes) && suffixes.length ? suffixes : [""];
    const out = [];
    const seen = new Set();

    for (const suffix of input) {
      const value = String(suffix ?? "").trim();
      if (seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }

    if (!seen.has("")) out.unshift("");
    return out;
  }

  function buildSlideObj(year, imgUrl, cfgAll) {
    const key = String(year);
    const cfg = cfgAll.slideSettings[key] || {};
    return {
      year,
      title: cfg.title ?? `${cfgAll.titleBase} ${year}`,
      text: cfg.text ?? "",
      img: imgUrl,
      cta: cfg.cta ?? null,
      bgPos: cfg.bgPos ?? "center center",
      h: cfg.h ?? null,
      textPos: cfg.textPos ?? "bottom",
      textAlign: cfg.textAlign ?? "center",
      contentBottom: cfg.contentBottom ?? null,
    };
  }

  async function findLatestSlide(cfg) {
    for (let year = cfg.maxYear; year >= cfg.minYear; year--) {
      const urls = await existingUrlsForYear(cfg.folder, year, cfg.exts, cfg.yearSuffixes);
      if (!urls.length) continue;
      return {
        year,
        url: urls[0],
        slide: buildSlideObj(year, urls[0], cfg),
      };
    }
    return null;
  }

  async function loadRemainingSlides(root, cfg, startYear, alreadyLoadedUrl = "") {
    const track = root.querySelector(".wide-carousel__slides");
    if (!track) return;

    for (let year = startYear; year >= cfg.minYear; year--) {
      const urls = await existingUrlsForYear(cfg.folder, year, cfg.exts, cfg.yearSuffixes);
      const pendingUrls = year === startYear && alreadyLoadedUrl
        ? urls.filter((url) => url !== alreadyLoadedUrl)
        : urls;

      for (const imgUrl of pendingUrls) {
        const s = buildSlideObj(year, imgUrl, cfg);
        track.insertAdjacentHTML("beforeend", slideToHtml(s, false));
        root.dispatchEvent(new CustomEvent("dp-slides-updated"));
        await sleep(25);
      }
    }
  }

  function buildExplicitSlides(cfg) {
    return (cfg.slides || [])
      .map((slide) => normalizeExplicitSlide(slide, cfg))
      .filter(Boolean);
  }

  function normalizeExplicitSlide(slide, cfg) {
    if (!slide || typeof slide !== "object") return null;

    const img = String(slide.img || slide.src || "").trim();
    if (!img) return null;

    const year = slide.year ?? null;
    const title =
      typeof slide.title === "string" && slide.title.trim()
        ? slide.title.trim()
        : year !== null && year !== undefined && year !== ""
          ? `${cfg.titleBase} ${year}`
          : cfg.titleBase;

    return {
      year,
      title,
      text: slide.text ?? "",
      img,
      cta: slide.cta ?? null,
      bgPos: slide.bgPos ?? "center center",
      h: slide.h ?? null,
      textPos: slide.textPos ?? "bottom",
      textAlign: slide.textAlign ?? "center",
      contentBottom: slide.contentBottom ?? null,
    };
  }

  function buildFallbackSlide(cfg) {
    const fallback = cfg.fallbackSlide;
    if (!fallback?.img) return null;

    return {
      year: fallback.year ?? null,
      title: fallback.title ?? cfg.titleBase,
      text: fallback.text ?? "",
      img: fallback.img,
      cta: fallback.cta ?? null,
      bgPos: fallback.bgPos ?? "center center",
      h: fallback.h ?? null,
      textPos: fallback.textPos ?? "bottom",
      textAlign: fallback.textAlign ?? "center",
      contentBottom: fallback.contentBottom ?? null,
    };
  }

  function slideToHtml(s, eager) {
    const justify = s.textPos === "top" ? "flex-start" : s.textPos === "center" ? "center" : "flex-end";
    const contentBottomVar = s.contentBottom ? String(s.contentBottom) : "";
    const baseStyle = `
      background-position:${s.bgPos || "center center"};
      background-size:cover;
      background-repeat:no-repeat;
      --dp-justify:${justify};
      --dp-text-align:${s.textAlign || "center"};
      ${contentBottomVar ? `--content-bottom:${contentBottomVar};` : ""}
    `.trim();

    const bgStyle = eager ? `background-image:url('${s.img}');` : `background:#111;`;
    const dataBg = eager ? "" : `data-bg="${s.img}"`;

    return `
      <article
        class="wide-carousel__slide ${eager ? "wide-carousel__slide--center" : ""}"
        style="${bgStyle} ${baseStyle}"
        ${s.h ? `data-h="${s.h}"` : ""}
        ${dataBg}
        role="group"
        aria-roledescription="Folie"
      >
        <div class="wide-carousel__content">
          <h2>${escapeHtml(s.title)}</h2>
          ${s.text ? `<p>${escapeHtml(s.text)}</p>` : ``}
          ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${escapeHtml(s.cta.label)}</a>` : ``}
        </div>
      </article>
    `;
  }

  function initWideCarousel(root) {
    const track = root.querySelector(".wide-carousel__slides");
    const prevBtn = root.querySelector(".wide-carousel__arrow--prev");
    const nextBtn = root.querySelector(".wide-carousel__arrow--next");

    if (!track) return;

    let index = 0;
    let autoTimer = null;

    const getSlides = () => Array.from(root.querySelectorAll(".wide-carousel__slide"));
    const getCount = () => getSlides().length;

    const startAuto = () => {
      stopAuto();
      if (getCount() <= 1) return;
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
      const slides = getSlides();
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
      const slides = getSlides();
      const count = slides.length;
      if (!count) return;

      track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;

      slides.forEach((s, i) => {
        s.classList.toggle("wide-carousel__slide--center", i === index);
        s.setAttribute("aria-label", `${i + 1} von ${count}`);
      });

      const many = count > 1;
      if (prevBtn) prevBtn.style.display = many ? "" : "none";
      if (nextBtn) nextBtn.style.display = many ? "" : "none";

      fitHeight();
      root.dispatchEvent(new CustomEvent("dp-slide-change", { detail: { index } }));
    };

    const goTo = (i) => {
      const count = getCount();
      if (!count) return;
      index = (i + count) % count;
      update();
      startAuto();
    };

    prevBtn?.addEventListener("click", () => goTo(index - 1));
    nextBtn?.addEventListener("click", () => goTo(index + 1));

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
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

    root.addEventListener("dp-slides-updated", () => {
      const count = getCount();
      if (index >= count) index = Math.max(0, count - 1);
      update();
      startAuto();
    });

    startAuto();
    update();
  }

  function initSlideLazyLoading(root) {
    const track = root.querySelector(".wide-carousel__slides");
    if (!track) return;

    const ensureLoaded = (slide) => {
      const url = slide?.dataset?.bg;
      if (!url) return;

      slide.dataset.bg = "";

      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        slide.style.backgroundImage = `url('${url}')`;
      };
      img.onerror = () => {
        slide.style.background = "#111";
      };
      img.src = url;
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          ensureLoaded(e.target);
          io.unobserve(e.target);
        }
      },
      { root, threshold: 0.35 }
    );

    const observeSlide = (el) => {
      if (el?.classList?.contains("wide-carousel__slide") && el.dataset?.bg) io.observe(el);
    };

    track.querySelectorAll(".wide-carousel__slide").forEach(observeSlide);

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (!(n instanceof Element)) continue;
          if (n.classList.contains("wide-carousel__slide")) observeSlide(n);
          n.querySelectorAll?.(".wide-carousel__slide").forEach(observeSlide);
        }
      }
    });

    mo.observe(track, { childList: true });

    root.addEventListener("dp-slide-change", (ev) => {
      const idx = ev?.detail?.index ?? 0;
      const slides = Array.from(track.querySelectorAll(".wide-carousel__slide"));
      if (!slides.length) return;

      const cur = slides[idx];
      const next = slides[(idx + 1) % slides.length];
      const prev = slides[(idx - 1 + slides.length) % slides.length];

      ensureLoaded(cur);
      setTimeout(() => ensureLoaded(next), 120);
      setTimeout(() => ensureLoaded(prev), 180);
    });

    setTimeout(() => {
      const saveData = !!navigator.connection?.saveData;
      if (saveData) return;

      const idle = (cb) => {
        if ("requestIdleCallback" in window) window.requestIdleCallback(cb, { timeout: 1500 });
        else setTimeout(cb, 600);
      };

      const nextLazy = () =>
        Array.from(track.querySelectorAll(".wide-carousel__slide")).find((s) => s.dataset?.bg);

      const step = () => {
        const s = nextLazy();
        if (!s) return;
        ensureLoaded(s);
        idle(step);
      };

      idle(step);
    }, 900);
  }

  async function existingUrlsForYear(folder, year, exts, suffixes) {
    const urls = [];

    for (const suffix of suffixes || [""]) {
      for (const ext of exts) {
        const url = `${folder}${year}${suffix}${ext}`;
        if (await urlExists(url)) {
          urls.push(url);
          break;
        }
      }
    }

    return urls;
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

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
