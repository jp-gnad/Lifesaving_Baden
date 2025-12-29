document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Infoschreiben</h1>
    </section>

    <section class="info-wrap" aria-label="Infoschreiben Übersicht">
      <section class="info-section" aria-labelledby="info-current-title">
        <h2 id="info-current-title">Aktuelles Infoschreiben:</h2>
        <ul class="info-list" id="info-current">
          <li class="info-status">Lade Infoschreiben…</li>
        </ul>
      </section>

      <section class="info-section" aria-labelledby="info-archive-title">
        <h2 id="info-archive-title">Alte Infoschreiben:</h2>
        <ul class="info-list" id="info-archive">
          <li class="info-status">—</li>
        </ul>
      </section>
    </section>
  `;

  loadInfoschreiben().catch(() => {
    renderError(
      "Die Infoschreiben konnten nicht geladen werden. Bitte später erneut versuchen."
    );
  });
});

/**
 * Lädt PDF-Dateien aus dem GitHub-Repo (Ordner: Infoschreiben oder web/Infoschreiben),
 * erkennt Jahreszahlen, sortiert absteigend und rendert:
 * - Aktuelles Infoschreiben = höchstes Jahr
 * - Alte Infoschreiben = Rest
 */
async function loadInfoschreiben() {
  const elCurrent = document.getElementById("info-current");
  const elArchive = document.getElementById("info-archive");
  if (!elCurrent || !elArchive) return;

  const cfg = {
    owner: "jp-gnad",
    repo: "Lifesaving_Baden",
    branch: "main",
    dirCandidates: ["Infoschreiben", "web/Infoschreiben"], // probiert beide automatisch
    cacheKey: "lsb_infoschreiben_cache_v1",
    cacheTtlMs: 6 * 60 * 60 * 1000 // 6 Stunden
  };

  // 1) Cache versuchen
  const cached = readCache(cfg.cacheKey, cfg.cacheTtlMs);
  if (cached?.docs?.length) {
    renderLists(cached.docs, elCurrent, elArchive);
    // parallel aktualisieren (ohne UI zu blockieren)
    fetchLatestAndUpdate(cfg, elCurrent, elArchive).catch(() => {});
    return;
  }

  // 2) Live laden
  const docs = await fetchDocsFromGitHub(cfg);
  writeCache(cfg.cacheKey, { docs });

  renderLists(docs, elCurrent, elArchive);
}

async function fetchLatestAndUpdate(cfg, elCurrent, elArchive) {
  const docs = await fetchDocsFromGitHub(cfg);
  writeCache(cfg.cacheKey, { docs });
  renderLists(docs, elCurrent, elArchive);
}

async function fetchDocsFromGitHub(cfg) {
  // Ordnerkandidaten der Reihe nach versuchen
  let items = null;
  let usedDir = null;

  for (const dirPath of cfg.dirCandidates) {
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
      dirPath
    )}?ref=${encodeURIComponent(cfg.branch)}`;

    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json"
      }
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

  if (!items) {
    throw new Error("GitHub-Ordner nicht gefunden oder nicht erreichbar.");
  }

  // PDFs filtern
  const pdfItems = items
    .filter((it) => it && it.type === "file" && typeof it.name === "string")
    .filter((it) => it.name.toLowerCase().endsWith(".pdf"));

  // Jahreszahlen extrahieren und normalisieren
  const docs = pdfItems
    .map((it) => {
      const year = extractYear(it.name);
      return {
        name: it.name,
        year,
        // bevorzugt: relative URL (same-origin, lokal & GitHub Pages)
        url: buildRelativeUrlFromWebInfo(usedDir, it.name),
        // optionaler Fallback: raw download_url
        rawUrl: it.download_url,
        label: buildLabel(it.name, year)
      };
    })
    // nur Dateien mit erkennbarem Jahr bevorzugen, Rest ans Ende
    .sort((a, b) => {
      const ay = Number.isFinite(a.year) ? a.year : -Infinity;
      const by = Number.isFinite(b.year) ? b.year : -Infinity;
      if (by !== ay) return by - ay;
      return a.name.localeCompare(b.name, "de");
    });

  return docs;
}

function renderLists(docs, elCurrent, elArchive) {
  // leere Zustände
  if (!Array.isArray(docs) || docs.length === 0) {
    elCurrent.innerHTML = `<li class="info-status">Keine Infoschreiben gefunden.</li>`;
    elArchive.innerHTML = `<li class="info-status">—</li>`;
    return;
  }

  // neuestes Jahr bestimmen (höchster year-Wert)
  const years = docs.map((d) => d.year).filter((y) => Number.isFinite(y));
  const latestYear = years.length ? Math.max(...years) : null;

  const current = latestYear ? docs.filter((d) => d.year === latestYear) : docs.slice(0, 1);
  const archive = latestYear ? docs.filter((d) => d.year !== latestYear) : docs.slice(1);

  elCurrent.innerHTML = current.map(renderItem).join("");
  elArchive.innerHTML =
    archive.length > 0 ? archive.map(renderItem).join("") : `<li class="info-status">—</li>`;
}

function renderItem(doc) {
  const safeLabel = escapeHtml(doc.label);
  const href = doc.url || doc.rawUrl || "#";

  return `
    <li class="info-item">
      <a class="info-link" href="${href}">
        ${safeLabel}
      </a>
    </li>
  `;
}


function renderError(message) {
  const elCurrent = document.getElementById("info-current");
  const elArchive = document.getElementById("info-archive");
  if (elCurrent) elCurrent.innerHTML = `<li class="info-status info-error">${escapeHtml(message)}</li>`;
  if (elArchive) elArchive.innerHTML = `<li class="info-status">—</li>`;
}

function extractYear(filename) {
  // findet 4-stellige Jahre 1900-2099 im Dateinamen
  const m = String(filename).match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

function buildLabel(filename, year) {
  // gewünschte Darstellung:
  // "Infoschreiben 2025 - LV Baden"
  // wenn kein Jahr gefunden: Dateiname ohne Endung
  if (Number.isFinite(year)) return `Infoschreiben ${year} - LV Baden`;
  const base = String(filename).replace(/\.pdf$/i, "");
  return `${base} - LV Baden`;
}

function buildRelativeUrlFromWebInfo(dirPath, fileName) {
  // info.html liegt in /web/
  const enc = encodeURIComponent(fileName).replace(/%2F/g, "/");

  // Wenn PDFs im Ordner /web/Infoschreiben liegen:
  // -> ./Infoschreiben/<file>
  if (dirPath.startsWith("web/")) {
    const sub = dirPath.slice(4); // "web/" entfernen
    return `./${sub}/${enc}`;
  }

  // Wenn PDFs im Repo-Root-Ordner /Infoschreiben liegen:
  // -> ../Infoschreiben/<file>
  return `../${dirPath}/${enc}`;
}


/* ---------------- Cache ---------------- */

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

/* ---------------- Helpers ---------------- */

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
