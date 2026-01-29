const WIDE_SLIDES = [
  {
    title: "Rettungssport",
    text: "Willkommen auf der inoffiziellen Internetseite des Lifesaving Team Badens. Hier findest du nützliche Informationen rund um den Rettungssport in Baden.",
    img: "./png/hintergrund1.JPG",
    bgY: "50%",
  },
  {
    title: "Kalender",
    text: "Aktueller Jahresplan vom Landeskader Baden",
    img: "./png/karussel/bild3.jpg",
    cta: { label: "Mehr Infos!", href: "./kalender.html" },
    bgY: "50%",
  },
  {
    title: "Infoschreiben",
    text: "Aktuelles Jahres Infoschreiben vom Landeskader Baden",
    img: "./png/karussel/bild5.JPG",
    cta: { label: "Mehr Infos!", href: "./info.html" },
    bgY: "50%",
  },
  {
    title: "Dopingprävention",
    text: "Auch in der DLRG wird Leistungssport betrieben und obwohl die Rettungssportler ihren Sport als Amateure ausüben, unterliegen sie den Anti-Doping-Regeln der NADA (Nationale Antidoping Agentur) und der WADA (Welt Antidoping Agentur).",
    img: "./png/karussel/bild4.jpg",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/kader/dopingpraevention/",
    },
    bgY: "50%",
  },
  {
    title: "Lifesaving World Championships",
    text: "Die LWC finden 2026 vom 25. Nov bis 13. Dec in Port Elizabeth / Südafrika statt. Du hast Interesse aber keine Ahnung wie das Abläuft? Frag bei uns nach! Wir versuchen zusammen als Baden etwas zu organisieren.",
    img: "./png/karussel/bild6.JPG",
    cta: { label: "Mehr Infos!", href: "https://lifesaving2026.com/" },
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
          ${WIDE_SLIDES.map(
            (s, i) => `
            <article class="wide-carousel__slide ${i === 0 ? "wide-carousel__slide--center" : ""}"
              style="background-image:url('${s.img}'); --bg-y:${s.bgY ?? "50%"};"
              role="group" aria-roledescription="Folie"
              aria-label="${i + 1} von ${WIDE_SLIDES.length}">
              <div class="wide-carousel__content">
                <h2>${s.title}</h2>
                <p>${s.text}</p>
                ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${s.cta.label}</a>` : ``}
              </div>
            </article>
          `
          ).join("")}
        </div>

        <!-- NEU: unsichtbare Vor/Zurück-Klickbereiche (volle Höhe links/rechts) -->
        <button class="wide-carousel__nav wide-carousel__nav--prev" type="button" aria-label="Vorherige Folie"></button>
        <button class="wide-carousel__nav wide-carousel__nav--next" type="button" aria-label="Nächste Folie"></button>

        <div class="wide-carousel__dots" role="tablist" aria-label="Folie auswählen">
          ${WIDE_SLIDES.map(
            (_, i) => `
            <button class="wide-carousel__dot" type="button" role="tab"
                    aria-label="Folie ${i + 1}"
                    aria-selected="${i === 0 ? "true" : "false"}"
                    data-slide="${i}">
            </button>
          `
          ).join("")}
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

  const track = root.querySelector(".wide-carousel__slides");
  const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
  const dots = Array.from(root.querySelectorAll(".wide-carousel__dot"));
  const count = dots.length;

  const prevBtn = root.querySelector(".wide-carousel__nav--prev");
  const nextBtn = root.querySelector(".wide-carousel__nav--next");

  let index = 0;
  let autoTimer = null;

  const stopAuto = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    stopAuto();
    autoTimer = setInterval(() => goTo(index + 1), 10000);
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

  const update = () => {
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    dots.forEach((d, i) => {
      const active = i === index;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", active ? "true" : "false");
    });
    fitHeight();
  };

  const goTo = (i) => {
    index = (i + count) % count;
    update();
  };

  // Manuelle Navigation: Timer zurücksetzen (damit nicht direkt wieder auto-wechsel kommt)
  const manualGo = (dir) => {
    goTo(index + dir);
    startAuto();
  };

  // Dots-Klick
  root.querySelector(".wide-carousel__dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".wide-carousel__dot");
    if (!btn) return;
    const i = Number(btn.dataset.slide);
    if (!Number.isFinite(i)) return;
    goTo(i);
    startAuto();
  });

    // --- NEU: Swipe (Touch) links/rechts auf Mobile ---
  let startX = 0;
  let startY = 0;
  let touching = false;

  const swipeThresholdPx = () => Math.max(50, Math.round(root.clientWidth * 0.15));

  const onTouchStart = (x, y) => {
    touching = true;
    startX = x;
    startY = y;
    stopAuto(); // beim Wischen Autoplay pausieren
  };

  const onTouchEnd = (x, y) => {
    if (!touching) return;
    touching = false;

    const dx = x - startX;
    const dy = y - startY;

    // nur als Swipe werten, wenn klar horizontal + genug Strecke
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= swipeThresholdPx()) {
      manualGo(dx < 0 ? +1 : -1); // links wischen => nächste, rechts wischen => vorherige
    } else {
      startAuto(); // kein Swipe => Autoplay normal weiter
    }
  };

  root.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      onTouchStart(t.clientX, t.clientY);
    },
    { passive: true }
  );

  root.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      onTouchEnd(t.clientX, t.clientY);
    },
    { passive: true }
  );

  root.addEventListener(
    "touchcancel",
    () => {
      touching = false;
      startAuto();
    },
    { passive: true }
  );


  // NEU: unsichtbare Vor/Zurück-Klickbereiche
  prevBtn?.addEventListener("click", () => manualGo(-1));
  nextBtn?.addEventListener("click", () => manualGo(+1));

  // Optional: Tastatursteuerung (wenn Carousel fokussiert ist)
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
