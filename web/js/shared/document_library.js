(function (global) {
  const DocumentLibraryPage = {};

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function extractYear(filename) {
    const m = String(filename || "").match(/\b(19\d{2}|20\d{2})\b/);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    return Number.isFinite(year) ? year : null;
  }

  function buildRelativeUrl(dirPath, fileName) {
    const enc = encodeURIComponent(String(fileName || "")).replace(/%2F/g, "/");
    if (String(dirPath || "").startsWith("web/")) {
      return `./${String(dirPath).slice(4)}/${enc}`;
    }
    return `../${dirPath}/${enc}`;
  }

  function readCache(key, ttlMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      if (!obj.ts || Date.now() - obj.ts > ttlMs) return null;
      return obj.data || null;
    } catch {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore
    }
  }

  async function fetchDocsFromGitHub(config) {
    let items = null;
    let usedDir = null;

    for (const dirPath of config.dirCandidates || []) {
      const apiUrl =
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/` +
        `${encodeURIComponent(dirPath)}?ref=${encodeURIComponent(config.branch)}`;

      const res = await fetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store"
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data)) continue;

      items = data;
      usedDir = dirPath;
      break;
    }

    if (!items || !usedDir) {
      throw new Error("GitHub-Ordner nicht gefunden oder nicht erreichbar.");
    }

    return items
      .filter((item) => item && item.type === "file" && String(item.name || "").toLowerCase().endsWith(".pdf"))
      .map((item) => {
        const year = extractYear(item.name);
        return {
          name: item.name,
          year,
          url: buildRelativeUrl(usedDir, item.name),
          label: Number.isFinite(year) ? `${config.labelPrefix} ${year}` : String(item.name).replace(/\.pdf$/i, "")
        };
      })
      .sort((a, b) => {
        const ay = Number.isFinite(a.year) ? a.year : -Infinity;
        const by = Number.isFinite(b.year) ? b.year : -Infinity;
        if (by !== ay) return by - ay;
        return a.name.localeCompare(b.name, "de");
      });
  }

  function renderCurrentCard(config, doc) {
    const href = String(doc.url || "#");
    const year = Number.isFinite(doc.year) ? String(doc.year) : "";
    const aria = year ? `${config.openAriaPrefix} ${year} öffnen` : `${config.openAriaPrefix} öffnen`;

    return `
      <a class="info-brief" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(aria)}">
        <img
          class="info-brief__img"
          src="./png/icons/brief.png"
          alt="${escapeHtml(config.cardImageAlt)}"
          loading="lazy"
          decoding="async"
        />
        <div class="info-brief__overlay" aria-hidden="true">
          <div class="info-brief__t1">${escapeHtml(config.cardTitlePrefix)} ${escapeHtml(year)}</div>
          <div class="info-brief__t2">${escapeHtml(config.cardSubtitle)}</div>
          <div class="info-brief__spacer"></div>
          <div class="info-brief__t3">${escapeHtml(config.cardFooter)}</div>
        </div>
      </a>
    `;
  }

  function renderArchiveLink(doc) {
    const href = String(doc.url || "#");
    return `<a class="info-link" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.label)}</a>`;
  }

  function renderLists(config, docs, currentEl, archiveEl) {
    if (!Array.isArray(docs) || docs.length === 0) {
      currentEl.innerHTML = `<p class="info-status">${escapeHtml(config.emptyCurrentText)}</p>`;
      archiveEl.innerHTML = `<p class="info-status">${escapeHtml(config.archivePlaceholder)}</p>`;
      return;
    }

    const years = docs.map((doc) => doc.year).filter((year) => Number.isFinite(year));
    const latestYear = years.length ? Math.max(...years) : null;
    const current = latestYear ? docs.filter((doc) => doc.year === latestYear) : docs.slice(0, 1);
    const archive = latestYear ? docs.filter((doc) => doc.year !== latestYear) : docs.slice(1);

    currentEl.innerHTML = current.map((doc) => renderCurrentCard(config, doc)).join("");
    archiveEl.innerHTML = archive.length
      ? archive.map(renderArchiveLink).join("")
      : `<p class="info-status">${escapeHtml(config.archivePlaceholder)}</p>`;
  }

  function renderError(config, message) {
    const currentEl = document.getElementById(config.currentId);
    const archiveEl = document.getElementById(config.archiveId);

    if (currentEl) {
      currentEl.innerHTML = `<p class="info-status info-error">${escapeHtml(message)}</p>`;
    }
    if (archiveEl) {
      archiveEl.innerHTML = `<p class="info-status">${escapeHtml(config.archivePlaceholder)}</p>`;
    }
  }

  async function loadDocs(config) {
    const currentEl = document.getElementById(config.currentId);
    const archiveEl = document.getElementById(config.archiveId);
    if (!currentEl || !archiveEl) return;

    const cached = readCache(config.cacheKey, config.cacheTtlMs);
    if (cached?.docs?.length) {
      renderLists(config, cached.docs, currentEl, archiveEl);
      return;
    }

    try {
      const docs = await fetchDocsFromGitHub(config);
      writeCache(config.cacheKey, { docs });
      renderLists(config, docs, currentEl, archiveEl);
    } catch (err) {
      const stale = readCache(config.cacheKey, Number.MAX_SAFE_INTEGER);
      if (stale?.docs?.length) {
        renderLists(config, stale.docs, currentEl, archiveEl);
        return;
      }
      renderError(config, config.apiErrorText);
      throw err;
    }
  }

  function renderShell(config, main) {
    main.innerHTML = `
      <section class="hero">
        <h1>${escapeHtml(config.pageTitle)}</h1>
      </section>

      <section class="info-wrap" aria-label="${escapeHtml(config.sectionAriaLabel)}">
        <section class="info-section" aria-labelledby="${escapeHtml(config.currentHeadingId)}">
          <h2 id="${escapeHtml(config.currentHeadingId)}">${escapeHtml(config.currentHeading)}</h2>
          <div id="${escapeHtml(config.currentId)}" class="info-links">
            <p class="info-status">${escapeHtml(config.loadingText)}</p>
          </div>
        </section>

        <section class="info-section" aria-labelledby="${escapeHtml(config.archiveHeadingId)}">
          <h2 id="${escapeHtml(config.archiveHeadingId)}">${escapeHtml(config.archiveHeading)}</h2>
          <div id="${escapeHtml(config.archiveId)}" class="info-links">
            <p class="info-status">${escapeHtml(config.archivePlaceholder)}</p>
          </div>
        </section>
      </section>
    `;
  }

  DocumentLibraryPage.init = function init(userConfig = {}) {
    const config = {
      owner: "jp-gnad",
      repo: "Lifesaving_Baden",
      branch: "main",
      cacheTtlMs: 10 * 60 * 1000,
      currentId: "info-current",
      archiveId: "info-archive",
      currentHeadingId: "info-current-title",
      archiveHeadingId: "info-archive-title",
      archivePlaceholder: "—",
      ...userConfig
    };

    document.addEventListener("DOMContentLoaded", () => {
      const main = document.getElementById("content");
      if (!main) return;

      renderShell(config, main);
      loadDocs(config).catch(() => {
        renderError(config, config.errorText);
      });
    });
  };

  global.DocumentLibraryPage = DocumentLibraryPage;
})(window);
