const WIDE_SLIDES = [
  {
    title: "Willkommen beim Lifesaving Team Baden",
    meta: "DLRG ・ Landeskader Baden ・ Leistungssport",
    text: "Willkommen auf der inoffiziellen Internetseite des Lifesaving Team Badens. Hier findest du nützliche Informationen rund um den Rettungssport in Baden.",
    icon: { src: "./png/icons/Baden2.png", href: "https://baden.dlrg.de/mitmachen/rettungssport/", alt: "DLRG Rettungssport" },
    img: "./png/hintergrund1.JPG",
    bgY: "50%",
  },
  {
    title: "Kalender",
    meta: "DLRG ・ Wettkämpfe ・ Landeskader ・ Bundeskader",
    text: "Aktueller Jahresplan vom Landeskader Baden",
    img: "./png/karussel/bild3.jpg",
    cta: { label: "Mehr Informationen", href: "./kalender.html" },
    bgY: "50%",
  },
  {
    title: "Infoschreiben",
    meta: "DLRG ・ Neuigkeiten ・ Landeskader ・ Rettungssport",
    text: "Aktuelles Jahres Infoschreiben vom Landeskader Baden",
    img: "./png/karussel/bild5.JPG",
    cta: { label: "Mehr Informationen", href: "./info.html" },
    bgY: "50%",
  },
  {
    title: "Dopingprävention",
    meta: "NADA ・ WADA ・ Sport ・ Sicher & Sauber",
    text: "Auch in der DLRG wird Leistungssport betrieben und obwohl die Rettungssportler ihren Sport als Amateure ausüben, unterliegen sie den Anti-Doping-Regeln der NADA (Nationale Antidoping Agentur) und der WADA (Welt Antidoping Agentur).",
    img: "./png/karussel/bild4.jpg",
    icon: { src: "./png/icons/nada.png", href: "https://lifesaving2026.com/", alt: "DLRG Rettungssport" },
    cta: {
      label: "Mehr Informationen",
      href: "https://www.dlrg.de/mitmachen/rettungssport/kader/dopingpraevention/",
    },
    bgY: "50%",
  },
  {
    title: "Lifesaving World Championships",
    meta: "ILS ・ Weltmeisterschaft ・ Lifesaving Sport ・ 2026",
    text: "Die LWC finden 2026 vom 25. Nov bis 13. Dec in Port Elizabeth / Südafrika statt. Das größte Highlight im Jahr. Auch du kannst mitmachen!",
    img: "./png/karussel/bild6.JPG",
    video: {
      src: "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/MP4/LWC_2024.mp4",
      delayMs: 2000,
    },
    icon: { src: "./svg/events/LWC_big - 2026.svg", href: "https://lifesaving2026.com/", alt: "DLRG Rettungssport" },
    cta: { label: "Mehr Informationen", href: "https://lifesaving2026.com/" },
    bgY: "35%",
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="wide-carousel" aria-label="Highlights">
      <div class="wide-carousel__viewport" data-wide-carousel>
        <div class="wide-carousel__slides">
          ${WIDE_SLIDES.map((s, i) => `
            <article
              class="wide-carousel__slide ${i === 0 ? "wide-carousel__slide--center is-active" : ""}"
              style="background-image:url('${s.img}'); --bg-y:${s.bgY ?? "50%"};"
              role="group"
              aria-roledescription="Folie"
              aria-label="${i + 1} von ${WIDE_SLIDES.length}"
              aria-hidden="${i === 0 ? "false" : "true"}"
              data-has-video="${s.video ? "1" : "0"}"
              data-video-delay="${s.video?.delayMs ?? 2000}"
            >
              ${s.video ? `
                <div class="wide-carousel__video" aria-hidden="true">
                  <video muted playsinline preload="auto" crossorigin="anonymous">
                    <source src="${s.video.src}" type="video/mp4">
                  </video>
                </div>
              ` : ``}

              <div class="wide-carousel__content">
                ${s.icon ? `
                  <a class="wide-carousel__iconlink" href="${s.icon.href}" aria-label="${s.icon.alt ?? s.title}">
                    <img class="wide-carousel__icon" src="${s.icon.src}" alt="${s.icon.alt ?? ""}" loading="lazy" decoding="async">
                  </a>
                ` : ``}

                <h2>${s.title}</h2>

                ${s.meta ? `<div class="wide-carousel__meta">${s.meta}</div>` : ``}

                <p>${s.text}</p>

                ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${s.cta.label}</a>` : ``}
              </div>
            </article>
          `).join("")}
        </div>

        <button class="wide-carousel__nav wide-carousel__nav--prev" type="button" aria-label="Vorherige Folie"></button>
        <button class="wide-carousel__nav wide-carousel__nav--next" type="button" aria-label="Nächste Folie"></button>

        <div class="wide-carousel__dots" role="tablist" aria-label="Folie auswählen">
          ${WIDE_SLIDES.map((_, i) => `
            <button class="wide-carousel__dot ${i === 0 ? "is-active" : ""}" type="button" role="tab"
                    aria-label="Folie ${i + 1}"
                    aria-selected="${i === 0 ? "true" : "false"}"
                    data-slide="${i}">
            </button>
          `).join("")}
        </div>
      </div>
    </section>

    <section class="intro">
      <div class="container">
        <h2>Willkommen beim Lifesaving Team Baden</h2>
      </div>
    </section>

    <section class="home-links" aria-label="Athletenprofile">
      <div class="container">
        <div class="home-cards">

          <a class="home-card" href="./athleten.html" aria-label="Dein Athletenprofil">
            <img class="home-card__img" src="./png/hintergrund4.JPG" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Dein Athletenprofil</div>
              <div class="home-card__box home-card__box--main">Infos aus Wettkämpfen</div>
              <div class="home-card__box home-card__box--more">
                Bestzeiten, Informationen und deine Entwicklung – kompakt auf einen Blick.
              </div>
            </div>
          </a>

          <a class="home-card" href="./punkterechner.html" aria-label="DLRG Punkterechner">
            <img class="home-card__img" src="./png/hintergrund5.JPG" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">DLRG Punkterechner</div>
              <div class="home-card__box home-card__box--main">National und internationale Punkte</div>
              <div class="home-card__box home-card__box--more">
                Errechne dir deine Punkte aus Zeiten – national (deutscher Rekord) oder international (Weltrekord).
              </div>
            </div>
          </a>

          <a class="home-card" href="./nominierung.html" aria-label="Wettkämpfe und Nominierung">
            <img class="home-card__img" src="./png/karussel/bild2.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Wettkämpfe &amp; Nominierung</div>
              <div class="home-card__box home-card__box--main">Aktuelle Nominierungslisten und Richtlinien</div>
              <div class="home-card__box home-card__box--more">
                Niminierungsrichtlinien & Listen für DP, JRP, BP, sowie Pflichtzeiten für die DEM.
              </div>
            </div>
          </a>

          <a class="home-card" href="./landeskader.html" aria-label="Landeskader">
            <img class="home-card__img" src="./png/hintergrund2.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Landeskader</div>
              <div class="home-card__box home-card__box--main">Der Landeskader auf einen Blick</div>
              <div class="home-card__box home-card__box--more">
                Liste aktueller Landeskaderathleten, Kriterien und Prüfung deines Status.
              </div>
            </div>
          </a>

          <a class="home-card" href="./rekorde.html" aria-label="Rekorde und Bestenlisten">
            <img class="home-card__img" src="./png/hintergrund3.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Rekorde &amp; Bestenlisten</div>
              <div class="home-card__box home-card__box--main">Landesverbände, Bezirke und Ortsgruppen</div>
              <div class="home-card__box home-card__box--more">
                Analysen und Bestenlisten für deine Gliederungen – individuell erstellbar.
              </div>
            </div>
          </a>

        </div>
      </div>
    </section>
  `;

  initWideCarousel();
});

function initWideCarousel() {
  const root = document.querySelector("[data-wide-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
  const dots = Array.from(root.querySelectorAll(".wide-carousel__dot"));
  const prevBtn = root.querySelector(".wide-carousel__nav--prev");
  const nextBtn = root.querySelector(".wide-carousel__nav--next");
  const count = slides.length;

  let index = 0;
  let autoTimer = null;
  let videoTimer = null;

  const videoReady = new WeakMap();

  const stopAuto = () => {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
  };

  const scheduleAuto = () => {
    stopAuto();
    const active = slides[index];
    if (active && active.dataset.hasVideo === "1") return;
    autoTimer = setTimeout(() => goTo(index + 1), 10000);
  };

  const readPxVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : fallback;
  };

  const fitHeight = () => {
    const active = slides[index];
    if (!active) return;
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

  const videoBound = new WeakSet();

  const prepareVideo = (slideEl) => {
    const v = slideEl.querySelector(".wide-carousel__video video");
    if (!v) return null;

    v.muted = true;
    v.loop = false;
    v.playsInline = true;

    if (!videoBound.has(v)) {
      v.addEventListener("ended", () => {
        if (!slideEl.classList.contains("is-active")) return;
        stopAuto();
        setTimeout(() => {
          if (!slideEl.classList.contains("is-active")) return;
          goTo(index + 1);
          scheduleAuto();
        }, 2000);
      });
      videoBound.add(v);
    }

    if (!videoReady.has(v)) {
      const p = new Promise((resolve) => {
        const ok = () => resolve(true);
        const bad = () => resolve(false);
        v.addEventListener("loadeddata", ok, { once: true });
        v.addEventListener("canplay", ok, { once: true });
        v.addEventListener("error", bad, { once: true });
        try { v.load(); } catch {}
      });
      videoReady.set(v, p);
    }

    return v;
  };


  const stopNonActiveVideos = (activeIdx) => {
    slides.forEach((s, i) => {
      if (i === activeIdx) return;
      s.classList.remove("is-video-on");
      const v = s.querySelector(".wide-carousel__video video");
      if (!v) return;
      try { v.pause(); } catch {}
      try { v.currentTime = 0; } catch {}
    });
  };

  const startVideoForActive = () => {
    if (videoTimer) clearTimeout(videoTimer);

    const active = slides[index];
    if (!active) return;

    stopNonActiveVideos(index);

    if (active.dataset.hasVideo !== "1") return;

    stopAuto();

    const delay = parseInt(active.dataset.videoDelay || "2000", 10) || 2000;
    const v = prepareVideo(active);
    if (!v) return;

    videoTimer = setTimeout(async () => {
      active.classList.add("is-video-on");

      const ready = videoReady.get(v);
      if (ready) await ready;

      try { v.currentTime = 0; } catch {}
      try { await v.play(); } catch {}
    }, delay);
  };


  const update = () => {
    slides.forEach((s, i) => {
      const active = i === index;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", active ? "false" : "true");
    });

    dots.forEach((d, i) => {
      const active = i === index;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", active ? "true" : "false");
    });

    fitHeight();
    startVideoForActive();
    scheduleAuto();
  };


  const goTo = (i) => {
    index = (i + count) % count;
    update();
  };

  const manualGo = (dir) => {
    goTo(index + dir);
    startAuto();
  };

  root.querySelector(".wide-carousel__dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".wide-carousel__dot");
    if (!btn) return;
    const i = Number(btn.dataset.slide);
    if (!Number.isFinite(i)) return;
    goTo(i);
    startAuto();
  });

  prevBtn?.addEventListener("click", () => manualGo(-1));
  nextBtn?.addEventListener("click", () => manualGo(+1));

  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      manualGo(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      manualGo(+1);
    }
  });

  let startX = 0;
  let startY = 0;
  let touching = false;

  const swipeThresholdPx = () => Math.max(50, Math.round(root.clientWidth * 0.15));

  root.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touching = true;
    startX = t.clientX;
    startY = t.clientY;
    stopAuto();
  }, { passive: true });

  root.addEventListener("touchend", (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t || !touching) return;
    touching = false;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= swipeThresholdPx()) {
      manualGo(dx < 0 ? +1 : -1);
    } else {
      startAuto();
    }
  }, { passive: true });

  root.addEventListener("touchcancel", () => {
    touching = false;
    startAuto();
  }, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeight, 80);
  });

  root.addEventListener("mouseleave", scheduleAuto);
  root.addEventListener("focusout", scheduleAuto);
  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("focusin", stopAuto);

  update();
}
