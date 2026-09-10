(() => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;

  const baseContent = viewport.content
    .replace(/\s*,?\s*viewport-fit\s*=\s*(?:auto|contain|cover)/gi, "")
    .replace(/\s*,\s*,/g, ",")
    .replace(/^\s*,|,\s*$/g, "")
    .trim();
  const landscape = window.matchMedia("(orientation: landscape)");

  const syncViewportFit = () => {
    const content = landscape.matches
      ? `${baseContent}, viewport-fit=cover`
      : baseContent;
    if (viewport.content !== content) viewport.content = content;
  };

  syncViewportFit();
  if (typeof landscape.addEventListener === "function") {
    landscape.addEventListener("change", syncViewportFit);
  } else {
    landscape.addListener(syncViewportFit);
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const headerEl = document.getElementById("site-header");
  if (!headerEl) return;

  const NAV_TREE = [
    { key: "punkterechner", label: "Punkterechner", href: "punkterechner.html" },
    {
      key: "wettkaempfe",
      label: "Wettkämpfe",
      href: "wettkaempfe.html",
      children: [
        { key: "deutschlandpokal", label: "Deutschland Pokal", href: "deutschlandpokal.html" },
        { key: "bodenseepokal", label: "Bodensee Pokal", href: "bodenseepokal.html" },
        { key: "junioren", label: "Junioren Rettungspokal", href: "juniorenrettungspokal.html" },
        { key: "dem", label: "Deutsche Einzelstrecken Meisterschaften", href: "dem.html" },
        { key: "nationalmannschaften", label: "Nationalmannschaften", href: "nationalmannschaft.html" },
      ],
    },
    { key: "clubs", label: "Clubs", href: "clubs.html" },
    {
      key: "kader",
      label: "Kader",
      href: "landeskader.html",
      children: [
        { key: "Live Quallifikationen", label: "Live Quallifikationen", href: "kaderstatus.html" },
        { key: "kaderrichtlinien", label: "Kaderrichtlinien", href: "kriterien.html" },
        { key: "trainingsplaene", label: "Trainingspläne", href: "trainingsplaene.html" },
      ],
    },
    { key: "athleten", label: "Athleten", href: "athleten.html" },
  ];

  const NAV_ICON_PATHS = {
    punkterechner: `
      <rect x="4" y="2" width="16" height="20" rx="2"></rect>
      <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
    `,
    wettkaempfe: `
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"></path>
      <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"></path>
    `,
    clubs: `
      <path d="m3 11 9-7 9 7"></path>
      <path d="M5 10v10h14V10M9 20v-6h6v6"></path>
    `,
    kader: `
      <defs>
        <mask id="nav-kader-elk" x="0" y="3.9" width="24" height="16.2" maskUnits="userSpaceOnUse" style="mask-type:alpha">
          <image href="./assets/png/icons/elch.png" x="0" y="3.9" width="24" height="16.2" preserveAspectRatio="xMidYMid meet"></image>
        </mask>
      </defs>
      <rect class="nav-icon-silhouette" x="0" y="3.9" width="24" height="16.2" mask="url(#nav-kader-elk)"></rect>
    `,
    athleten: `
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 21a8 8 0 0 1 16 0"></path>
    `,
  };

  const BREAKPOINT_PX = 1000;
  const MENU_ANIMATION = {
    rowInStart: 80,
    rowInStagger: 85,
    rowOutDuration: 220,
    rowOutStagger: 85,
    backdropOutDuration: 130,
  };
  const isMobile = () => window.matchMedia(`(max-width:${BREAKPOINT_PX}px)`).matches;
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  headerEl.innerHTML = `
    <div class="hdr-bg">
      <div class="hdr-container">
        <a class="brand" href="startseite.html">
          <img class="brand-logo" src="./assets/svg/logo.svg" alt="" aria-hidden="true">
          <span class="brand-title">Lifesaving <span class="brand-baden">Baden</span></span>
        </a>
        <img class="brand-mascot" src="./assets/png/icons/elch.png" alt="" aria-hidden="true">
      </div>
    </div>

    <div class="hdr-nav-wrap">
      <nav aria-label="Hauptnavigation" class="hdr-nav">
        <button class="menu-toggle" aria-expanded="false" aria-controls="primary-menu" aria-label="Menü öffnen">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path class="menu-icon-bars" d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"></path>
            <path class="menu-icon-close" d="M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z"></path>
          </svg>
        </button>
        <ul id="primary-menu" class="nav"></ul>
      </nav>
    </div>
  `;

  const nav = headerEl.querySelector(".hdr-nav");
  const toggle = headerEl.querySelector(".menu-toggle");
  const menu = headerEl.querySelector("#primary-menu");

  let stack = [];
  let closeAnimationTimer = null;
  let wasMobile = isMobile();

  function normalizeFileName(pathOrHref) {
    if (!pathOrHref) return "";
    const cleaned = String(pathOrHref).split("?")[0].split("#")[0].toLowerCase();
    const parts = cleaned.split("/");
    return parts[parts.length - 1] || "";
  }

  function getCurrentFile() {
    return normalizeFileName(location.pathname);
  }

  function findNodeByKey(items, key) {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.children) {
        const found = findNodeByKey(item.children, key);
        if (found) return found;
      }
    }
    return null;
  }

  function findActiveChain(items, currentFile, chain = []) {
    for (const item of items) {
      const itemFile = normalizeFileName(item.href);
      const nextChain = [...chain, item.key];

      if (itemFile && currentFile && itemFile === currentFile) return nextChain;

      if (item.children) {
        const childHit = findActiveChain(item.children, currentFile, nextChain);
        if (childHit) return childHit;
      }
    }
    return null;
  }

  function renderMobileItemContent(item) {
    const iconPaths = NAV_ICON_PATHS[item.key];
    const icon = iconPaths
      ? `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${iconPaths}</svg></span>`
      : "";

    return `${icon}<span class="nav-label">${item.label}</span>`;
  }

  function prepareMobileRowAnimations() {
    if (!isMobile()) return;

    const rows = Array.from(menu.children);
    rows.forEach((row, index) => {
      row.style.setProperty(
        "--nav-row-in-delay",
        `${MENU_ANIMATION.rowInStart + index * MENU_ANIMATION.rowInStagger}ms`
      );
      row.style.setProperty(
        "--nav-row-out-delay",
        `${(rows.length - index - 1) * MENU_ANIMATION.rowOutStagger}ms`
      );
    });

    const lastRowEnd = Math.max(0, rows.length - 1) * MENU_ANIMATION.rowOutStagger
      + MENU_ANIMATION.rowOutDuration;
    const backdropOutDelay = Math.max(0, lastRowEnd - 20);
    menu.style.setProperty("--nav-backdrop-out-delay", `${backdropOutDelay}ms`);
    menu.dataset.closeAnimationMs = String(
      backdropOutDelay + MENU_ANIMATION.backdropOutDuration
    );
  }

  function syncMenuState() {
    const visible = isMobile() && nav.classList.contains("open");
    const expanded = visible && !nav.classList.contains("is-closing");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Menü schließen" : "Menü öffnen");
    menu.setAttribute("aria-hidden", String(isMobile() && !visible));
    document.documentElement.classList.toggle("mobile-menu-open", visible);
  }

  function finishClosingMenu({ restoreFocus = false } = {}) {
    if (closeAnimationTimer) {
      window.clearTimeout(closeAnimationTimer);
      closeAnimationTimer = null;
    }

    nav.classList.remove("open", "is-closing");
    stack = [];
    renderMenu();
    syncMenuState();

    if (restoreFocus && isMobile()) {
      requestAnimationFrame(() => toggle.focus({ preventScroll: true }));
    }
  }

  function closeMenu({ restoreFocus = false, immediate = false } = {}) {
    if (!nav.classList.contains("open")) {
      syncMenuState();
      return;
    }

    if (restoreFocus && isMobile()) {
      toggle.focus({ preventScroll: true });
    }

    if (immediate || !isMobile() || prefersReducedMotion()) {
      finishClosingMenu({ restoreFocus });
      return;
    }

    nav.classList.add("is-closing");
    syncMenuState();

    const closeDuration = Number(menu.dataset.closeAnimationMs) || 500;
    closeAnimationTimer = window.setTimeout(() => {
      finishClosingMenu({ restoreFocus });
    }, closeDuration + 40);
  }

  function openMenu() {
    if (closeAnimationTimer) {
      window.clearTimeout(closeAnimationTimer);
      closeAnimationTimer = null;
    }

    nav.classList.remove("is-closing");
    nav.classList.add("open");
    renderMenu();
    syncMenuState();
  }

  function resetMenuImmediately() {
    if (closeAnimationTimer) {
      window.clearTimeout(closeAnimationTimer);
      closeAnimationTimer = null;
    }

    nav.classList.remove("open");
    nav.classList.remove("is-closing");
    stack = [];
    renderMenu();
    syncMenuState();
  }

  function renderMenu() {
    const currentFile = getCurrentFile();
    const activeChain = findActiveChain(NAV_TREE, currentFile) || [];

    if (isMobile() && stack.length > 0) {
      const parentKey = stack[stack.length - 1];
      const parentNode = findNodeByKey(NAV_TREE, parentKey);
      const children = parentNode?.children || [];

      menu.setAttribute("data-level", "sub");
      menu.innerHTML = `
        <li class="nav-row nav-back no-arrow">
          <button type="button" class="nav-back-btn" data-action="back">Zurück</button>
        </li>
        ${children
          .map((child) => {
            const isActive = normalizeFileName(child.href) === currentFile;
            return `
              <li class="nav-row no-arrow">
                <a class="nav-mainlink ${isActive ? "active" : ""}" href="${child.href || "#"}">${child.label}</a>
              </li>
            `;
          })
          .join("")}
      `;
      prepareMobileRowAnimations();
      return;
    }


    menu.setAttribute("data-level", "main");

    menu.innerHTML = NAV_TREE.map((item) => {
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
      const itemFile = normalizeFileName(item.href);
      const isItemActive = itemFile && itemFile === currentFile;
      const isInActiveChain = activeChain.includes(item.key);
      const activeClass = isItemActive ? "active" : "";
      const activeParentClass = !isItemActive && isInActiveChain ? "active-parent" : "";
      const itemContent = isMobile() ? renderMobileItemContent(item) : item.label;

      if (isMobile() && hasChildren) {
        return `
          <li class="nav-row has-arrow">
            <a class="nav-mainlink ${activeClass} ${activeParentClass}" href="${item.href || "#"}">${itemContent}</a>
            <button type="button" class="nav-arrow ${activeClass} ${activeParentClass}" data-action="drill" data-key="${item.key}" aria-label="${item.label} Untermenü öffnen">›</button>
          </li>
        `;
      }


      if (hasChildren) {
        const subHtml = item.children
          .map((child) => {
            const childActive = normalizeFileName(child.href) === currentFile;
            return `<li><a href="${child.href || "#"}" class="${childActive ? "active" : ""}">${child.label}</a></li>`;
          })
          .join("");

        return `
          <li class="has-children">
            <a href="${item.href || "#"}" class="${activeClass} ${activeParentClass}">${item.label}</a>
            <ul class="subnav" aria-label="${item.label}">
              ${subHtml}
            </ul>
          </li>
        `;
      }

      return `
        <li class="nav-row no-arrow">
          <a class="nav-mainlink ${activeClass}" href="${item.href || "#"}">${itemContent}</a>
        </li>
      `;

    }).join("");
    prepareMobileRowAnimations();
  }

  renderMenu();
  syncMenuState();

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (nav.classList.contains("open") && !nav.classList.contains("is-closing")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.addEventListener("click", (e) => {
    e.stopPropagation();

    const backBtn = e.target.closest('[data-action="back"]');
    if (backBtn) {
      stack.pop();
      renderMenu();
      return;
    }

    const drillBtn = e.target.closest('[data-action="drill"][data-key]');
    if (drillBtn) {
      e.preventDefault();
      const key = drillBtn.getAttribute("data-key");
      if (!key) return;
      stack.push(key);
      renderMenu();
    }
  });


  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      closeMenu({ restoreFocus: true });
    }
  });

  window.addEventListener("resize", () => {
    const mobile = isMobile();
    if (mobile === wasMobile) return;

    wasMobile = mobile;
    if (!mobile) {
      resetMenuImmediately();
    } else {
      renderMenu();
      syncMenuState();
    }
  });
});
