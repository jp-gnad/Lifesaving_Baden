(function (global) {
  const StartseiteCarousel = {};

  StartseiteCarousel.init = function init(root = document.querySelector("[data-wide-carousel]")) {
    if (!root) return;

    const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
    const dots = Array.from(root.querySelectorAll(".wide-carousel__dot"));
    const prevBtn = root.querySelector(".wide-carousel__nav--prev");
    const nextBtn = root.querySelector(".wide-carousel__nav--next");
    const count = slides.length;

    let index = 0;
    let autoTimer = null;
    let videoTimer = null;
    let resizeTimer = null;
    let startX = 0;
    let startY = 0;
    let touching = false;

    const videoReady = new WeakMap();
    const videoBound = new WeakSet();

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

    const startAuto = () => {
      scheduleAuto();
    };

    const readPxVar = (name, fallback) => {
      const value = getComputedStyle(root).getPropertyValue(name).trim();
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : fallback;
    };

    const fitHeight = () => {
      const active = slides[index];
      if (!active) return;

      const content = active.querySelector(".wide-carousel__content");
      if (!content) return;

      requestAnimationFrame(() => {
        const minHeight = readPxVar("--wide-min-h", 260);
        const maxHeight = readPxVar("--wide-max-h", 560);
        const desired = content.scrollHeight;
        const nextHeight = Math.max(minHeight, Math.min(maxHeight, desired));
        root.style.height = `${nextHeight}px`;
      });
    };

    const prepareVideo = (slideEl) => {
      const video = slideEl.querySelector(".wide-carousel__video video");
      if (!video) return null;

      video.muted = true;
      video.loop = false;
      video.playsInline = true;

      if (!videoBound.has(video)) {
        video.addEventListener("ended", () => {
          if (!slideEl.classList.contains("is-active")) return;
          stopAuto();
          setTimeout(() => {
            if (!slideEl.classList.contains("is-active")) return;
            goTo(index + 1);
            scheduleAuto();
          }, 2000);
        });
        videoBound.add(video);
      }

      if (!videoReady.has(video)) {
        const readyPromise = new Promise((resolve) => {
          const ok = () => resolve(true);
          const bad = () => resolve(false);
          video.addEventListener("loadeddata", ok, { once: true });
          video.addEventListener("canplay", ok, { once: true });
          video.addEventListener("error", bad, { once: true });
          try { video.load(); } catch {}
        });
        videoReady.set(video, readyPromise);
      }

      return video;
    };

    const stopNonActiveVideos = (activeIndex) => {
      slides.forEach((slide, slideIndex) => {
        if (slideIndex === activeIndex) return;

        slide.classList.remove("is-video-on");
        const video = slide.querySelector(".wide-carousel__video video");
        if (!video) return;

        try { video.pause(); } catch {}
        try { video.currentTime = 0; } catch {}
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
      const video = prepareVideo(active);
      if (!video) return;

      videoTimer = setTimeout(async () => {
        active.classList.add("is-video-on");

        const ready = videoReady.get(video);
        if (ready) await ready;

        try { video.currentTime = 0; } catch {}
        try { await video.play(); } catch {}
      }, delay);
    };

    const update = () => {
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });

      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", active ? "true" : "false");
      });

      fitHeight();
      startVideoForActive();
      scheduleAuto();
    };

    const goTo = (nextIndex) => {
      index = (nextIndex + count) % count;
      update();
    };

    const manualGo = (direction) => {
      goTo(index + direction);
      startAuto();
    };

    root.querySelector(".wide-carousel__dots")?.addEventListener("click", (event) => {
      const btn = event.target.closest(".wide-carousel__dot");
      if (!btn) return;

      const nextIndex = Number(btn.dataset.slide);
      if (!Number.isFinite(nextIndex)) return;

      goTo(nextIndex);
      startAuto();
    });

    prevBtn?.addEventListener("click", () => manualGo(-1));
    nextBtn?.addEventListener("click", () => manualGo(+1));

    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        manualGo(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        manualGo(+1);
      }
    });

    const swipeThresholdPx = () => Math.max(50, Math.round(root.clientWidth * 0.15));

    root.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      touching = true;
      startX = touch.clientX;
      startY = touch.clientY;
      stopAuto();
    }, { passive: true });

    root.addEventListener("touchend", (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch || !touching) return;

      touching = false;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

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

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitHeight, 80);
    });

    root.addEventListener("mouseleave", scheduleAuto);
    root.addEventListener("focusout", scheduleAuto);
    root.addEventListener("mouseenter", stopAuto);
    root.addEventListener("focusin", stopAuto);

    update();
  };

  global.StartseiteCarousel = StartseiteCarousel;
})(window);
