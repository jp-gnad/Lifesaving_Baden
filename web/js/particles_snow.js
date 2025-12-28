(() => {
  // Respektiere OS-Einstellung "Bewegungen reduzieren"
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion) return;

  // --- Datum / Modus ---
  const now = new Date(); // lokale Zeit des Nutzers
  const m = now.getMonth(); // 0=Jan ... 11=Dez
  const d = now.getDate();

  const isFireworksDay = (m === 11 && d === 31) || (m === 0 && d === 1); // 31.12 oder 01.01
  const isSnowSeason = (m === 11 || m === 0 || m === 1); // Dez/Jan/Feb

  if (!isSnowSeason) return;

  const MODE = isFireworksDay ? "fireworks" : "snow";

  // --- Canvas Setup ---
  const CANVAS_ID = "snow-canvas";

  function createCanvas() {
    let c = document.getElementById(CANVAS_ID);
    if (c) return c;

    c = document.createElement("canvas");
    c.id = CANVAS_ID;
    c.setAttribute("aria-hidden", "true");
    c.style.position = "fixed";
    c.style.left = "0";
    c.style.top = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.pointerEvents = "none";
    c.style.zIndex = "9999";
    c.style.opacity = MODE === "fireworks" ? "0.85" : "0.9"; // insgesamt dezent
    document.body.appendChild(c);
    return c;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function init() {
    const canvas = createCanvas();
    const ctx = canvas.getContext("2d", { alpha: true });

    let w = 0, h = 0, dpr = 1;
    let rafId = null;

    // -------------------------
    // 1) SCHNEE (Dez/Jan/Feb)
    // -------------------------
    let flakes = [];

    function targetFlakeCount(viewW) {
      return clamp(Math.round(viewW / 22), 28, 95);
    }

    function makeFlake(randomY = false) {
      // Größe: hier kannst du größer/kleiner machen
      const r = rand(2.2, 5.2); // <- deine "größer"-Einstellung
      const speed = rand(0.6, 1.6);
      const drift = rand(-0.25, 0.25);
      const alpha = rand(0.18, 0.55);

      return {
        x: rand(0, w),
        y: randomY ? rand(0, h) : rand(-h * 0.2, -10),
        r,
        speed,
        drift,
        phase: rand(0, Math.PI * 2),
        alpha
      };
    }

    let snowT = 0;

    function stepSnow() {
      snowT += 0.008;
      const wind = Math.sin(snowT) * 0.25;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];

        f.y += f.speed;
        f.x += f.drift + wind * 0.25;

        f.phase += 0.01;
        f.x += Math.sin(f.phase) * 0.08;

        if (f.y > h + 10) {
          flakes[i] = makeFlake(false);
          flakes[i].y = -10;
        }
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${f.alpha})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(stepSnow);
    }

    // -------------------------
    // 2) FEUERWERK (31.12 / 01.01)
    // -------------------------
    let sparks = [];
    let nextBurstAt = 0;

    function scheduleNextBurst(ts) {
      nextBurstAt = ts + rand(650, 1300); // häufiger
    }

    function spawnBurst() {
      const x = rand(w * 0.10, w * 0.90);
      const y = rand(h * 0.10, h * 0.60);

      const hue = rand(0, 360);
      const count = Math.round(rand(40, 80)); // mehr Partikel

      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(0.9, 3.6); // größere Ausbreitung
        sparks.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: rand(1.4, 3.0),
          hue,
          alpha: rand(0.20, 0.55),
          life: Math.round(rand(55, 105))
        });
      }


      // Hard cap (Performance)
      if (sparks.length > 1600) sparks = sparks.slice(sparks.length - 1600);
    }

    function stepFireworks(ts) {
      if (!nextBurstAt) scheduleNextBurst(ts);
      if (ts >= nextBurstAt) {
        const bursts = Math.round(rand(1, 3)); // 1–3 Explosionen gleichzeitig
        for (let i = 0; i < bursts; i++) spawnBurst();
        scheduleNextBurst(ts);
      }

      ctx.clearRect(0, 0, w, h);

      // Physik: minimaler "Fall" + sehr leichte Dämpfung
      const gravity = 0.012;

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];

        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + gravity;

        p.x += p.vx;
        p.y += p.vy;

        p.life -= 1;
        p.alpha *= 0.985;

        // Zeichnen (HSL => bunte Punkte)
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Entfernen
        if (
          p.life <= 0 ||
          p.alpha < 0.02 ||
          p.x < -20 || p.x > w + 20 ||
          p.y < -20 || p.y > h + 20
        ) {
          sparks.splice(i, 1);
        }
      }

      rafId = requestAnimationFrame(stepFireworks);
    }

    // --- Resize ---
    function resize() {
      dpr = window.devicePixelRatio || 1;
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (MODE === "snow") {
        const desired = targetFlakeCount(w);
        if (flakes.length > desired) flakes = flakes.slice(0, desired);
        while (flakes.length < desired) flakes.push(makeFlake(true));
      }
    }

    // --- Start ---
    resize();
    window.addEventListener("resize", resize, { passive: true });

    rafId = requestAnimationFrame(MODE === "fireworks" ? stepFireworks : stepSnow);

    // Akku sparen, wenn Tab nicht sichtbar
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        rafId = requestAnimationFrame(MODE === "fireworks" ? stepFireworks : stepSnow);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
