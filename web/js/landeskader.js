const CONFIG_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "LK Kalender";
const CONFIG_TABLE_NAME = "LK_Kalender";

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  const KADER_CARDS = [
    {
      href: "./kaderstatus.html",
      img: "./png/hintergrund8.jpg",
      kicker: "Aktuelle Kaderliste",
      main: "Wie ist dein Kaderstatus?",
      more: "Liste aktueller Landeskaderathleten und diejenige, die die Kriterien erfüllt haben",
      aria: "Dein Athletenprofil",
    },
    {
      href: "./kriterien.html",
      img: "./png/hintergrund6.JPG",
      kicker: "Aktuelle Kaderrichtlinien",
      main: "Kriterien für den Landeskader",
      more: "Du willst in den Landeskader? Versuche die Kriterien zu erfüllen. Gerne kannst du uns auch immer ansprechen!",
      aria: "DLRG Punkterechner",
    },
    {
      href: "./trainingspläne.html",
      img: "./png/hintergrund7.jpg",
      kicker: "Trainingspläne",
      main: "Trainingspläne vom Landeskader Baden",
      more: "Du willst trainineren wie der Landeskader oder die Trainings nochmal nachschwimmen? Hier findest du die Trainingseinheiten der letzten Jahre.",
      aria: "Landeskader",
    },
  ];

  main.innerHTML = `
    <section class="kader-hero" aria-label="Landeskader Baden">
      <div class="kader-hero__inner">
        <h1>Landeskader Baden</h1>
      </div>
    </section>

    <section class="updates" aria-label="Termine">
      <div class="container">
        <h2>Termine & Kadertrainings</h2>
        <div id="termine-karussel"></div>
      </div>
    </section>

    <section class="intro" id="kader-informationen">
      <div class="container">
        <h2>Informationen</h2>
      </div>
    </section>

    <section class="home-links" aria-label="Landeskader informationen">
      <div class="container">
        <div class="home-cards">
          ${KADER_CARDS.map(
            (c) => `
              <a class="home-card" href="${c.href}" aria-label="${c.aria}">
                <img class="home-card__img" src="${c.img}" alt="" loading="lazy" decoding="async">
                <div class="home-card__overlay">
                  <div class="home-card__kicker">${c.kicker}</div>
                  <div class="home-card__box home-card__box--main">${c.main}</div>
                  <div class="home-card__box home-card__box--more">${c.more}</div>
                </div>
              </a>
            `
          ).join("")}
        </div>
      </div>
    </section>
  `;

  const container = document.getElementById("termine-karussel");
  if (!container) return;

  if (typeof window.initInfoKarussel !== "function") {
    container.innerHTML = `<ul class="updates__list"><li>Erste Inhalte folgen.</li></ul>`;
    return;
  }

  initFromExcel(container);
});

async function initFromExcel(container) {
  try {
    await ensureXlsx();
    const ab = await fetchExcelArrayBuffer(CONFIG_EXCEL_URL);
    const wb = window.XLSX.read(ab, { type: "array", cellDates: true });
    const ws = wb.Sheets[CONFIG_SHEET] || wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error("sheet_missing");

    const grid = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const headerInfo = findHeaderRow(grid);
    if (!headerInfo) throw new Error("header_missing");

    const col = headerInfo.col;
    const startRow = headerInfo.row + 1;

    const termine = [];
    for (let r = startRow; r < grid.length; r++) {
      const row = grid[r] || [];
      const title = cell(row, col.title);
      const dateFrom = cell(row, col.dateFrom);
      const dateTo = cell(row, col.dateTo);
      const timeFrom = cell(row, col.timeFrom);
      const timeTo = cell(row, col.timeTo);
      const meta = cell(row, col.meta);
      const ort = cell(row, col.ort);
      const kader = cell(row, col.kader);

      const allEmpty =
        isEmpty(title) &&
        isEmpty(dateFrom) &&
        isEmpty(dateTo) &&
        isEmpty(timeFrom) &&
        isEmpty(timeTo) &&
        isEmpty(meta) &&
        isEmpty(ort) &&
        isEmpty(kader);

      if (allEmpty) continue;

      const text = toStr(title).trim();
      if (!text) continue;

      const ds = formatDate(dateFrom);
      if (!ds) continue;

      const de = formatDate(dateTo);
      const ts = formatTime(timeFrom);
      const te = formatTime(timeTo);

      termine.push({
        dateStart: ds,
        dateEnd: de || "",
        text: text,
        meta: toStr(meta).trim(),
        timeStart: ts || "",
        timeEnd: te || "",
        location: toStr(ort).trim(),
        kader: toStr(kader).trim()
      });
    }

    if (!termine.length) {
      container.innerHTML = `<ul class="updates__list"><li>Erste Inhalte folgen.</li></ul>`;
      return;
    }

    window.initInfoKarussel("#termine-karussel", termine, { itemsPerPage: 4 });
  } catch (e) {
    container.innerHTML = `<ul class="updates__list"><li>Erste Inhalte folgen.</li></ul>`;
  }
}

