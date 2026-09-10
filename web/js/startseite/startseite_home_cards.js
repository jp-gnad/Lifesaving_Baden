(function (global) {
  "use strict";

  function getSnapInset(track) {
    if (global.matchMedia("(max-width: 720px)").matches) return 0;

    const value = parseFloat(
      global.getComputedStyle(track).getPropertyValue("--home-card-snap-inset")
    );
    return Number.isFinite(value) ? value : 0;
  }

  function getCardScrollLeft(track, card) {
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const leftAligned = track.scrollLeft
      + cardRect.left
      - trackRect.left;

    return global.matchMedia("(max-width: 720px)").matches
      ? leftAligned - (track.clientWidth - cardRect.width) / 2
      : leftAligned - getSnapInset(track);
  }

  function jumpToCard(track, card) {
    const previousBehavior = track.style.scrollBehavior;
    const previousSnapType = track.style.scrollSnapType;

    track.style.scrollBehavior = "auto";
    track.style.scrollSnapType = "none";
    track.scrollLeft = getCardScrollLeft(track, card);

    requestAnimationFrame(() => {
      track.style.scrollBehavior = previousBehavior;
      track.style.scrollSnapType = previousSnapType;
    });
  }

  function jumpToInitialCard(track, card) {
    jumpToCard(track, card);
  }

  function getNearestCard(track) {
    const trackRect = track.getBoundingClientRect();
    const isNarrow = global.matchMedia("(max-width: 720px)").matches;
    const anchor = isNarrow
      ? trackRect.left + track.clientWidth / 2
      : trackRect.left + getSnapInset(track);
    const cards = Array.from(track.querySelectorAll(".home-card"));

    return cards.reduce((nearest, card) => {
      const rect = card.getBoundingClientRect();
      const cardAnchor = isNarrow ? rect.left + rect.width / 2 : rect.left;
      const distance = Math.abs(cardAnchor - anchor);
      return !nearest || distance < nearest.distance ? { card, distance } : nearest;
    }, null)?.card || null;
  }

  function createBufferedCard(card, index) {
    const clone = card.cloneNode(true);
    clone.dataset.homeCardIndex = String(index);
    clone.dataset.homeCardBuffer = "true";
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    return clone;
  }

  function init(root = document.querySelector(".home-cards")) {
    if (!root || root.dataset.homeCardsCarousel === "true") return;

    const cards = Array.from(root.querySelectorAll(".home-card"));
    if (cards.length < 2) return;

    cards.forEach((card, index) => {
      card.dataset.homeCardIndex = String(index);
    });
    cards[0].dataset.homeCardFirst = "true";

    const beforeCards = cards.map(createBufferedCard);
    const afterCards = cards.map(createBufferedCard);
    const beforeFragment = document.createDocumentFragment();
    const afterFragment = document.createDocumentFragment();
    beforeCards.forEach((card) => beforeFragment.append(card));
    afterCards.forEach((card) => afterFragment.append(card));
    root.prepend(beforeFragment);
    root.append(afterFragment);

    root.dataset.homeCardsCarousel = "true";
    root.classList.add("is-initial");

    let resizeTimer = 0;
    let scrollTimer = 0;
    let touchEffectTimer = 0;
    let activePointerId = null;
    let pointerId = null;
    let pointerStartX = 0;
    let pointerStartScroll = 0;
    let isDragging = false;
    let isLoopJumping = false;
    let suppressClick = false;

    function getLoopWidth() {
      return afterCards[0].offsetLeft - cards[0].offsetLeft;
    }

    function shiftLoop(delta) {
      if (!Number.isFinite(delta) || Math.abs(delta) < 1) return;

      const previousBehavior = root.style.scrollBehavior;
      const previousSnapType = root.style.scrollSnapType;
      isLoopJumping = true;
      root.style.scrollBehavior = "auto";
      root.style.scrollSnapType = "none";
      root.scrollLeft += delta;
      if (pointerId !== null) pointerStartScroll += delta;

      requestAnimationFrame(() => {
        root.style.scrollBehavior = previousBehavior;
        root.style.scrollSnapType = previousSnapType;
        isLoopJumping = false;
      });
    }

    function keepInsideBuffer() {
      if (
        isLoopJumping
        || activePointerId !== null
        || root.classList.contains("is-initial")
      ) return;

      const loopWidth = getLoopWidth();
      if (loopWidth <= 0) return;

      const middle = getCardScrollLeft(root, cards[0]);
      const threshold = loopWidth * 0.9;

      if (root.scrollLeft < middle - threshold) {
        shiftLoop(loopWidth);
      } else if (root.scrollLeft > middle + threshold) {
        shiftLoop(-loopWidth);
      }
    }

    function handleResize() {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(() => {
        if (root.classList.contains("is-initial")) {
          jumpToInitialCard(root, cards[0]);
          return;
        }

        const nearest = getNearestCard(root);
        const index = Number(nearest?.dataset.homeCardIndex);
        jumpToCard(root, cards[Number.isFinite(index) ? index : 0]);
      }, 120);
    }

    function handleScroll() {
      global.clearTimeout(scrollTimer);
      scrollTimer = global.setTimeout(keepInsideBuffer, 140);
    }

    function activateCarousel() {
      root.classList.remove("is-initial");
    }

    function handlePointerDown(event) {
      activateCarousel();
      activePointerId = event.pointerId;

      if (event.pointerType !== "mouse") {
        global.clearTimeout(touchEffectTimer);
        root.classList.add("is-touch-input");
        return;
      }

      root.classList.remove("is-touch-input");
      if (event.button !== 0) return;

      pointerId = event.pointerId;
      pointerStartX = event.clientX;
      pointerStartScroll = root.scrollLeft;
      isDragging = false;
    }

    function handlePointerMove(event) {
      if (event.pointerId !== pointerId) return;
      const distance = event.clientX - pointerStartX;
      if (!isDragging && Math.abs(distance) < 6) return;

      if (!isDragging) {
        isDragging = true;
        root.classList.add("is-dragging");
        root.style.scrollBehavior = "auto";
        root.style.scrollSnapType = "none";
        root.setPointerCapture?.(pointerId);
      }

      root.scrollLeft = pointerStartScroll - distance;
      event.preventDefault();
    }

    function handlePointerEnd(event) {
      if (event.pointerId === activePointerId) activePointerId = null;

      if (event.pointerType !== "mouse") {
        global.clearTimeout(touchEffectTimer);
        touchEffectTimer = global.setTimeout(() => {
          root.classList.remove("is-touch-input");
        }, 800);
      }

      if (event.pointerId !== pointerId) return;

      if (isDragging) {
        root.releasePointerCapture?.(pointerId);
        root.classList.remove("is-dragging");
        root.style.scrollBehavior = "";
        root.style.scrollSnapType = "";

        const nearest = getNearestCard(root);
        if (nearest) {
          root.scrollTo({
            left: getCardScrollLeft(root, nearest),
            behavior: global.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          });
        }

        suppressClick = true;
        global.setTimeout(() => {
          suppressClick = false;
          keepInsideBuffer();
        }, 420);
      }

      pointerId = null;
      isDragging = false;
    }

    function handleClick(event) {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }

    root.addEventListener("scroll", handleScroll, { passive: true });
    root.addEventListener("scrollend", keepInsideBuffer);
    root.addEventListener("pointerdown", handlePointerDown);
    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerup", handlePointerEnd);
    root.addEventListener("pointercancel", handlePointerEnd);
    root.addEventListener("wheel", activateCarousel, { passive: true, once: true });
    root.addEventListener("keydown", activateCarousel, { once: true });
    root.addEventListener("click", handleClick, true);
    global.addEventListener("resize", handleResize, { passive: true });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => jumpToInitialCard(root, cards[0]));
    });
  }

  global.StartseiteHomeCards = { init };
})(window);
