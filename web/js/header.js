document.addEventListener("DOMContentLoaded", () => {
  const headerEl = document.getElementById("site-header");
  if (!headerEl) return;

  const NAV_TREE = [
    { key: "punkterechner", label: "Punkterechner", href: "punkterechner.html" },
    {
      key: "wettkaempfe",
      label: "Wettkämpfe",
      href: "nominierung.html",
      children: [
        { key: "deutschlandpokal", label: "Deutschland Pokal", href: "deutschlandpokal.html" },
        { key: "bodenseepokal", label: "Bodensee Pokal", href: "bodenseepokal.html" },
        { key: "junioren", label: "Junioren Rettungspokal", href: "juniorenrettungspokal.html" },
        { key: "dem", label: "Deutsche Einzelstrecken Meisterschaften", href: "dem.html" },
      ],
    },
    { key: "rekorde", label: "Rekorde", href: "rekorde.html" },
    {
      key: "kader",
      label: "Kader",
      href: "landeskader.html",
      children: [
        { key: "kaderliste", label: "Kaderliste", href: "kaderstatus.html" },
        { key: "kaderrichtlinien", label: "Kaderrichtlinien", href: "kriterien.html" },
        { key: "trainingsplaene", label: "Trainingspläne", href: "#" },
      ],
    },
    { key: "athleten", label: "Athleten", href: "athleten.html" },
  ];

  const BREAKPOINT_PX = 1000;
  const isMobile = () => window.matchMedia(`(max-width:${BREAKPOINT_PX}px)`).matches;

  headerEl.innerHTML = `
    <div class="hdr-bg">
      <div class="hdr-container">
        <a class="brand" href="startseite.html">
          <img class="brand-logo" src="./svg/logo.svg" alt="" aria-hidden="true">
          <span class="brand-title">Lifesaving <span class="brand-baden">Baden</span></span>
        </a>
        <img class="brand-mascot" src="./png/icons/elch.png" alt="" aria-hidden="true">
      </div>
    </div>

    <div class="hdr-nav-wrap">
      <nav aria-label="Hauptnavigation" class="hdr-nav">
        <button class="menu-toggle" aria-expanded="false" aria-controls="primary-menu" aria-label="Menü öffnen">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"></path>
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

  function closeMenu() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    stack = [];
    renderMenu();
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

      if (isMobile() && hasChildren) {
        return `
          <li class="nav-row has-arrow">
            <a class="nav-mainlink ${activeClass} ${activeParentClass}" href="${item.href || "#"}">${item.label}</a>
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
          <a class="nav-mainlink ${activeClass}" href="${item.href || "#"}">${item.label}</a>
        </li>
      `;

    }).join("");
  }

  renderMenu();

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    renderMenu();
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
    if (!nav.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (!isMobile() && stack.length) stack = [];
    renderMenu();
  });
});
