document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Infoschreiben</h1>
    </section>

    <section class="info-wrap" aria-label="Infoschreiben Übersicht">
      <section class="info-section" aria-labelledby="info-current-title">
        <h2 id="info-current-title">Aktuelle Infoschreiben</h2>
        <div id="info-current" class="info-links">
          <p class="info-status">Lade Infoschreiben…</p>
        </div>
      </section>

      <section class="info-section" aria-labelledby="info-archive-title">
        <h2 id="info-archive-title">Frühere Infoschreiben</h2>
        <div id="info-archive" class="info-links">
          <p class="info-status">—</p>
        </div>
      </section>
    </section>
  `;

  loadInfoschreiben().catch(() => {
    renderError("Die Infoschreiben konnten nicht geladen werden.");
  });
});

async function loadInfoschreiben() {
  const elCurrent = document.getElementById("info-current");
  const elArchive = document.getElementById("info-archive");
  if (!elCurrent || !elArchive) return;

  const cfg = {
    owner: "jp-gnad",
    repo: "Lifesaving_Baden",
    branch: "main",
    dirCandidates: ["Infoschreiben", "web/Infoschreiben"],
    cacheKey: "lsb_infoschreiben_cache_v1",
    cacheTtlMs: 10 * 60 * 1000 // 10 Minuten
  };

  // 1) Cache verwenden, wenn vorhanden
  const cached = readCache(cfg.cacheKey, cfg.cacheTtlMs);
  if (cached?.docs?.length) {
    renderLists(cached.docs, elCurrent, elArchive);
    return;
  }

  // 2) Sonst live laden
  try {
    const docs = await fetchDocsFromGitHub(cfg);
    writeCache(cfg.cacheKey, { docs });
    renderLists(docs, elCurrent, elArchive);
  } catch (err) {
    // Falls API blockt, aber ein alter Cache existiert: den trotzdem anzeigen
    const stale = readCache(cfg.cacheKey, Number.MAX_SAFE_INTEGER);
    if (stale?.docs?.length) {
      renderLists(stale.docs, elCurrent, elArchive);
      return;
    }
    renderError("Die Infoschreiben konnten nicht geladen werden (GitHub API).");
    throw err;
  }
}


async function fetchLatestAndUpdate(cfg, elCurrent, elArchive) {
  const docs = await fetchDocsFromGitHub(cfg);
  writeCache(cfg.cacheKey, { docs });
  renderLists(docs, elCurrent, elArchive);
}

async function fetchDocsFromGitHub(cfg) {
  let items = null;
  let usedDir = null;

  for (const dirPath of cfg.dirCandidates) {
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
      dirPath
    )}?ref=${encodeURIComponent(cfg.branch)}`;

    const res = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        items = data;
        usedDir = dirPath;
        break;
      }
    }
  }

  if (!items) throw new Error("GitHub-Ordner nicht gefunden oder nicht erreichbar.");

  const pdfItems = items
    .filter((it) => it && it.type === "file" && typeof it.name === "string")
    .filter((it) => it.name.toLowerCase().endsWith(".pdf"));

  const docs = pdfItems
    .map((it) => {
      const year = extractYear(it.name);
      return {
        name: it.name,
        year,
        url: buildRelativeUrlFromWebInfo(usedDir, it.name),
        label: buildLabel(it.name, year)
      };
    })
    .sort((a, b) => {
      const ay = Number.isFinite(a.year) ? a.year : -Infinity;
      const by = Number.isFinite(b.year) ? b.year : -Infinity;
      if (by !== ay) return by - ay;
      return a.name.localeCompare(b.name, "de");
    });

  return docs;
}

function renderLists(docs, elCurrent, elArchive) {
  if (!Array.isArray(docs) || docs.length === 0) {
    elCurrent.innerHTML = `<p class="info-status">Keine Infoschreiben gefunden.</p>`;
    elArchive.innerHTML = `<p class="info-status">—</p>`;
    return;
  }

  const years = docs.map((d) => d.year).filter((y) => Number.isFinite(y));
  const latestYear = years.length ? Math.max(...years) : null;

  // "Aktuell" = neuestes Jahr (falls mehrere PDFs im selben Jahr existieren: mehrere Boxen)
  const current = latestYear ? docs.filter((d) => d.year === latestYear) : docs.slice(0, 1);
  const archive = latestYear ? docs.filter((d) => d.year !== latestYear) : docs.slice(1);

  // >>> HIER: aktuelle als Bildbox(en)
  elCurrent.innerHTML = current.map(renderCurrentCard).join("");

  // frühere bleiben Textlinks
  elArchive.innerHTML = archive.length ? archive.map(renderLinkLine).join("") : `<p class="info-status">—</p>`;
}

function renderCurrentCard(doc) {
  const href = String(doc.url || "#");
  const year = Number.isFinite(doc.year) ? String(doc.year) : "";
  const aria = year ? `Infobrief ${year} öffnen` : "Infobrief öffnen";

  return `
    <a class="info-brief" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${aria}">
      <img
        class="info-brief__img"
        src="./png/icons/brief.png"
        alt="Infoschreiben öffnen"
        loading="lazy"
        decoding="async"
      />
      <div class="info-brief__overlay" aria-hidden="true">
        <div class="info-brief__t1">Infobrief ${escapeHtml(year)}</div>
        <div class="info-brief__t2">Rettungssport</div>
        <div class="info-brief__spacer"></div>
        <div class="info-brief__t3">Landeskader Baden</div>
      </div>
    </a>
  `;
}




function renderLinkLine(doc) {
  const safeLabel = escapeHtml(doc.label);
  const href = String(doc.url || "#");
  return `<a class="info-link" href="${href}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
}


function renderError(message) {
  const elCurrent = document.getElementById("info-current");
  const elArchive = document.getElementById("info-archive");
  if (elCurrent) elCurrent.innerHTML = `<p class="info-status info-error">${escapeHtml(message)}</p>`;
  if (elArchive) elArchive.innerHTML = `<p class="info-status">—</p>`;
}

function extractYear(filename) {
  const m = String(filename).match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

function buildLabel(filename, year) {
  if (Number.isFinite(year)) return `Infoschreiben ${year}`;
  return String(filename).replace(/\.pdf$/i, "");
}

function buildRelativeUrlFromWebInfo(dirPath, fileName) {
  const enc = encodeURIComponent(fileName).replace(/%2F/g, "/");

  if (dirPath.startsWith("web/")) {
    const sub = dirPath.slice(4);
    return `./${sub}/${enc}`;
  }
  return `../${dirPath}/${enc}`;
}

/* Cache helpers (TTL=0 => faktisch aus) */
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
renderCurrentCard