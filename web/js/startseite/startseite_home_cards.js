(function (global) {
  "use strict";

  function getCenteredScrollLeft(track, card) {
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    return track.scrollLeft
      + cardRect.left
      - trackRect.left
      - (track.clientWidth - cardRect.width) / 2;
  }

  function jumpToCard(track, card) {
    const previousBehavior = track.style.scrollBehavior;
    const previousSnapType = track.style.scrollSnapType;

    track.style.scrollBehavior = "auto";
    track.style.scrollSnapType = "none";
    track.scrollLeft = getCenteredScrollLeft(track, card);

    requestAnimationFrame(() => {
      track.style.scrollBehavior = previousBehavior;
      track.style.scrollSnapType = previousSnapType;
    });
  }

  function jumpToInitialCard(track, card) {
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const previousBehavior = track.style.scrollBehavior;
    const previousSnapType = track.style.scrollSnapType;

    track.style.scrollBehavior = "auto";
    track.style.scrollSnapType = "none";
    track.scrollLeft += cardRect.left - trackRect.left;

    requestAnimationFrame(() => {
      track.style.scrollBehavior = previousBehavior;
      track.style.scrollSnapType = previousSnapType;
    });
  }

  function getNearestCard(track) {
    const center = track.getBoundingClientRect().left + track.clientWidth / 2;
    const cards = Array.from(track.querySelectorAll(".home-card"));

    return cards.reduce((nearest, card) => {
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      return !nearest || distance < nearest.distance ? { card, distance } : nearest;
    }, null)?.card || null;
  }

  function init(root = document.querySelector(".home-cards")) {
    if (!root || root.dataset.homeCardsCarousel === "true") return;

    const cards = Array.from(root.querySelectorAll(".home-card"));
    if (cards.length < 2) return;

    cards.forEach((card, index) => {
      card.dataset.homeCardIndex = String(index);
      card.querySelectorAll("img").forEach((image) => {
        image.loading = "eager";
        image.decoding = "async";
      });
    });

    cards[0].dataset.homeCardFirst = "true";
    root.dataset.homeCardsCarousel = "true";
    root.classList.add("is-initial");

    const cardCount = cards.length;
    let currentIndex = 0;
    let scrollTimer = 0;
    let resizeTimer = 0;
    let pointerId = null;
    let pointerStartX = 0;
    let pointerStartScroll = 0;
    let isDragging = false;
    let isReordering = false;
    let suppressClick = false;

    function normalizedIndex(index) {
      return (index + cardCount) % cardCount;
    }

    function appendOrder(order) {
      const fragment = document.createDocumentFragment();
      order.forEach((index) => fragment.append(cards[normalizedIndex(index)]));
      root.append(fragment);
    }

    function arrangeAround(index) {
      currentIndex = normalizedIndex(index);
      appendOrder([
        currentIndex - 2,
        currentIndex - 1,
        currentIndex,
        currentIndex + 1,
        currentIndex + 2,
      ]);
      jumpToCard(root, cards[currentIndex]);
    }

    function arrangeInitialOrder() {
      appendOrder([
        cardCount - 1,
        ...Array.from({ length: cardCount - 1 }, (_, index) => index),
      ]);
      jumpToInitialCard(root, cards[0]);
    }

    function normalizeLoopPosition() {
      if (isDragging || isReordering || root.classList.contains("is-initial")) return;

      const nearest = getNearestCard(root);
      if (!nearest) return;

      const nearestIndex = Number(nearest.dataset.homeCardIndex);
      const targetLeft = getCenteredScrollLeft(root, nearest);
      if (nearestIndex === currentIndex && Math.abs(root.scrollLeft - targetLeft) < 1) return;

      isReordering = true;
      arrangeAround(nearestIndex);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isReordering = false;
        });
      });
    }

    function handleScroll() {
      global.clearTimeout(scrollTimer);
      scrollTimer = global.setTimeout(normalizeLoopPosition, 140);
    }

    function handleResize() {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(() => {
        if (root.classList.contains("is-initial")) {
          arrangeInitialOrder();
        } else {
          arrangeAround(currentIndex);
        }
      }, 120);
    }

    function activateCarousel() {
      root.classList.remove("is-initial");
    }

    function handlePointerDown(event) {
      activateCarousel();
      if (event.pointerType !== "mouse" || event.button !== 0) return;
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
      if (event.pointerId !== pointerId) return;

      if (isDragging) {
        root.releasePointerCapture?.(pointerId);
        root.classList.remove("is-dragging");
        root.style.scrollBehavior = "";
        root.style.scrollSnapType = "";

        const nearest = getNearestCard(root);
        if (nearest) {
          root.scrollTo({
            left: getCenteredScrollLeft(root, nearest),
            behavior: global.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          });
        }

        suppressClick = true;
        global.setTimeout(() => {
          suppressClick = false;
          normalizeLoopPosition();
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
    root.addEventListener("scrollend", normalizeLoopPosition);
    root.addEventListener("pointerdown", handlePointerDown);
    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerup", handlePointerEnd);
    root.addEventListener("pointercancel", handlePointerEnd);
    root.addEventListener("wheel", activateCarousel, { passive: true, once: true });
    root.addEventListener("keydown", activateCarousel, { once: true });
    root.addEventListener("click", handleClick, true);
    global.addEventListener("resize", handleResize, { passive: true });

    requestAnimationFrame(() => {
      requestAnimationFrame(arrangeInitialOrder);
    });
  }

  global.StartseiteHomeCards = { init };
})(window);