function ensureXlsx() {
  return new Promise((resolve, reject) => {
    if (window.XLSX && window.XLSX.read && window.XLSX.utils) return resolve();
    const existing = Array.from(document.scripts).some((s) => s.src && s.src.includes("xlsx.full.min.js"));
    if (existing) {
      const t = setInterval(() => {
        if (window.XLSX && window.XLSX.read && window.XLSX.utils) {
          clearInterval(t);
          resolve();
        }
      }, 30);
      setTimeout(() => {
        clearInterval(t);
        reject(new Error("xlsx_load_timeout"));
      }, 6000);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("xlsx_load_error"));
    document.head.appendChild(s);
  });
}

async function fetchExcelArrayBuffer(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("fetch_failed");
  return await res.arrayBuffer();
}

function normHeader(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase();
}

function findHeaderRow(grid) {
  const targets = {
    dateFrom: ["datum von", "datum_von", "datumvon"],
    dateTo: ["datum bis", "datum_bis", "datumbis"],
    timeFrom: ["uhrzeit von", "uhrzeit_von", "uhrzeitvon"],
    timeTo: ["uhrzeit bis", "uhrzeit_bis", "uhrzeitbis"],
    title: ["titel", "title"],
    meta: ["meta"],
    ort: ["ort", "location"],
    kader: ["kader"]
  };

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    const idx = {};
    for (let c = 0; c < row.length; c++) {
      const h = normHeader(row[c]);
      if (!h) continue;
      for (const key in targets) {
        if (idx[key] !== undefined) continue;
        if (targets[key].includes(h)) idx[key] = c;
      }
    }
    if (idx.dateFrom !== undefined && idx.timeFrom !== undefined && idx.title !== undefined) {
      return {
        row: r,
        col: {
          dateFrom: idx.dateFrom,
          dateTo: idx.dateTo,
          timeFrom: idx.timeFrom,
          timeTo: idx.timeTo,
          title: idx.title,
          meta: idx.meta,
          ort: idx.ort,
          kader: idx.kader
        }
      };
    }
  }
  return null;
}

function cell(row, i) {
  if (i === undefined || i === null) return "";
  return row && row.length > i ? row[i] : "";
}

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function toStr(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    const y = String(v.getFullYear()).slice(-2);
    return pad2(v.getDate()) + "." + pad2(v.getMonth() + 1) + "." + y;
  }
  if (typeof v === "number") {
    if (window.XLSX && window.XLSX.SSF && typeof window.XLSX.SSF.parse_date_code === "function") {
      const dc = window.XLSX.SSF.parse_date_code(v);
      if (dc && dc.y && dc.m && dc.d) return pad2(dc.d) + "." + pad2(dc.m) + "." + String(dc.y).slice(-2);
    }
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + v * 86400000);
    return pad2(d.getUTCDate()) + "." + pad2(d.getUTCMonth() + 1) + "." + String(d.getUTCFullYear()).slice(-2);
  }
  const s = String(v).trim();
  if (!s) return "";
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const yy = m[3].length === 2 ? m[3] : String(m[3]).slice(-2);
    return pad2(Number(m[1])) + "." + pad2(Number(m[2])) + "." + yy;
  }
  return s;
}

function formatTime(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return pad2(v.getHours()) + ":" + pad2(v.getMinutes());
  if (typeof v === "number") {
    let frac = v % 1;
    if (frac < 0) frac += 1;
    let total = Math.round(frac * 24 * 60);
    if (total === 1440) total = 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return pad2(h) + ":" + pad2(m);
  }
  const s = String(v).trim();
  if (!s) return "";
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return pad2(Number(m[1])) + ":" + pad2(Number(m[2]));
  return s;
}
