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

        <div id="info-current-preview" class="info-preview">
          <p class="info-status">Lade Vorschau…</p>
        </div>

        <div id="info-current-pdf" class="info-pdfline"></div>
      </section>

      <section class="info-section" aria-labelledby="info-archive-title">
        <h2 id="info-archive-title">Frühere Infoschreiben:</h2>
        <div id="info-archive" class="info-links">
          <p class="info-status">Lade Liste…</p>
        </div>
      </section>

    </section>
  `;

  loadInfoschreiben().catch(() => {
    renderError("Die Infoschreiben konnten nicht geladen werden.");
  });
});

async function loadInfoschreiben() {
  const elPreview = document.getElementById("info-current-preview");
  const elPdfLine = document.getElementById("info-current-pdf");
  const elArchive = document.getElementById("info-archive");
  if (!elPreview || !elPdfLine || !elArchive) return;

  const cfg = {
    owner: "jp-gnad",
    repo: "Lifesaving_Baden",
    branch: "main",
    dirCandidates: ["Infoschreiben", "web/Infoschreiben"]
  };

  const docs = await fetchDocsFromGitHub(cfg);

  if (!docs.length) {
    elPreview.innerHTML = `<p class="info-status">Keine Infoschreiben gefunden.</p>`;
    elPdfLine.innerHTML = "";
    elArchive.innerHTML = `<p class="info-status">—</p>`;
    return;
  }

  const years = docs.map(d => d.year).filter(y => Number.isFinite(y));
  const latestYear = years.length ? Math.max(...years) : null;

  const current = latestYear ? docs.find(d => d.year === latestYear) : docs[0];
  const archive = latestYear ? docs.filter(d => d.year !== latestYear) : docs.slice(1);

  // 1) Aktuelles: HTML/Preview aus PDF rendern
  await renderCurrent(current, elPreview, elPdfLine);

  // 2) Frühere: nur Links
  renderArchive(archive, elArchive);
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
    .filter(it => it && it.type === "file" && typeof it.name === "string")
    .filter(it => it.name.toLowerCase().endsWith(".pdf"));

  const docs = pdfItems
    .map(it => {
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

/* ---------------- Rendering ---------------- */

async function renderCurrent(doc, elPreview, elPdfLine) {
  const pdfText = `${doc.label} (PDF Link)`;
  elPdfLine.innerHTML = `<a class="info-link" href="${doc.url}">${escapeHtml(pdfText)}</a>`;

  // PDF.js vorhanden?
  if (window.pdfjsLib && typeof window.pdfjsLib.getDocument === "function") {
    // Worker-URL setzen (CDNJS v2.16.105)
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    } catch {
      // falls nicht möglich: PDF.js nutzt ggf. Fake-Worker, ist ok
    }

    elPreview.innerHTML = `<p class="info-status">Erstelle HTML-Ansicht aus PDF…</p>`;

    try {
      await renderPdfAsCanvases(doc.url, elPreview);
      return;
    } catch (e) {
      // Fallback unten (iframe)
    }
  }

  // Fallback: eingebettete PDF (falls PDF.js fehlt oder Rendering scheitert)
  elPreview.innerHTML = `
    <p class="info-status">Vorschau konnte nicht gerendert werden – PDF wird eingebettet.</p>
    <iframe class="info-pdf-iframe" src="${doc.url}" title="${escapeHtml(doc.label)}"></iframe>
  `;
}

function renderArchive(docs, elArchive) {
  if (!docs.length) {
    elArchive.innerHTML = `<p class="info-status">—</p>`;
    return;
  }

  elArchive.innerHTML = docs
    .map(d => `<a class="info-link" href="${d.url}">${escapeHtml(d.label)}</a>`)
    .join("");
}

/* ---------------- PDF.js Canvas Rendering ---------------- */

async function renderPdfAsCanvases(pdfUrl, mount) {
  // leeren + Container
  mount.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "pdf-pages";
  mount.appendChild(wrap);

  const loadingTask = window.pdfjsLib.getDocument({ url: pdfUrl });
  const pdf = await loadingTask.promise;

  // Zielbreite (lesbar, aber responsiv)
  const maxWidth = 980;
  const containerWidth = Math.min(mount.clientWidth || maxWidth, maxWidth);

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const baseVp = page.getViewport({ scale: 1 });
    const scale = containerWidth / baseVp.width;
    const vp = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-canvas";

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(vp.width * dpr);
    canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = `${Math.floor(vp.width)}px`;
    canvas.style.height = `${Math.floor(vp.height)}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    wrap.appendChild(canvas);

    await page.render({
      canvasContext: ctx,
      viewport: vp
    }).promise;
  }
}

/* ---------------- Helpers ---------------- */

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
  // info.html liegt in /web/
  const enc = encodeURIComponent(fileName).replace(/%2F/g, "/");

  // PDFs in /web/Infoschreiben -> ./Infoschreiben/<file>
  if (dirPath.startsWith("web/")) {
    const sub = dirPath.slice(4); // "web/" entfernen
    return `./${sub}/${enc}`;
  }

  // PDFs in /Infoschreiben -> ../Infoschreiben/<file>
  return `../${dirPath}/${enc}`;
}

function renderError(message) {
  const elPreview = document.getElementById("info-current-preview");
  const elPdfLine = document.getElementById("info-current-pdf");
  const elArchive = document.getElementById("info-archive");

  if (elPreview) elPreview.innerHTML = `<p class="info-status info-error">${escapeHtml(message)}</p>`;
  if (elPdfLine) elPdfLine.innerHTML = "";
  if (elArchive) elArchive.innerHTML = `<p class="info-status">—</p>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
