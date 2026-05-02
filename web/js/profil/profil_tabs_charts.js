(function (global) {
  const ProfileTabsCharts = global.ProfileTabsCharts || {};
  const internals = global.ProfileTabsInternals;
  if (!internals) {
    throw new Error("ProfileTabsInternals missing");
  }
  const {
    MIN_QUERY_LEN,
    DISCIPLINES,
    dismissKeyboard,
    currentOrtsgruppeFromMeets,
    renderCapAvatarLocal,
    withHydratedMeets,
    mergeDuplicateMeets,
    buildTimeSeriesForDiscipline,
    countStartsPerDisciplineAll,
    nonEmpty,
    parseTimeToSec,
    formatSeconds,
    fmtDateShort,
    getAthletesPool,
  } = internals;
  function renderDisciplinePieCard(a) {
    const counts = countStartsPerDisciplineAll(a);

    const ordered = DISCIPLINES.map(d => ({
      key: d.key,
      label: d.label,
      count: Number(counts[d.key] || 0)
    })).filter(x => x.count > 0);

    const total = ordered.reduce((s, x) => s + x.count, 0);

    const card = document.createElement("div");
    card.className = "ath-pie-card";

    const head = document.createElement("div");
    head.className = "pie-head";
    head.innerHTML = "<h4>Disziplin-Verteilung</h4>";
    card.appendChild(head);

    if (total === 0) {
      const empty = document.createElement("div");
      empty.className = "best-empty";
      empty.textContent = "Noch keine Starts erfasst.";
      card.appendChild(empty);
      return card;
    }

    ordered.forEach(it => { it.pct = Math.round((it.count / total) * 100); });

    const wrap = document.createElement("div");
    wrap.className = "pie-wrap";
    card.appendChild(wrap);

    const W = 360, H = 360, cx = W / 2, cy = H / 2;
    const R = 140, r = 80;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "pie-svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    function segPath(cx, cy, R, r, start, end) {
      const large = end - start > Math.PI ? 1 : 0;
      const x0 = cx + R * Math.cos(start), y0 = cy + R * Math.sin(start);
      const x1 = cx + R * Math.cos(end), y1 = cy + R * Math.sin(end);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const x3 = cx + r * Math.cos(start), y3 = cy + r * Math.sin(start);
      return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    }

    const CLASS_MAP = {
      "50_retten": "pie-c-200h",
      "100_retten_flosse": "pie-c-100k",
      "100_kombi": "pie-c-100l",
      "100_lifesaver": "pie-c-200s",
      "200_super": "pie-c-50r",
      "200_hindernis": "pie-c-100rf"
    };

    let angle = -Math.PI / 2;
    ordered.forEach(it => {
      const sweep = (it.count / total) * Math.PI * 2;
      if (sweep <= 0) return;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", segPath(cx, cy, R, r, angle, angle + sweep));
      path.setAttribute("class", `pie-slice ${CLASS_MAP[it.key] || ""}`);
      const title = document.createElementNS(svgNS, "title");
      title.textContent = `${it.label}: ${it.pct}% (${it.count})`;
      path.appendChild(title);
      svg.appendChild(path);
      angle += sweep;
    });

    const center = document.createElementNS(svgNS, "g");
    center.setAttribute("class", "pie-center");
    const t1 = document.createElementNS(svgNS, "text");
    t1.setAttribute("x", cx); t1.setAttribute("y", cy - 6);
    t1.setAttribute("text-anchor", "middle"); t1.setAttribute("class", "c1");
    t1.textContent = `${total}`;
    const t2 = document.createElementNS(svgNS, "text");
    t2.setAttribute("x", cx); t2.setAttribute("y", cy + 16);
    t2.setAttribute("text-anchor", "middle"); t2.setAttribute("class", "c2");
    t2.textContent = "Starts";
    center.append(t1, t2);
    svg.appendChild(center);

    const legend = document.createElement("div");
    legend.className = "pie-legend";
    ordered.forEach(it => {
      const row = document.createElement("div");
      row.className = "pie-leg-row";

      const dot = document.createElement("span");
      dot.className = `pie-dot ${CLASS_MAP[it.key] || ""}`;

      const label = document.createElement("span");
      label.className = "pie-leg-label";
      label.textContent = it.label;

      const val = document.createElement("span");
      val.className = "pie-leg-val";
      val.textContent = `${it.pct}%  •  ${it.count}`;

      row.append(dot, label, val);
      legend.appendChild(row);
    });

    wrap.appendChild(svg);
    wrap.appendChild(legend);
    return card;
  }

  function computeOverallLSC(meets) {
    const list = Array.isArray(meets) ? [...meets] : [];
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const m of list) {
      if (m && m.LSC != null && m.LSC !== "") {
        const x = parseFloat(String(m.LSC).replace(",", "."));
        if (Number.isFinite(x)) return x;
      }
    }
    return null;
  }

  function countriesFromAthlete(a) {
    const fromMeets = new Set();
    (a.meets || []).forEach(m => {
      const land = (m && m.Land) ? String(m.Land).trim() : null;
      if (land) fromMeets.add(land);
    });
    const arr = Array.from(fromMeets);
    if (arr.length) return arr;
    return Array.isArray(a.countriesDE) ? a.countriesDE : [];
  }

  function deriveFromMeets(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];

    const pbs = { "25": {}, "50": {} };
    const stats = { "25": {}, "50": {} };
    for (const lane of ["25", "50"]) {
      for (const d of DISCIPLINES) stats[lane][d.key] = { starts: 0, dq: 0 };
    }

    const medals = { gold: 0, silver: 0, bronze: 0, title: "Lifesaving Medaillen" };
    let totalStarts = 0;

    const addMedal = (place) => {
      const p = parseInt(place, 10);
      if (!Number.isFinite(p)) return;
      if (p === 1) medals.gold++;
      else if (p === 2) medals.silver++;
      else if (p === 3) medals.bronze++;
    };

    for (const meet of meets) {
      const lane = meet?.pool === "25" ? "25" : (meet?.pool === "50" ? "50" : null);

      const runs = Array.isArray(meet._runs) && meet._runs.length ? meet._runs : [meet];

      for (const run of runs) {
        for (const d of DISCIPLINES) {
          const z = run[d.meetZeit];
          const tSec = parseTimeToSec(z);
          const isDQ = z != null && /^dq$/i.test(String(z).trim());
          const hasStart = isDQ || Number.isFinite(tSec);

          if (lane && hasStart) {
            stats[lane][d.key].starts++;
            if (isDQ) stats[lane][d.key].dq++;
            totalStarts++;
            if (Number.isFinite(tSec)) {
              const cur = pbs[lane][d.key];
              if (cur == null || tSec < cur) pbs[lane][d.key] = tSec;
            }
          }
        }
      }

      for (const run of runs) {
        const wRaw = (run.Wertung || "").toLowerCase();
        const w = wRaw.replace(/[\s\-]+/g, "");
        const isEinzel = w.includes("einzel");
        if (!isEinzel) continue;
        for (const d of DISCIPLINES) addMedal(run[d.meetPlatz]);
      }

      const maxRun = runs.reduce((acc, r) => (acc == null || (r._lauf || 0) > (acc._lauf || 0)) ? r : acc, null);
      if (maxRun && nonEmpty(maxRun.Mehrkampf_Platz)) addMedal(maxRun.Mehrkampf_Platz);
    }

    return {
      pbs,
      stats,
      medals,
      totalDisciplines: totalStarts,
      countriesDE: countriesFromAthlete(a),
      lsc: computeOverallLSC(meets) ?? a.lsc ?? null
    };
  }

  function buildLSCSeries(a) {
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);

    const rows = [];
    for (const m of meets) {
      const dateISO = String(m?.date || "").slice(0, 10);
      if (!dateISO) continue;
      const d = new Date(dateISO);
      if (isNaN(d)) continue;

      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      let best = { lauf: -1, lsc: NaN };
      for (const r of runs) {
        const lauf = Number(r?._lauf || r?.Vorläufe || 1);
        const lsc = parseFloat(String(r?.LSC ?? m?.LSC ?? "").replace(",", "."));
        if (Number.isFinite(lauf) && Number.isFinite(lsc) && lauf >= best.lauf) {
          best = { lauf, lsc };
        }
      }
      if (!Number.isFinite(best.lsc)) continue;

      const years = (d - birth) / (365.2425 * 24 * 3600 * 1000);
      const age = Math.round(years * 100) / 100;
      const meetName = String(m.meet_name || m.meet || "").replace(/\s+-\s+.*$/, "").trim();

      rows.push({ age, lsc: best.lsc, date: dateISO, meet_name: meetName });
    }

    rows.sort((l, r) => new Date(l.date) - new Date(r.date));
    return rows;
  }

  async function buildCalculatedLSCSeries(a) {
    if (!global.ProfileLSC || typeof global.ProfileLSC.calculateHistorySeries !== "function") {
      return buildLSCSeries(a);
    }

    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];

    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);
    const history = await global.ProfileLSC.calculateHistorySeries(a, { byMeet: true });
    const rows = [];

    (Array.isArray(history) ? history : []).forEach((entry) => {
      const dateISO = String(entry?.date || "").slice(0, 10);
      if (!dateISO || !Number.isFinite(entry?.calculatedLsc)) return;

      const d = new Date(dateISO);
      if (isNaN(d)) return;

      const years = (d - birth) / (365.2425 * 24 * 3600 * 1000);
      const age = Math.round(years * 100) / 100;
      const meetName = String(entry?.meetName || entry?.meet_name || "").replace(/\s+-\s+.*$/, "").trim();

      rows.push({
        age,
        lsc: Number(entry.calculatedLsc),
        date: dateISO,
        meet_name: meetName
      });
    });

    rows.sort((l, r) => new Date(l.date) - new Date(r.date));
    return rows;
  }

  function renderLSCChart(a) {
    const sLocal = (tag, attrs = {}, ...children) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
      children.flat().forEach(c => c != null && el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };
    const hEl = (tag, attrs = {}, ...children) => {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") el.className = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
      }
      children.flat().forEach(c => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };

    const card = hEl("div", { class: "ath-lsc-card" },
      hEl("div", { class: "lsc-head" }, hEl("h4", {}, "LSC Verlauf"))
    );
    const status = hEl("div", { class: "best-empty" }, "LSC-Verlauf wird berechnet …");
    card.appendChild(status);

    const vp = hEl("div", { class: "lsc-viewport" });
    const svg = sLocal("svg", { class: "lsc-svg", role: "img", "aria-label": "LSC Verlauf" });
    vp.appendChild(svg);
    vp.classList.add("hidden");
    card.appendChild(vp);

    const tip = hEl("div", { class: "lsc-tooltip", "aria-hidden": "true" },
      hEl("div", { class: "tt-l1" }),
      hEl("div", { class: "tt-l2" })
    );
    card.appendChild(tip);

    const legend = hEl("div", { class: "lsc-legend" },
      hEl("span", { class: "lsc-key lsc-key--base" },
        hEl("span", { class: "lsc-key-dot blue" }),
        hEl("span", { class: "lsc-key-label" }, a?.name || "Athlet A")
      )
    );
    legend.classList.add("hidden");
    card.appendChild(legend);

    let basePts = [];
    let cmpAth = null;
    let cmpPts = null;

    const cmpWrap = hEl("div", { class: "lsc-compare-wrap" });
    const cmpInput = hEl("input", {
      class: "lsc-input",
      type: "search",
      placeholder: "Athlet zum Vergleich suchen …",
      autocomplete: "off",
      role: "searchbox",
      "aria-label": "Athlet zum Vergleich suchen"
    });
    const clearBtn = hEl("button", { class: "lsc-clear hidden", type: "button", title: "Vergleich entfernen" }, "Entfernen");
    const suggest = hEl("div", { class: "lsc-suggest hidden", role: "listbox" });

    cmpWrap.appendChild(hEl("div", { class: "lsc-search-row" }, cmpInput, clearBtn));
    cmpWrap.appendChild(suggest);
    cmpWrap.classList.add("hidden");
    card.appendChild(cmpWrap);

    let cmpQuery = "", cmpResults = [], cmpActive = -1;
    let cmpLoadId = 0;
    const normalizeLocal = (s) => (s || "").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

    function showStatus(message) {
      status.textContent = message;
      status.classList.remove("hidden");
      vp.classList.add("hidden");
      legend.classList.add("hidden");
      cmpWrap.classList.add("hidden");
      tip.style.opacity = "0";
      tip.style.transform = "translate(-9999px,-9999px)";
      tip.setAttribute("aria-hidden", "true");
    }

    function showChart() {
      status.classList.add("hidden");
      vp.classList.remove("hidden");
      legend.classList.remove("hidden");
      cmpWrap.classList.remove("hidden");
    }

    function updateCmpSuggest() {
      const q = cmpQuery.trim();
      if (q.length < MIN_QUERY_LEN) { cmpResults = []; cmpActive = -1; paintCmpSuggest(); return; }

      const nq = normalizeLocal(q);
      const pool = (getAthletesPool() || []).filter(x => x?.id !== a?.id);
      const list = pool.map(ax => ({ ax, nName: normalizeLocal(ax.name) }))
        .filter(x => x.nName.includes(nq))
        .sort((l, r) => {
          const la = l.nName.startsWith(nq) ? 0 : 1;
          const ra = r.nName.startsWith(nq) ? 0 : 1;
          if (la !== ra) return la - ra;
          return l.nName.localeCompare(r.nName);
        })
        .slice(0, 8);

      cmpResults = list.map(x => x.ax);
      cmpActive = cmpResults.length ? 0 : -1;
      paintCmpSuggest();
    }

    function renderCapAvatarForSuggest(ax, size = "sm", extraClass = "") {
      const fn = global?.ProfileHead?.renderCapAvatar;
      const node = (typeof fn === "function") ? fn(ax, size, extraClass) : renderCapAvatarLocal(ax, size, extraClass);
      return (node instanceof Node) ? node : renderCapAvatarLocal(ax, size, extraClass);
    }


    function paintCmpSuggest() {
      suggest.innerHTML = "";
      if (!cmpQuery || cmpResults.length === 0) {
        const msg = cmpQuery.length < MIN_QUERY_LEN ? `Mind. ${MIN_QUERY_LEN} Zeichen eingeben` : "Keine Treffer";
        suggest.appendChild(hEl("div", { class: "lsc-suggest-empty" }, msg));
        suggest.classList.remove("hidden");
        return;
      }
      cmpResults.forEach((ax, idx) => {
        const item = hEl("div", {
          class: "lsc-suggest-item" + (idx === cmpActive ? " active" : ""),
          role: "option", "aria-selected": idx === cmpActive ? "true" : "false"
        });
        item.appendChild(renderCapAvatarForSuggest(ax, "sm", "lsc-suggest-avatar"));
        const name = hEl("div", { class: "lsc-suggest-name" }, ax.name, " ",
          hEl("span", { class: "lsc-year" }, `(${ax.jahrgang})`));
        const og = currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "";
        const sub = hEl("div", { class: "lsc-suggest-sub" }, "DLRG ", og);
        item.appendChild(hEl("div", { class: "lsc-suggest-text" }, name, sub));
        item.addEventListener("click", () => { chooseCmp(ax); });
        item.addEventListener("mouseenter", () => { suggest.querySelector(".active")?.classList.remove("active"); item.classList.add("active"); cmpActive = idx; });

        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    }

    function hideCmpSuggest() { suggest.classList.add("hidden"); }

    async function chooseCmp(ax) {
      const reqId = ++cmpLoadId;
      const full = withHydratedMeets(ax);
      const merged = mergeDuplicateMeets(full.meets);

      cmpAth = { ...full, meets: merged };
      cmpPts = null;

      legend.querySelector(".lsc-key--cmp")?.remove();
      legend.appendChild(
        hEl("span", { class: "lsc-key lsc-key--cmp" },
          hEl("span", { class: "lsc-key-dot green" }),
          hEl("span", { class: "lsc-key-label" }, cmpAth.name)
        )
      );

      clearBtn.classList.remove("hidden");
      hideCmpSuggest();
      dismissKeyboard();
      cmpInput.value = cmpQuery = "";
      paint();

      try {
        const series = await buildCalculatedLSCSeries(cmpAth);
        if (reqId !== cmpLoadId || !cmpAth || cmpAth.id !== full.id) return;
        cmpPts = series.length ? series : buildLSCSeries(cmpAth);
      } catch (error) {
        console.error("Vergleichs-LSC-Verlauf konnte nicht berechnet werden:", error);
        if (reqId !== cmpLoadId || !cmpAth || cmpAth.id !== full.id) return;
        cmpPts = buildLSCSeries(cmpAth);
      }

      paint();
    }

    cmpInput.addEventListener("input", e => { cmpQuery = e.target.value || ""; updateCmpSuggest(); });
    cmpInput.addEventListener("keydown", e => {
      if (!cmpResults.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); cmpActive = (cmpActive + 1) % cmpResults.length; paintCmpSuggest(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cmpActive = (cmpActive - 1 + cmpResults.length) % cmpResults.length; paintCmpSuggest(); }
      else if (e.key === "Enter") { e.preventDefault(); chooseCmp(cmpResults[cmpActive >= 0 ? cmpActive : 0]); }
      else if (e.key === "Escape") { hideCmpSuggest(); }
    });
    document.addEventListener("click", (e) => { if (!cmpWrap.contains(e.target)) hideCmpSuggest(); });

    clearBtn.addEventListener("click", () => {
      cmpLoadId += 1;
      cmpAth = null; cmpPts = null;
      clearBtn.classList.add("hidden");
      legend.querySelector(".lsc-key--cmp")?.remove();
      paint();
    });

    const yMin = 0, yMax = 1000;
    let xMin, xMax;
    const updateXDomain = () => {
      const all = cmpPts && cmpPts.length ? basePts.concat(cmpPts) : basePts;
      if (!all.length) {
        xMin = 0;
        xMax = 1;
        return;
      }
      xMin = Math.floor(Math.min(...all.map(p => p.age)));
      xMax = Math.ceil(Math.max(...all.map(p => p.age)));
      if (xMax === xMin) xMax = xMin + 1;
    };
    updateXDomain();

    let activeIdx = null, activeSeries = "blue";

    function paint() {
      if (!basePts.length) return;
      updateXDomain();

      const rect = vp.getBoundingClientRect();
      const W = Math.max(320, Math.floor(rect.width));

      let H;
      if (window.innerWidth <= 480) H = 450;
      else if (window.innerWidth <= 720) H = 500;
      else H = 560;

      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const m = { l: 8, r: 8, t: 10, b: 48 };
      const cw = W - m.l - m.r;
      const ch = H - m.t - m.b;

      function normLSC(v) {
        const val = Math.max(0, Math.min(1000, Number(v) || 0));
        if (val <= 400) {
          const frac = val / 400;
          return frac * 0.25;
        } else if (val <= 800) {
          const frac = (val - 400) / 400;
          return 0.25 + frac * 0.5;
        } else {
          const frac = (val - 800) / 200;
          return 0.75 + frac * 0.25;
        }
      }

      const fy = (v) => {
        const u = normLSC(v);
        return m.t + ch - u * ch;
      };

      const fx = (v) => m.l + ((v - xMin) / (xMax - xMin)) * cw;

      const grid = sLocal("g", { class: "lsc-grid" });

      const y0 = fy(0);
      grid.appendChild(
        sLocal("line", {
          x1: m.l,
          y1: y0,
          x2: W - m.r,
          y2: y0,
          class: "hline0"
        })
      );

      [400, 600, 800].forEach(v => {
        const yy = fy(v);
        grid.appendChild(
          sLocal("line", {
            x1: m.l,
            y1: yy,
            x2: W - m.r,
            y2: yy,
            class: "hline"
          })
        );
      });

      svg.appendChild(grid);

      const yAxis = sLocal("g", { class: "lsc-yaxis" });
      const labelOffset = 6;

      [0, 400, 600, 800].forEach(v => {
        const yy = fy(v);
        yAxis.appendChild(
          sLocal("text", {
            x: m.l,
            y: yy - labelOffset,
            "text-anchor": "start"
          }, v === 0 ? "0" : `${v}P`)
        );
      });

      svg.appendChild(yAxis);

      const xAxis = sLocal("g", { class: "lsc-xaxis" });
      const tickLen = 8;

      const spanYears = xMax - xMin;
      let xStep = 1;
      if ((W < 720 && spanYears > 15) || (W >= 720 && spanYears > 30)) xStep = 5;
      const startTick = Math.ceil(xMin / xStep) * xStep;

      for (let v = startTick; v <= Math.floor(xMax); v += xStep) {
        const xx = fx(v);
        grid.appendChild(
          sLocal("line", {
            x1: xx,
            y1: m.t + ch,
            x2: xx,
            y2: m.t + ch + tickLen,
            class: "xtick"
          })
        );
        xAxis.appendChild(
          sLocal("text", {
            x: xx,
            y: m.t + ch + tickLen + 6,
            "text-anchor": "middle"
          }, String(v))
        );
      }

      xAxis.appendChild(
        sLocal("text", {
          x: m.l + cw / 2,
          y: m.t + ch + tickLen + 26,
          "text-anchor": "middle"
        }, "Alter")
      );

      svg.appendChild(xAxis);

      const defs = sLocal("defs");
      const gradBlueId = `lsc-grad-b-${Math.random().toString(36).slice(2)}`;
      const gradGreenId = `lsc-grad-g-${Math.random().toString(36).slice(2)}`;
      const mkGrad = (id, color) => {
        const g = sLocal("linearGradient", { id, x1: "0", y1: "0", x2: "0", y2: "1" });
        g.appendChild(sLocal("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.22" }));
        g.appendChild(sLocal("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" }));
        return g;
      };
      defs.appendChild(mkGrad(gradBlueId, "rgb(227,6,19)"));
      defs.appendChild(mkGrad(gradGreenId, "rgb(5,105,180)"));
      svg.appendChild(defs);

      const drawSeries = (pts, colorClass, withArea = false, fillId = null) => {
        if (!pts || !pts.length) return;

        const pathD = pts.map((p, i) => {
          const Y = Math.max(0, Math.min(1000, p.lsc));
          return `${i ? "L" : "M"}${fx(p.age)} ${fy(Y)}`;
        }).join(" ");

        if (withArea) {
          const last = pts[pts.length - 1];
          const first = pts[0];
          const areaD = pathD + ` L${fx(last.age)} ${y0} L${fx(first.age)} ${y0} Z`;
          svg.appendChild(
            sLocal("path", {
              d: areaD,
              class: `lsc-area ${colorClass}`,
              fill: `url(#${fillId})`
            })
          );
        }

        svg.appendChild(
          sLocal("path", {
            d: pathD,
            class: `lsc-line ${colorClass}`
          })
        );

        const dots = sLocal("g", { class: `lsc-dots ${colorClass}` });
        pts.forEach((p, idx) => {
          const Y = Math.max(0, Math.min(1000, p.lsc));
          const c = sLocal("circle", {
            cx: fx(p.age),
            cy: fy(Y),
            r: 4.5,
            class: "lsc-dot",
            tabindex: 0,
            "data-idx": idx,
            "data-series": colorClass,
            "data-name": (colorClass === "blue" ? (a?.name || "") : (cmpAth?.name || "")),
            "data-lsc": p.lsc.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
            "data-meet": p.meet_name || "—"
          });

          const show = () => {
            activeIdx = idx;
            activeSeries = colorClass;
            c.setAttribute("data-active", "1");
            const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
            tip.querySelector(".tt-l1").textContent = `${c.dataset.lsc} LSC${name}`;
            tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet || "—"}`;
            positionTipNearCircle(c);
          };
          const hide = () => {
            if (activeIdx === idx && activeSeries === colorClass) {
              activeIdx = null;
            }
            c.removeAttribute("data-active");
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden", "true");
          };

          c.addEventListener("pointerenter", show);
          c.addEventListener("pointerleave", hide);
          c.addEventListener("focus", show);
          c.addEventListener("blur", hide);
          c.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            show();
          });

          dots.appendChild(c);
        });
        svg.appendChild(dots);
      };

      if (cmpPts && cmpPts.length) {
        drawSeries(cmpPts, "green", true, gradGreenId);
      }
      drawSeries(basePts, "blue", true, gradBlueId);

      function positionTipNearCircle(circle) {
        const pt = svg.createSVGPoint();
        pt.x = +circle.getAttribute("cx");
        pt.y = +circle.getAttribute("cy");
        const scr = pt.matrixTransform(svg.getScreenCTM());
        const cardRect = card.getBoundingClientRect();
        const px = scr.x - cardRect.left;
        const py = scr.y - cardRect.top;

        tip.style.opacity = "1";
        tip.style.transform = "translate(0,0)";
        tip.setAttribute("aria-hidden", "false");
        tip.style.left = "0px";
        tip.style.top = "0px";
        const tr = tip.getBoundingClientRect();

        const offX = 6, offY = 10;
        let L = Math.round(px + offX - tr.width * 0.12);
        let T = Math.round(py - offY - tr.height - 6);
        const maxL = card.clientWidth - tr.width - 8;
        const maxT = card.clientHeight - tr.height - 8;
        L = Math.max(8, Math.min(L, maxL));
        T = Math.max(8, Math.min(T, maxT));
        tip.style.left = `${L}px`;
        tip.style.top = `${T}px`;
      }

      if (activeIdx != null) {
        const sel = `.lsc-dots.${activeSeries} .lsc-dot[data-idx="${activeIdx}"]`;
        const active = svg.querySelector(sel);
        if (active) positionTipNearCircle(active);
      }

      if (!card._lscOutsideHandlerAttached) {
        card.addEventListener("pointerdown", (e) => {
          if (!svg.contains(e.target)) {
            activeIdx = null;
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden", "true");
            svg.querySelectorAll('.lsc-dot[data-active="1"]').forEach(n => n.removeAttribute("data-active"));
          }
        }, { passive: true });
        card._lscOutsideHandlerAttached = true;
      }
    }

    const ro = new ResizeObserver(paint);
    ro.observe(vp);

    (async () => {
      try {
        const series = await buildCalculatedLSCSeries(a);
        basePts = series.length ? series : buildLSCSeries(a);
      } catch (error) {
        console.error("LSC-Verlauf konnte nicht berechnet werden:", error);
        basePts = buildLSCSeries(a);
      }

      if (!basePts.length) {
        showStatus("Keine LSC-Daten vorhanden.");
        return;
      }

      showChart();
      requestAnimationFrame(paint);
    })();

    return card;
  }

  function renderTimeChart(a) {
    const sLocal = (tag, attrs = {}, ...children) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([k, v]) => v != null && el.setAttribute(k, String(v)));
      children.flat().forEach(c => c != null && el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };
    const el = (tag, attrs = {}, ...children) => {
      const node = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) {
        if (k === "class") node.className = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
      }
      children.flat().forEach(c => c != null && node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return node;
    };

    const card = el("div", { class: "ath-time-card" });

    const firstWithData = DISCIPLINES.find(d => buildTimeSeriesForDiscipline(a, d.key).length > 0);
    let discKey = (firstWithData || DISCIPLINES[0]).key;

    const lanes = new Set(["25", "50"]);

    let basePts = [], cmpAth = null, cmpPts = null;

    const btn50 = el("button", {
      class: "seg-btn active", type: "button", "aria-pressed": "true",
      onclick: () => toggleLane("50", btn50)
    }, "50m");

    const btn25 = el("button", {
      class: "seg-btn active", type: "button", "aria-pressed": "true",
      onclick: () => toggleLane("25", btn25)
    }, "25m");

    const laneSeg = el("div", { class: "seg time-lanes" }, btn50, btn25);

    const sel = el("select", { class: "time-disc" });
    DISCIPLINES.forEach(d => {
      sel.appendChild(el("option", { value: d.key, selected: d.key === discKey }, d.label));
    });
    sel.addEventListener("change", () => {
      discKey = sel.value;
      recomputeSeries();
      paint();
    });

    const head = el("div", { class: "time-head" },
      el("h4", {}, "Zeit-Verlauf"),
      sel,
      laneSeg
    );
    card.appendChild(head);
    recomputeSeries();

    function setBtnState(btn, on) {
      btn.classList.toggle("active", !!on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }

    function toggleLane(code, btn) {
      const isOn = lanes.has(code);
      if (isOn && lanes.size === 1) return;
      if (isOn) lanes.delete(code); else lanes.add(code);
      setBtnState(btn, lanes.has(code));
      recomputeSeries();
      paint();
    }

    function recomputeSeries() {
      basePts = buildTimeSeriesForDiscipline(a, discKey, { lanes });
      if (cmpAth) {
        const full = withHydratedMeets(cmpAth);
        const merged = mergeDuplicateMeets(full.meets);
        cmpPts = buildTimeSeriesForDiscipline({ ...full, meets: merged }, discKey, { lanes });
      } else {
        cmpPts = null;
      }
    }

    const Y_SPEC = {
      "50_retten": { base: 25, step: 5 },
      "100_retten_flosse": { base: 40, step: 10 },
      "100_kombi": { base: 50, step: 10 },
      "100_lifesaver": { base: 40, step: 10 },
      "200_super": { base: 120, step: 10 },
      "200_hindernis": { base: 110, step: 10 }
    };

    function getYAxisBaseSecSpec(dKey) { return (Y_SPEC[dKey]?.base ?? 0); }
    function getYAxisStepSec(dKey) { return (Y_SPEC[dKey]?.step ?? 30); }

    const ceilToStep = (sec, step) => Math.ceil(sec / step) * step;

    const vp = el("div", { class: "time-viewport" });
    const svg = sLocal("svg", { class: "time-svg", role: "img", "aria-label": "Zeit-Verlauf" });
    vp.appendChild(svg);
    card.appendChild(vp);

    const tip = el("div", { class: "time-tooltip", "aria-hidden": "true" },
      el("div", { class: "tt-l1" }),
      el("div", { class: "tt-l2" })
    );
    card.appendChild(tip);

    const legend = el("div", { class: "time-legend" },
      el("span", { class: "time-key time-key--base" },
        el("span", { class: "time-key-dot blue" }), el("span", { class: "time-key-label" }, a?.name || "Athlet A")
      )
    );
    card.appendChild(legend);

    const cmpWrap = el("div", { class: "time-compare-wrap" });
    const cmpInput = el("input", { class: "time-input", type: "search", placeholder: "Athlet zum Vergleich suchen …", autocomplete: "off", role: "searchbox" });
    const clearBtn = el("button", { class: "time-clear hidden", type: "button" }, "Entfernen");
    const suggest = el("div", { class: "time-suggest hidden", role: "listbox" });
    cmpWrap.appendChild(el("div", { class: "time-search-row" }, cmpInput, clearBtn));
    cmpWrap.appendChild(suggest);
    card.appendChild(cmpWrap);

    let cmpQuery = "", cmpResults = [], cmpActive = -1;
    const normalizeLocal2 = (s) => (s || "").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

    function renderCapAvatarForSuggest(ax, size = "sm", extraClass = "") {
      const fn = global?.ProfileHead?.renderCapAvatar;
      const node = (typeof fn === "function") ? fn(ax, size, extraClass) : renderCapAvatarLocal(ax, size, extraClass);
      return (node instanceof Node) ? node : renderCapAvatarLocal(ax, size, extraClass);
    }


    function updateCmpSuggest() {
      const q = cmpQuery.trim();
      suggest.innerHTML = "";
      if (q.length < MIN_QUERY_LEN) {
        suggest.appendChild(el("div", { class: "time-suggest-empty" }, `Mind. ${MIN_QUERY_LEN} Zeichen eingeben`));
        suggest.classList.remove("hidden"); return;
      }
      const nq = normalizeLocal2(q);
      const pool = (getAthletesPool() || []).filter(x => x?.id !== a?.id);
      const list = pool.map(ax => ({ ax, n: normalizeLocal2(ax.name) }))
        .filter(x => x.n.includes(nq))
        .sort((l, r) => {
          const al = l.n.startsWith(nq) ? 0 : 1;
          const ar = r.n.startsWith(nq) ? 0 : 1;
          return (al - ar) || l.n.localeCompare(r.n);
        })
        .slice(0, 8);
      cmpResults = list.map(x => x.ax);
      cmpActive = cmpResults.length ? 0 : -1;

      if (!cmpResults.length) {
        suggest.appendChild(el("div", { class: "time-suggest-empty" }, "Keine Treffer"));
        suggest.classList.remove("hidden"); return;
      }

      cmpResults.forEach((ax, idx) => {
        const item = el("div", { class: "time-suggest-item" + (idx === cmpActive ? " active" : ""), role: "option", "aria-selected": idx === cmpActive ? "true" : "false" });
        item.appendChild(renderCapAvatarForSuggest(ax, "sm", "time-suggest-avatar"));
        const text = el("div", { class: "time-suggest-text" },
          el("div", { class: "time-suggest-name" }, ax.name, " ", el("span", { class: "time-year" }, `(${ax.jahrgang})`)),
          el("div", { class: "time-suggest-sub" }, "DLRG ", currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "")
        );
        item.appendChild(text);
        item.addEventListener("click", () => { chooseCmp(ax); });
        item.addEventListener("mouseenter", () => { suggest.querySelector(".active")?.classList.remove("active"); item.classList.add("active"); cmpActive = idx; });
        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    }

    function hideCmpSuggest() { suggest.classList.add("hidden"); }

    function chooseCmp(ax) {
      const full = withHydratedMeets(ax);
      const merged = mergeDuplicateMeets(full.meets);

      cmpAth = { ...full, meets: merged };
      recomputeSeries();
      paint();

      legend.querySelector(".time-key--cmp")?.remove();
      legend.appendChild(
        el("span", { class: "time-key time-key--cmp" },
          el("span", { class: "time-key-dot green" }),
          el("span", { class: "time-key-label" }, cmpAth.name)
        )
      );

      clearBtn.classList.remove("hidden");
      hideCmpSuggest();
      dismissKeyboard();
      cmpInput.value = cmpQuery = "";
      paint();
    }

    cmpInput.addEventListener("input", e => { cmpQuery = e.target.value || ""; updateCmpSuggest(); });
    cmpInput.addEventListener("keydown", e => {
      if (!cmpResults.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); cmpActive = (cmpActive + 1) % cmpResults.length; updateCmpSuggest(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cmpActive = (cmpActive - 1 + cmpResults.length) % cmpResults.length; updateCmpSuggest(); }
      else if (e.key === "Enter") { e.preventDefault(); chooseCmp(cmpResults[cmpActive >= 0 ? cmpActive : 0]); }
      else if (e.key === "Escape") { hideCmpSuggest(); }
    });
    document.addEventListener("click", (e) => { if (!cmpWrap.contains(e.target)) hideCmpSuggest(); });
    clearBtn.addEventListener("click", () => {
      cmpAth = null; cmpPts = null;
      clearBtn.classList.add("hidden");
      legend.querySelector(".time-key--cmp")?.remove();
      recomputeSeries();
      paint();
    });

    const mmss = (sec) => {
      if (!Number.isFinite(sec)) return "—";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const cs = Math.round((sec - Math.floor(sec)) * 100);
      const sPart = m ? String(s).padStart(2, "0") : String(s);
      return (m ? `${m}:${sPart}` : sPart) + "." + String(cs).padStart(2, "0");
    };

    let xMin, xMax, yMin, yMax, activeIdx = null, activeSeries = "blue";
    const updateDomains = () => {
      const all = (cmpPts && cmpPts.length) ? basePts.concat(cmpPts) : basePts;

      if (!all.length) { xMin = 0; xMax = 1; }
      else {
        xMin = Math.floor(Math.min(...all.map(p => p.age)));
        xMax = Math.ceil(Math.max(...all.map(p => p.age)));
        if (xMax === xMin) xMax = xMin + 1;
      }

      const base = getYAxisBaseSecSpec(discKey);
      const step = getYAxisStepSec(discKey);
      const maxData = all.length ? Math.max(...all.map(p => p.sec)) : base + step * 3;

      yMin = base;
      const wanted = Math.max(maxData, base + step * 2);
      yMax = ceilToStep(wanted, step);
      if (yMax <= yMin) yMax = yMin + step;
    };

    function paint() {
      updateDomains();

      const rect = vp.getBoundingClientRect();
      const W = Math.max(320, Math.floor(rect.width));

      let H;
      if (window.innerWidth <= 480) H = 450;
      else if (window.innerWidth <= 720) H = 500;
      else H = 560;

      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const m = { l: 8, r: 8, t: 28, b: 48 };
      const cw = W - m.l - m.r;
      const ch = H - m.t - m.b;
      const fx = v => m.l + ((v - xMin) / (xMax - xMin)) * cw;
      const fy = v => m.t + ch - ((v - yMin) / (yMax - yMin)) * ch;

      const grid = sLocal("g", { class: "time-grid" });
      const yAxis = sLocal("g", { class: "time-yaxis" });

      const yStep = getYAxisStepSec(discKey);
      for (let v = yMin, first = true; v <= yMax + 1e-9; v += yStep) {
        const yy = fy(v);
        grid.appendChild(sLocal("line", { x1: m.l, y1: yy, x2: W - m.r, y2: yy, class: first ? "hline0" : "hline" }));
        yAxis.appendChild(
          sLocal("text", { x: m.l, y: yy, "text-anchor": "start", "dominant-baseline": "middle" }, mmss(v))
        );
        first = false;
      }

      const spanYears = xMax - xMin;
      let xStep = 1;
      if ((W < 720 && spanYears > 15) || (W >= 720 && spanYears > 30)) xStep = 5;
      const startTick = Math.ceil(xMin / xStep) * xStep;

      const xAxis = sLocal("g", { class: "time-xaxis" });
      const tickLen = 8;

      for (let v = startTick; v <= Math.floor(xMax); v += xStep) {
        const xx = fx(v);
        grid.appendChild(sLocal("line", { x1: xx, y1: m.t + ch, x2: xx, y2: m.t + ch + tickLen, class: "xtick" }));
        xAxis.appendChild(sLocal("text", { x: xx, y: m.t + ch + tickLen + 6, "text-anchor": "middle" }, String(v)));
      }
      xAxis.appendChild(sLocal("text", { x: m.l + cw / 2, y: m.t + ch + tickLen + 26, "text-anchor": "middle" }, "Alter"));

      yAxis.appendChild(sLocal("text", { x: m.l, y: m.t - 4, "text-anchor": "start" }, ""));

      svg.appendChild(grid);
      svg.appendChild(xAxis);
      svg.appendChild(yAxis);

      const defs = sLocal("defs");
      const gidB = `time-grad-b-${Math.random().toString(36).slice(2)}`;
      const gidG = `time-grad-g-${Math.random().toString(36).slice(2)}`;
      const mkGrad = (id, color) => {
        const g = sLocal("linearGradient", { id, x1: "0", y1: "0", x2: "0", y2: "1" });
        g.appendChild(sLocal("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.22" }));
        g.appendChild(sLocal("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" }));
        return g;
      };
      defs.appendChild(mkGrad(gidB, "rgb(227,6,19)"));
      defs.appendChild(mkGrad(gidG, "rgb(5,105,180)"));
      svg.appendChild(defs);

      const drawSeries = (pts, colorClass, withArea = false, fillId = null) => {
        if (!pts || !pts.length) return;
        const pathD = pts.map((p, i) => `${i ? "L" : "M"}${fx(p.age)} ${fy(p.sec)}`).join(" ");
        if (withArea) {
          const areaD = `${pathD} L${fx(pts[pts.length - 1].age)} ${fy(yMin)} L${fx(pts[0].age)} ${fy(yMin)} Z`;
          svg.appendChild(sLocal("path", { d: areaD, class: `time-area ${colorClass}`, fill: `url(#${fillId})` }));
        }
        svg.appendChild(sLocal("path", { d: pathD, class: `time-line ${colorClass}` }));

        const dots = sLocal("g", { class: `time-dots ${colorClass}` });
        pts.forEach((p, idx) => {
          const c = sLocal("circle", {
            cx: fx(p.age), cy: fy(p.sec), r: 4.5, class: "time-dot", tabindex: 0,
            "data-idx": idx, "data-series": colorClass,
            "data-name": (colorClass === "blue" ? (a?.name || "") : (cmpAth?.name || "")),
            "data-time": mmss(p.sec),
            "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
            "data-meet": p.meet_name || "—",
            "data-round": p.round || ""
          });
          const show = () => {
            activeIdx = idx; activeSeries = colorClass;
            c.setAttribute("data-active", "1");
            const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
            tip.querySelector(".tt-l1").textContent = `${c.dataset.time}${name}`;
            const roundTxt = c.dataset.round ? ` (${c.dataset.round})` : "";
            tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet}${roundTxt}`;
            positionTip(c);
          };
          const hide = () => {
            if (activeIdx === idx && activeSeries === colorClass) { activeIdx = null; }
            c.removeAttribute("data-active");
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden", "true");
          };
          c.addEventListener("pointerenter", show);
          c.addEventListener("pointerleave", hide);
          c.addEventListener("focus", show);
          c.addEventListener("blur", hide);
          c.addEventListener("pointerdown", (e) => { e.stopPropagation(); show(); });
          dots.appendChild(c);
        });
        svg.appendChild(dots);
      };

      if (cmpPts && cmpPts.length) { drawSeries(cmpPts, "green", true, gidG); }
      if (basePts.length) { drawSeries(basePts, "blue", true, gidB); }

      function positionTip(circle) {
        const pt = svg.createSVGPoint();
        pt.x = +circle.getAttribute("cx");
        pt.y = +circle.getAttribute("cy");
        const scr = pt.matrixTransform(svg.getScreenCTM());
        const cardRect = card.getBoundingClientRect();
        const px = scr.x - cardRect.left;
        const py = scr.y - cardRect.top;

        tip.style.opacity = "1";
        tip.style.transform = "translate(0,0)";
        tip.setAttribute("aria-hidden", "false");
        tip.style.left = "0px"; tip.style.top = "0px";
        const tr = tip.getBoundingClientRect();

        const offX = 6, offY = 10;
        let L = Math.round(px + offX - tr.width * 0.12);
        let T = Math.round(py - offY - tr.height - 6);
        const maxL = card.clientWidth - tr.width - 8;
        const maxT = card.clientHeight - tr.height - 8;
        L = Math.max(8, Math.min(L, maxL));
        T = Math.max(8, Math.min(T, maxT));
        tip.style.left = `${L}px`;
        tip.style.top = `${T}px`;
      }

      if (activeIdx != null) {
        const sel = `.time-dots.${activeSeries} .time-dot[data-idx="${activeIdx}"]`;
        const active = svg.querySelector(sel);
        if (active) positionTip(active);
      }

      if (!card._timeOutsideHandlerAttached) {
        card.addEventListener("pointerdown", (e) => {
          if (!svg.contains(e.target)) {
            activeIdx = null;
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden", "true");
            svg.querySelectorAll('.time-dot[data-active="1"]').forEach(n => n.removeAttribute("data-active"));
          }
        }, { passive: true });
        card._timeOutsideHandlerAttached = true;
      }

      if (!basePts.length && !(cmpPts && cmpPts.length)) {
        const empty = el("div", { class: "best-empty" },
          "Keine Zeiten für ", (DISCIPLINES.find(d => d.key === discKey)?.label || "diese Disziplin"), "."
        );
        svg.appendChild(sLocal("g"));
        if (!card.querySelector(".best-empty")) card.appendChild(empty);
      } else {
        card.querySelector(".best-empty")?.remove();
      }
    }

    const ro = new ResizeObserver(paint);
    ro.observe(vp);
    requestAnimationFrame(paint);

    return card;
  }


  ProfileTabsCharts.renderDisciplinePieCard = renderDisciplinePieCard;
  ProfileTabsCharts.renderLSCChart = renderLSCChart;
  ProfileTabsCharts.renderTimeChart = renderTimeChart;
  ProfileTabsCharts.deriveFromMeets = deriveFromMeets;
  global.ProfileTabsCharts = ProfileTabsCharts;
})(window);
