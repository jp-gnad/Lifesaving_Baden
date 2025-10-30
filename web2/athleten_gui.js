// athleten_gui.js
(function () {
  // ---------- Mini-Helfer ----------
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  };
  const hDiv = h; // Kurzform

  // ---------- Konstanten / Pfade ----------
  const FLAG_BASE_URL = "./svg"; // dein SVG-Ordner

  // Zählt Starts je Startrecht (OG/BZ/LV/BV)
  function countStartrechte(a){
    const c = { OG:0, BZ:0, LV:0, BV:0 };
    if (!Array.isArray(a?.meets)) return c;
    for (const m of a.meets){
      const sr = String(m?.Startrecht || "").toUpperCase();
      if (sr in c) c[sr] += 1;
    }
    return c;
  }

  // Baut Zeit-Punkte für eine Disziplin (alle Läufe mit gültiger Zeit; DQ wird ignoriert)
  function buildTimeSeriesForDiscipline(a, discKey){
    const dMeta = DISCIPLINES.find(d => d.key === discKey);
    if (!dMeta) return [];
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];

    const byDate = new Map();
    for (const m of Array.isArray(a.meets) ? a.meets : []){
      const dateISO = String(m?.date || "").slice(0,10);
      if (!dateISO) continue;

      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      let best = { lauf: -1, sec: NaN, meet_name: "" };

      for (const r of runs){
        const lauf = Number(r?._lauf || r?.Vorläufe || 1);
        const raw  = r?.[dMeta.meetZeit] ?? m?.[dMeta.meetZeit] ?? "";
        const sec  = parseTimeToSec(raw);
        if (Number.isFinite(lauf) && Number.isFinite(sec) && lauf >= best.lauf){
          best = { lauf, sec, meet_name: String(m.meet_name || m.meet || "").replace(/\s+-\s+.*$/, "").trim() };
        }
      }
      if (!Number.isFinite(best.sec)) continue;

      const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);
      const ageYears = (new Date(dateISO) - birth) / (365.2425*24*3600*1000);
      const age = Math.round(ageYears * 100) / 100;

      byDate.set(dateISO, { age, sec: best.sec, date: dateISO, meet_name: best.meet_name });
    }

    return Array.from(byDate.values()).sort((l, r) => new Date(l.date) - new Date(r.date));
  }



  // ---------- Disziplin-Verteilung (Donut) ----------

  // Zählt Starts je Disziplin über alle Meets (DQ zählt als Start)
  function countStartsPerDisciplineAll(a){
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const out = {};
    for (const d of DISCIPLINES){ out[d.key] = 0; }

    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        for (const d of DISCIPLINES){
          const v = run[d.meetZeit];
          if (v != null && String(v).trim() !== "") out[d.key] += 1;
        }
      }
    }
    return out;
  }

  function renderDisciplinePieCard(a){
    const counts = countStartsPerDisciplineAll(a);

    // Gewünschte feste Reihenfolge = Reihenfolge in DISCIPLINES
    // (50 Retten → 100 Retten m. Flossen → 100 Kombi → 100 Lifesaver → 200 Super → 200 Hindernis)
    const ordered = DISCIPLINES.map(d => ({
      key: d.key,
      label: d.label,
      count: Number(counts[d.key] || 0)
    })).filter(x => x.count > 0); // nur vorhandene anzeigen (Reihenfolge bleibt gleich)

    const total = ordered.reduce((s,x)=>s + x.count, 0);

    const card  = document.createElement("div");
    card.className = "ath-pie-card";

    const head = document.createElement("div");
    head.className = "pie-head";
    head.innerHTML = "<h4>Disziplin-Verteilung</h4>";
    card.appendChild(head);

    if (total === 0){
      const empty = document.createElement("div");
      empty.className = "best-empty";
      empty.textContent = "Noch keine Starts erfasst.";
      card.appendChild(empty);
      return card;
    }

    // Prozente runden (0 NK) – Reihenfolge bleibt wie oben
    ordered.forEach(it => { it.pct = Math.round((it.count/total)*100); });

    const wrap = document.createElement("div");
    wrap.className = "pie-wrap";
    card.appendChild(wrap);

    // --- SVG Donut ---
    const W = 360, H = 360, cx = W/2, cy = H/2;
    const R  = 140, r = 80;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class","pie-svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    function segPath(cx, cy, R, r, start, end){
      const large = end - start > Math.PI ? 1 : 0;
      const x0 = cx + R*Math.cos(start), y0 = cy + R*Math.sin(start);
      const x1 = cx + R*Math.cos(end),   y1 = cy + R*Math.sin(end);
      const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
      const x3 = cx + r*Math.cos(start), y3 = cy + r*Math.sin(start);
      return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    }

    // DLRG-nahe Farbzuteilung passend zur festen Reihenfolge
    const CLASS_MAP = {
      "50_retten":         "pie-c-200h",   
      "100_retten_flosse": "pie-c-100k", 
      "100_kombi":         "pie-c-100l",  
      "100_lifesaver":     "pie-c-200s",  
      "200_super":         "pie-c-50r",  
      "200_hindernis":     "pie-c-100rf"  
    };

    let angle = -Math.PI/2;
    ordered.forEach(it => {
      const sweep = (it.count/total) * Math.PI*2;
      if (sweep <= 0) return;
      const path  = document.createElementNS(svgNS, "path");
      path.setAttribute("d", segPath(cx,cy,R,r, angle, angle + sweep));
      path.setAttribute("class", `pie-slice ${CLASS_MAP[it.key] || ""}`);
      const title = document.createElementNS(svgNS, "title");
      title.textContent = `${it.label}: ${it.pct}% (${it.count})`;
      path.appendChild(title);
      svg.appendChild(path);
      angle += sweep;
    });

    // Center-Label
    const center = document.createElementNS(svgNS, "g");
    center.setAttribute("class", "pie-center");
    const t1 = document.createElementNS(svgNS, "text");
    t1.setAttribute("x", cx); t1.setAttribute("y", cy - 6);
    t1.setAttribute("text-anchor","middle"); t1.setAttribute("class","c1");
    t1.textContent = `${total}`;
    const t2 = document.createElementNS(svgNS, "text");
    t2.setAttribute("x", cx); t2.setAttribute("y", cy + 16);
    t2.setAttribute("text-anchor","middle"); t2.setAttribute("class","c2");
    t2.textContent = "Starts";
    center.append(t1,t2);
    svg.appendChild(center);

    // Legende – gleiche feste Reihenfolge
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



  function poolLabel(pool){
    return pool === "25" ? "25m" : (pool === "50" ? "50m" : "—");
  }

  // Key für "gleiches Event": meet_name + date (beides normalisiert)
  function meetKey(m){
    const name = String(m?.meet_name || "").trim().toLowerCase();
    const date = String(m?.date || "").trim();
    return name + "||" + date;
  }

  function nonEmpty(v){ return v != null && String(v).trim() !== ""; }
    
  // nimmt ein Array von Meets und gibt zusammengefasste Meets zurück
  function mergeDuplicateMeets(meets){
    const list = Array.isArray(meets) ? meets.slice() : [];
    const groups = new Map();

    // 1) gruppieren
    list.forEach((m, idx) => {
      if (!m || !m.meet_name) return;
      const k = meetKey(m);
      if (!groups.has(k)) groups.set(k, []);
      // Lauf-Index merken (Reihenfolge in der Quelle => Laufnummer)
      groups.get(k).push({ ...m, _lauf: (groups.get(k).length + 1), _srcIndex: idx });
    });

    const merged = [];

    // 2) jede Gruppe zusammenfassen
    for (const runs of groups.values()){
      // Sortiert nach ursprünglicher Reihenfolge → Lauf 1, 2, ...
      runs.sort((a,b) => a._srcIndex - b._srcIndex);

      const highest = runs[runs.length - 1]; // höchster Lauf
      const out = { ...highest };            // Meta vom höchsten Lauf
      out._runs = runs.map(r => ({ ...r })); // volle Transparenz der Läufe
      out._lauf_max = runs.length;

      // Für alle Disziplinfelder: Wert vom höchsten Lauf, falls vorhanden;
      // sonst fallback auf ersten vorhandenen in (Lauf absteigend).
      const ALL_TIME_FIELDS = MEET_DISC_TIME_FIELDS.slice();
      const PLACE_FIELDS = MEET_DISC_TIME_FIELDS.map(f => f.replace(/_Zeit$/i, "_Platz"));

      function pickFromHighest(field){
        for (let i = runs.length - 1; i >= 0; i--){
          if (nonEmpty(runs[i][field])) return runs[i][field];
        }
        return ""; // leer, wenn keiner
      }

      ALL_TIME_FIELDS.forEach(f => { out[f] = pickFromHighest(f); });
      PLACE_FIELDS.forEach(f => { out[f] = pickFromHighest(f); });

      // Mehrkampf/LSC/Wertung/Startrecht/Regelwerk etc. → auch vom höchsten Lauf
      out.Mehrkampf_Platz = pickFromHighest("Mehrkampf_Platz");
      out.LSC             = pickFromHighest("LSC");
      out.Wertung         = highest.Wertung || out.Wertung || "";
      out.Startrecht      = highest.Startrecht || out.Startrecht || "";
      out.Regelwerk       = highest.Regelwerk || out.Regelwerk || "";
      out.Ortsgruppe      = highest.Ortsgruppe || out.Ortsgruppe || "";
      out.pool            = highest.pool || out.pool;
      out.Land            = highest.Land || out.Land;

      merged.push(out);
    }

    // nach Datum absteigend wie gehabt
    merged.sort((l, r) => new Date(r.date) - new Date(l.date));
    return merged;
  }


  function fmtDateShort(dStr){
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    const months = ["Jan.","Feb.","März","Apr.","Mai","Jun.","Jul.","Aug.","Sep.","Okt.","Nov.","Dez."];
    return `${d.getDate()}. ${months[d.getMonth()]}`;
  }

  const LAND_TO_ISO3 = {
    "Deutschland":"GER",
    "Schweiz":"SUI",
    "Italien":"ITA",
    "Frankreich":"FRA",
    "Belgien":"BEL",
    "Niederlande":"NED",
    "Spanien":"ESP",
    "Polen":"POL",
    "Japan":"JPN",
    "Dänemark":"DEN",
    "Ägypten":"EGY",
    "Großbritannien":"GBR",
  };

  function iso3FromLand(landName){
    return LAND_TO_ISO3[String(landName||"").trim()] || "—";
  }

  function medalForPlace(placeStr){
    const p = parseInt(placeStr, 10);
    if (!Number.isFinite(p)) return null;
    if (p === 1) return { file:"medal_gold.svg",   alt:"Gold"   };
    if (p === 2) return { file:"medal_silver.svg", alt:"Silber" };
    if (p === 3) return { file:"medal_bronze.svg", alt:"Bronze" };
    return null;
  }

  function roundLabelFromIndex(idx, total){
    // idx = 1-basiert (Lauf 1, 2, ...)
    if (!Number.isFinite(total) || total <= 1) return null;

    // Explizite Fälle
    if (total === 2) return idx === 1 ? "Vorlauf" : "Finale";
    if (total === 3) return idx === 1 ? "Vorlauf" : (idx === 2 ? "Halbfinale" : "Finale");
    if (total === 4) return idx === 1 ? "Vorlauf" : (idx === 2 ? "Viertelfinale" : (idx === 3 ? "Halbfinale" : "Finale"));

    // Fallback (selten >4): alles vor letztem = "Vorlauf", vorletztes = "Halbfinale", drittletztes = "Viertelfinale", letztes = "Finale"
    if (idx === total) return "Finale";
    if (idx === total - 1) return "Halbfinale";
    if (idx === total - 2) return "Viertelfinale";
    return "Vorlauf";
  }


  function shortMeetName(name){
    if (!name) return "—";
    const s = String(name);
    const i = s.indexOf(" - ");
    return (i >= 0 ? s.slice(0, i) : s).trim();
  }

  function renderAthTabsAndPanels(ax){
    const panels = h("div", { class: "ath-tab-panels" },
      h("div", { class: "ath-tab-panel", "data-key": "bests" }, renderBestzeitenSection(ax)),
      h("div", { class: "ath-tab-panel", "data-key": "info"  }, renderOverviewSection(ax)),
      h("div", { class: "ath-tab-panel", "data-key": "meets" }, renderMeetsSection(ax))
    );

    const tabs = renderAthTabs(["Bestzeiten","Info","Wettkämpfe"], "Bestzeiten", (key) => {
      panels.querySelectorAll(".ath-tab-panel").forEach(p => {
        p.classList.toggle("active", p.dataset.key === key);
      });
    });

    const wrap = h("div", { class: "ath-tabs-wrap" }, tabs, panels);

    // Initial: Panel "bests" aktiv + Unterline korrekt positionieren,
    // nachdem wrap im DOM ist (verhindert 0px-Messungen).
    requestAnimationFrame(() => {
      panels.querySelectorAll(".ath-tab-panel").forEach(p =>
        p.classList.toggle("active", p.dataset.key === "bests")
      );
      const activeBtn = wrap.querySelector(".ath-tab.active") || wrap.querySelector(".ath-tab");
      if (activeBtn) {
        const ul  = wrap.querySelector(".ath-tabs-underline");
        const lst = wrap.querySelector(".ath-tabs-list");
        const pr  = lst.getBoundingClientRect();
        const tr  = activeBtn.getBoundingClientRect();
        ul.style.width = tr.width + "px";
        ul.style.left  = (tr.left - pr.left) + "px";
      }
    });

    return wrap;
  }


  function renderAthTabs(labels, activeLabel, onChange){
    const map = { "Bestzeiten":"bests", "Info":"info", "Wettkämpfe":"meets" };
    const bar  = h("div", { class: "ath-tabs full-bleed" });
    const list = h("div", { class: "ath-tabs-list" });
    const ul   = h("div", { class: "ath-tabs-underline" });

    let activeBtn = null;

    labels.forEach(lbl => {
      const key = map[lbl] || lbl.toLowerCase();
      const btn = h("button", {
        class: "ath-tab" + (lbl === activeLabel ? " active" : ""),
        type: "button",
        onclick: () => setActive(btn, key)
      }, lbl.toUpperCase());
      list.appendChild(btn);
      if (lbl === activeLabel) activeBtn = btn;
    });

    bar.appendChild(list);
    bar.appendChild(ul);

    function positionUnderline(btn){
      const r = btn.getBoundingClientRect();
      const p = list.getBoundingClientRect();
      ul.style.width = r.width + "px";
      ul.style.left  = (r.left - p.left) + "px";
    }
    function setActive(btn, key){
      list.querySelectorAll(".ath-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      positionUnderline(btn);
      onChange?.(key);
    }

    // initiale Position nach Layout
    requestAnimationFrame(() => activeBtn && positionUnderline(activeBtn));
    window.addEventListener("resize", () => {
      const cur = list.querySelector(".ath-tab.active");
      cur && positionUnderline(cur);
    });

    return bar;
  }

  // sehr einfache Wettkampf-Liste (du kannst später erweitern)
  function renderMeetsSection(a){
    const allMeets = Array.isArray(a.meets) ? a.meets.slice() : [];
    if (!allMeets.length){
      const emptyBox = h("div", { class: "ath-profile-section meets" },
        h("div", { class: "ath-info-header" }, h("h3", {}, "Wettkämpfe (—)")),
        h("div", { class: "best-empty" }, "Keine Wettkämpfe erfasst.")
      );
      return emptyBox;
    }

    // verfügbare Jahre (neueste zuerst)
    const years = Array.from(new Set(
      allMeets
        .map(m => (new Date(m.date)).getFullYear())
        .filter(y => Number.isFinite(y))
    )).sort((a,b) => b - a);

    let idx = 0; // start: neuestes Jahr
    const box   = h("div", { class: "ath-profile-section meets" });

    // Kopf mit Jahres-Navigation
    const title = h("h3", {}, "");
    const head  = h("div", { class: "ath-info-header meets-head" },
      // links: älteres Jahr (Vergangenheit)
      h("button", { class: "nav-btn", type: "button", onclick: () => changeYear(+1) }, "‹"),
      title,
      // rechts: neueres Jahr (Zukunft)
      h("button", { class: "nav-btn", type: "button", onclick: () => changeYear(-1) }, "›")
    );


    const listWrap = h("div", { class: "meets-list" });
    box.appendChild(head);
    box.appendChild(listWrap);

    paint(years[idx]);

    return box;

    function changeYear(delta){
      const next = idx + delta;
      if (next < 0 || next >= years.length) return;
      idx = next;
      paint(years[idx]);
    }

    function paint(year){
      title.textContent = year;

      // Meets dieses Jahres, neueste zuerst
      const items = allMeets
        .filter(m => (new Date(m.date)).getFullYear() === year)
        .sort((l, r) => new Date(r.date) - new Date(l.date));

      listWrap.innerHTML = "";
      if (!items.length){
        listWrap.appendChild(h("div", { class: "best-empty" }, "Keine Wettkämpfe in diesem Jahr."));
        return;
      }

      items.forEach(m => {
        // Platzierung (Zahl ohne #) + ggf. Medaille
        const placeStr = (m.Mehrkampf_Platz || "").toString().trim();
        const medal    = medalForPlace(placeStr);

        const placeEl = h("span", { class: "m-place" },
          placeStr ? placeStr : "—",
          medal ? h("img", {
            class: "m-medal",
            src: `${FLAG_BASE_URL}/${medal.file}`,
            alt: medal.alt,
            loading: "lazy",
            decoding: "async",
            onerror: (e)=>e.currentTarget.remove()
          }) : null
        );

        // Bahn
        const poolEl = h("span", { class: "m-pool" }, poolLabel(m.pool));

        // Land: Flagge + ISO3
        const landName = (m.Land || "").toString().trim();
        const iso3 = iso3FromLand(landName);
        const landEl = h("span", { class: "m-country" },
          h("img", {
            class: "m-flag",
            src: `${FLAG_BASE_URL}/${encodeURIComponent(landName)}.svg`,
            alt: landName || "Land",
            loading: "lazy",
            decoding: "async",
            onerror: (e)=>e.currentTarget.remove()
          }),
          h("span", { class: "m-iso" }, ` ${iso3}`)
        );

        // Datum kurz
        const dateEl = h("span", { class: "m-date" }, fmtDateShort(m.date));
        const nameEl = h("span", { class: "m-name" },
          (m.meet_name || "—").replace(/\s+-\s+.*$/, "")
        );

        const row = h("div", {
          class: "meet-row",
          role: "button",
          tabindex: "0",
          "aria-expanded": "false",
          onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } },
          onclick: toggle
        },
          dateEl,
          placeEl,
          nameEl,
          landEl,
          poolEl
        );

        const details = h("div", {
          class: "meet-details",
          "aria-hidden": "true",
          style: "height:0"    // Startzustand für Animation
        }, ...buildResultRows(m));


        listWrap.appendChild(row);
        listWrap.appendChild(details);

        function toggle(){
          const isOpen = row.classList.toggle("open");
          row.setAttribute("aria-expanded", isOpen ? "true" : "false");
          if (isOpen) expand(details); else collapse(details);
        }

        function expand(el){
          el.setAttribute("aria-hidden", "false");
          // von 0 → Zielhöhe
          el.style.height = el.scrollHeight + "px";
          // nach Ende: auf auto setzen, damit Inhalte mitwachsen
          el.addEventListener("transitionend", () => {
            if (row.classList.contains("open")) el.style.height = "auto";
          }, { once: true });
        }

        function collapse(el){
          el.setAttribute("aria-hidden", "true");
          // von aktueller Höhe (auto → erst messen) → 0
          if (el.style.height === "" || el.style.height === "auto"){
            el.style.height = el.scrollHeight + "px";
          }
          requestAnimationFrame(() => {
            el.style.height = "0px";
          });
        }
      });
    }

    // Disziplin-Schlüssel (wie in deinen Meet-Objekten)
    function buildResultRows(m){
      const F = [
        { base:"50m_Retten",            label:"50m Retten" },
        { base:"100m_Retten",           label:"100m Retten mit Flossen" },
        { base:"100m_Kombi",            label:"100m Kombi" },
        { base:"100m_Lifesaver",        label:"100m Lifesaver" },
        { base:"200m_SuperLifesaver",   label:"200m Super Lifesaver" },
        { base:"200m_Hindernis",        label:"200m Hindernis" },
      ];

      // Läufe holen (aufsteigend nach _lauf)
      const runs = Array.isArray(m._runs) && m._runs.length
        ? [...m._runs].sort((a,b) => (a._lauf || 1) - (b._lauf || 1))
        : [ m ];
      const total = runs.length;

      const rows = [];

      for (const f of F){
        for (let i = 0; i < runs.length; i++){
          const run = runs[i];
          const t = run[`${f.base}_Zeit`];
          const p = run[`${f.base}_Platz`];

          const hasAny = (t && String(t).trim() !== "") || (p && String(p).trim() !== "");
          if (!hasAny) continue;

          // --- NEU: Medaille nur bei Einzel-Wertungen ---
          const wRaw = String(run.Wertung ?? m.Wertung ?? "").toLowerCase();
          // "einzelkampf", "einzel-/mehrkampf", "einzel / mehrkampf" → alles trifft
          const isEinzel = wRaw.replace(/[\s\-]+/g, "").includes("einzel");

          const placeStr = (p || "").toString().trim();
          const medal = isEinzel ? medalForPlace(placeStr) : null;

          const placeEl = h("span", { class: "pl" },
            placeStr ? placeStr : "—",
            medal ? h("img", {
              class: "res-medal",
              src: `${FLAG_BASE_URL}/${medal.file}`,
              alt: medal.alt,
              loading: "lazy",
              decoding: "async",
              onerror: (e)=>e.currentTarget.remove()
            }) : null
          );

          const rLabel = roundLabelFromIndex(i + 1, runs.length);
          const discWrap = h("span", { class: "d-wrap" },
            h("span", { class: "d" }, f.label),
            (rLabel ? h("span", { class: "d-sub" }, rLabel) : null)
          );

          rows.push(
            h("div", { class: "meet-res" },
              discWrap,
              placeEl,
              h("span", { class: "t" }, (t && String(t).trim() !== "") ? String(t) : "—")
            )
          );
        }
      }


      return rows.length ? rows : [ h("div", { class: "best-empty" }, "Keine Einzelergebnisse erfasst.") ];
    }

  }



  // Summiert Starts & DQ je Bahn aus ax.stats und berechnet die Wahrscheinlichkeit
  function computeLaneDQProb(ax){
    const out = { "25": { starts: 0, dq: 0 }, "50": { starts: 0, dq: 0 } };
    const stats = (ax && ax.stats) || {};

    for (const lane of ["25","50"]){
      const laneStats = stats[lane] || {};
      for (const d of DISCIPLINES){
        const s = laneStats[d.key];
        if (!s) continue;
        out[lane].starts += Number(s.starts || 0);
        out[lane].dq     += Number(s.dq     || 0);
      }
    }

    const pct = (dq, starts) => (starts > 0 ? Math.round((dq/starts)*1000)/10 : 0); // 1 Nachkommastelle
    return {
      "25": { ...out["25"], pct: pct(out["25"].dq, out["25"].starts) },
      "50": { ...out["50"], pct: pct(out["50"].dq, out["50"].starts) }
    };
  }


  // — Startrechte: LV/BV → Badges neben den Chips —
  function hasStartrecht(a, code){
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      if (runs.some(r => String(r?.Startrecht || "").toUpperCase() === String(code).toUpperCase()))
        return true;
    }
    return false;
  }


  // Summe aller geschwommenen Wettkampf-Meter (inkl. DQ, solange _Zeit nicht leer ist)
  function sumWettkampfMeter(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    let total = 0;
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        for (const [key, val] of Object.entries(run)){
          if (!/_Zeit$/i.test(key)) continue;
          const v = (val ?? "").toString().trim();
          if (!v) continue;
          let dist = NaN;
          let mm = key.match(/^(\d+)m[_ ]/i) || key.match(/(\d+)m/i);
          if (mm) dist = parseInt(mm[1], 10);
          if (Number.isFinite(dist)) total += dist;
        }
      }
    }
    return total;
  }


  function fmtMeters(m){
    if (!Number.isFinite(m) || m <= 0) return "—";
    return `${m.toLocaleString("de-DE")} m`;
  }


  function renderStartrechtIcons(a){
    const icons = [];
    if (hasStartrecht(a, "LV")) icons.push({file: "Cap-Baden.svg",       label: "Landeskader Athlet", key: "LV"});
    if (hasStartrecht(a, "BV")) icons.push({file: "Cap-Deutschland.svg", label: "Bundeskader Athlet", key: "BV"});

    if (icons.length === 0) return null;

    const wrap = h("div", { class: "sr-icons", "aria-label": "Startrechte" });
    icons.forEach(ic => {
      const img = h("img", {
        class: "sr-icon",
        src: `${FLAG_BASE_URL}/${encodeURIComponent(ic.file)}`,
        alt: ic.label,                 // Screenreader-Text
        title: ic.label,               // Tooltip beim Hover
        "data-startrecht": ic.key,     // optional für Debug/Styling
        loading: "lazy",
        decoding: "async",
        onerror: (e) => e.currentTarget.remove()
      });
      wrap.appendChild(img);
    });
    return wrap;
  }

  // Hilfszähler für Regelwerk
  function countRegelwerk(meets){
    let intl = 0, nat = 0;
    (meets || []).forEach(m => {
      const r = String(m.Regelwerk || "").toLowerCase();
      if (r.startsWith("int")) intl++;
      else if (r.startsWith("nat")) nat++;
    });
    const total   = intl + nat;
    const pctIntl = total ? Math.round((intl / total) * 100) : 0;
    const pctNat  = total ? 100 - pctIntl : 0;
    return { intl, nat, pctIntl, pctNat, total };
  }



  // ---------- Mapping Disziplinen <-> Meet-Felder ----------
  const DISCIPLINES = [
    { key: "50_retten",         label: "50m Retten",                 meetZeit: "50m_Retten_Zeit",         meetPlatz: "50m_Retten_Platz" },
    { key: "100_retten_flosse", label: "100m Retten mit Flossen",    meetZeit: "100m_Retten_Zeit",        meetPlatz: "100m_Retten_Platz" },
    { key: "100_kombi",         label: "100 Kombi",                   meetZeit: "100m_Kombi_Zeit",         meetPlatz: "100m_Kombi_Platz" },
    { key: "100_lifesaver",     label: "100m Lifesaver",              meetZeit: "100m_Lifesaver_Zeit",     meetPlatz: "100m_Lifesaver_Platz" },
    { key: "200_super",         label: "200m Super Lifesaver",        meetZeit: "200m_SuperLifesaver_Zeit",meetPlatz: "200m_SuperLifesaver_Platz" },
    { key: "200_hindernis",     label: "200m Hindernis",              meetZeit: "200m_Hindernis_Zeit",     meetPlatz: "200m_Hindernis_Platz" },
  ];

  // "0:34,25" | "34,25" | "1:02.13" -> Sekunden (float); "DQ" -> NaN
  function parseTimeToSec(raw) {
    if (raw == null) return NaN;
    const s = String(raw).trim();
    if (/^dq$/i.test(s)) return NaN;
    const norm = s.replace(",", "."); // deutsche Kommas zulassen
    const parts = norm.split(":");
    if (parts.length === 1) {
      const sec = parseFloat(parts[0]);
      return Number.isFinite(sec) ? sec : NaN;
    } else if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const sec = parseFloat(parts[1]);
      if (!Number.isFinite(m) || !Number.isFinite(sec)) return NaN;
      return m * 60 + sec;
    }
    return NaN;
  }

  // Durchschnittszeit (nur gültige Zeiten, keine DQ) pro Disziplin + Lane
  function avgTimeForDiscipline(athlete, lane, disc) {
    const meets = Array.isArray(athlete.meets) ? athlete.meets : [];
    let sum = 0, cnt = 0;
    for (const m of meets) {
      if (!m || (lane && m.pool !== lane)) continue;
      const z = m[disc.meetZeit];
      if (!z || /^dq$/i.test(String(z).trim())) continue;
      const sec = parseTimeToSec(z);
      if (Number.isFinite(sec)) { sum += sec; cnt++; }
    }
    return cnt > 0 ? (sum / cnt) : NaN;
  }



  // ---------- Utils ----------
  const REF_YEAR = new Date().getFullYear();
  const normalize = (s) =>
    (s || "").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

  const highlight = (text, query) => {
    const nText = normalize(text);
    const nQuery = normalize(query);
    const idx = nText.indexOf(nQuery);
    if (idx < 0 || !query) return text;
    return text.slice(0, idx) + "<mark>" + text.slice(idx, idx + nQuery.length) + "</mark>" + text.slice(idx + nQuery.length);
  };

  function formatSeconds(sec) {
    if (sec == null || isNaN(sec)) return "—";
    const tot = Math.round(Math.max(0, Number(sec)) * 100);
    const m = Math.floor(tot / 6000);
    const s = Math.floor((tot % 6000) / 100);
    const cs = tot % 100;
    const sPart = (m ? String(s).padStart(2, "0") : String(s));
    return (m ? `${m}:${sPart}` : sPart) + "." + String(cs).padStart(2, "0");
  }

  function fmtInt(n){ return Number.isFinite(n) ? n.toLocaleString("de-DE") : "—"; }
  function fmtDate(dStr){
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("de-DE");
  }

  // ---------- Daten-Ableitungen aus meets ----------
  function getOrtsgruppe(a) {
    return a.aktuelleOrtsgruppe || a.AktuelleOrtsgruppe || a.ortsgruppe || "";
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

  function computeOverallLSC(meets) {
    const list = Array.isArray(meets) ? [...meets] : [];
    list.sort((a,b) => new Date(b.date) - new Date(a.date)); // neueste zuerst
    for (const m of list) {
      if (m && m.LSC != null && m.LSC !== "") {
        const x = parseFloat(String(m.LSC).replace(",", "."));
        if (Number.isFinite(x)) return x;          // erster (neuester) gültiger LSC
      }
    }
    return null; // keiner vorhanden
  }


  function deriveFromMeets(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];

    const pbs   = { "25": {}, "50": {} };
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
      // lane vom Top-Level (Läufe haben i. d. R. gleiche Bahn)
      const lane = meet?.pool === "25" ? "25" : (meet?.pool === "50" ? "50" : null);

      // Hilfsfunktion: über alle Läufe iterieren (oder 1 Fake-Lauf aus dem Meet selbst)
      const runs = Array.isArray(meet._runs) && meet._runs.length
        ? meet._runs
        : [ meet ];

      // --- Starts / DQ / PBs je Lauf ---
      for (const run of runs) {
        for (const d of DISCIPLINES) {
          const z = run[d.meetZeit];                // Zeit-String bzw. "DQ"
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

      // --- Medaillen: Einzel je Lauf, Mehrkampf nur höchster Lauf ---
      // 1) Einzel je Lauf (wenn die jeweilige Lauf-Wertung "Einzel" enthält)
      for (const run of runs) {
        const wRaw = (run.Wertung || "").toLowerCase();
        const w = wRaw.replace(/[\s\-]+/g, "");
        const isEinzel = w.includes("einzel");
        if (!isEinzel) continue;

        for (const d of DISCIPLINES) addMedal(run[d.meetPlatz]);
      }

      // 2) Mehrkampf: nur Lauf mit maximalem _lauf (Final > Vorlauf)
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



  // ---------- AK / OG / Geschlecht ----------
  function ageFromJahrgang(jahrgang, refYear = REF_YEAR) {
    const age = refYear - Number(jahrgang);
    return isNaN(age) ? null : age;
  }
  function akDE(age){
    if (age == null) return "?";
    if (age <= 10) return "10";
    if (age <= 12) return "12";
    if (age === 13 || age === 14) return "13/14";
    if (age === 15 || age === 16) return "15/16";
    if (age === 17 || age === 18) return "17/18";
    return "Offen";
  }
  function akLabelFromJahrgang(jahrgang){ return akDE(ageFromJahrgang(jahrgang)); }

  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return "DLRG " + s;
  }

  function genderTag(g) {
    const isW = (g || "").toLowerCase().startsWith("w");
    return { short: isW ? "w" : "m", full: isW ? "weiblich" : "männlich", cls: isW ? "w" : "m" };
  }

  // ---------- Caps & Flags ----------
  function capFileFromOrtsgruppe(rawOG){ return `Cap-${String(rawOG||"").trim()}.svg`; }

  function renderCapAvatar(a, size = "xl", extraClass = ""){
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });

    const ogNow = currentOrtsgruppeFromMeets(a) || a.ortsgruppe || "";
    const file  = `Cap-${ogNow}.svg`;

    const img = h("img", {
      class: "avatar-img",
      alt: `Vereinskappe ${formatOrtsgruppe(ogNow)}`,
      loading: size === "xl" ? "eager" : "lazy",
      decoding: "async",
      fetchpriority: size === "xl" ? "high" : "low",
      src: `${FLAG_BASE_URL}/${encodeURIComponent(file)}`,
      onerror: () => {
        img.onerror = null;
        img.src = `${FLAG_BASE_URL}/${encodeURIComponent("Cap-Baden_light.svg")}`;
      }
    });

    wrap.appendChild(img);
    return wrap;
  }


  const SUPPORTED_FLAGS_DE = new Set([
    "Spanien","Australien","Deutschland","Belgien","Italien","Frankreich",
    "Schweiz","Polen","Japan","Dänemark","Ägypten","Niederlande","Großbritannien"
  ]);

  // REPLACE your old renderCountryFlagsSectionSVG with this:
  function renderCountryFlagsInline(a){
    // Quelle: aus deriveFromMeets() — fallback auf a.countriesDE
    const names = (typeof countriesFromAthlete === "function"
      ? countriesFromAthlete(a)
      : (Array.isArray(a.countriesDE) ? a.countriesDE : [])
    )
    .map(n => String(n).trim())
    .filter(n => SUPPORTED_FLAGS_DE.has(n));

    if (!names.length) return null;

    return h("div", { class: "kv-flags" },
      ...names.map(name => {
        const wrap = h("span", { class: "ath-flag", title: name, "aria-label": name });
        const img  = h("img", {
          class: "flag-img",
          src: `${FLAG_BASE_URL}/${encodeURIComponent(name)}.svg`,
          alt: name, loading: "lazy", decoding: "async",
          onerror: () => wrap.remove()
        });
        wrap.appendChild(img);
        return wrap;
      })
    );
  }


  // ---------- Aktivitätsstatus ----------
  function activityStatusFromLast(lastISO){
    if (!lastISO) return { key: "inactive", label: "Inaktiv" };
    const last = new Date(lastISO);
    if (isNaN(last)) return { key: "inactive", label: "Inaktiv" };
    const now  = new Date();
    const days = Math.floor((now - last) / (1000*60*60*24));
    if (days < 365)   return { key: "active",  label: "Aktiv" };
    if (days < 730)   return { key: "pause",   label: "Pause" };
    return { key: "inactive", label: "Inaktiv" };
  }

  // ---------- Meet-Infos ----------
  function computeMeetInfo(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const total = meets.length;

    let c50 = 0, c25 = 0;
    let first = null, last = null, firstName = null;
    const years = new Set();

    // NEU: Regelwerk-Zähler
    let cNat = 0, cIntl = 0;

    for (const m of meets){
      if (m.pool === "50") c50++; else if (m.pool === "25") c25++;

      // Regelwerk zählen
      const reg = String(m.Regelwerk || "").toLowerCase().trim();
      if (reg.startsWith("int")) cIntl++;
      else if (reg.startsWith("nat")) cNat++;

      const d = new Date(m.date);
      if (!isNaN(d)){
        years.add(d.getFullYear());
        if (!first || d < first){
          first = d;
          firstName = shortMeetName?.(m.meet_name || m.meet || "") || (m.meet_name || m.meet || null);
        }        if (!last  || d > last ){ last  = d; }
      }
    }

    const pct50  = total ? Math.round((c50/total)*100) : 0;
    const pctIntl = total ? Math.round((cIntl/total)*100) : 0;

    return {
      total, c50, c25, pct50, pct25: total ? 100 - pct50 : 0,
      first: first ? first.toISOString().slice(0,10) : null,
      last:  last  ? last.toISOString().slice(0,10)  : null,
      firstName,
      activeYears: years.size,
      // NEU:
      cNat, cIntl, pctIntl
    };
  }



  // Disziplin-Feldnamen in den meet-Objekten
const MEET_DISC_TIME_FIELDS = [
  "50m_Retten_Zeit",
  "100m_Retten_Zeit",           // = 100m Retten mit Flossen
  "100m_Kombi_Zeit",
  "100m_Lifesaver_Zeit",
  "200m_SuperLifesaver_Zeit",
  "200m_Hindernis_Zeit"
];

function hasStartVal(v){
    // Start zählt, wenn nicht leer: Zeiten oder "DQ" zählen, "" nicht
    return v != null && String(v).trim() !== "";
  }

  // Summe aller Starts über alle Meets/Disziplinen (egal welches Startrecht)
  function totalStartsFromMeets(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    let total = 0;
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        for (const f of MEET_DISC_TIME_FIELDS){
          if (hasStartVal(run[f])) total++;
        }
      }
    }
    return total;
  }


  // Starts pro Startrecht (OG/BZ/LV/BV)
  function computeStartsPerStartrecht(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const out = { OG:0, BZ:0, LV:0, BV:0 };
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        const sr = (run.Startrecht || "").toUpperCase();
        if (!out.hasOwnProperty(sr)) continue;
        let cnt = 0;
        for (const f of MEET_DISC_TIME_FIELDS){
          if (hasStartVal(run[f])) cnt++;
        }
        out[sr] += cnt;
      }
    }
    return out;
  }



  // Aktuelle Ortsgruppe = erste NATIONAL-Veranstaltung im jüngsten Jahr.
  // Fallback (Sonderregel): wenn im jüngsten Jahr keine "National"-Events,
  // dann die ERSTE Veranstaltung dieses Jahres (egal welches Regelwerk).
  function currentOrtsgruppeFromMeets(a){
    const meets = Array.isArray(a?.meets)
      ? a.meets.filter(m => m && m.date && m.Ortsgruppe)
      : [];
    if (meets.length === 0) return a?.ortsgruppe || "";

    // robustes Parsing + Hilfsfelder
    const rows = meets.map(m => {
      const d = new Date(m.date);
      if (isNaN(d)) return null;
      const rw = String(m.Regelwerk || "").toLowerCase();
      return {
        ...m,
        _d: d,
        _y: d.getFullYear(),
        _isNational: rw.startsWith("national") // "National", "national", etc.
      };
    }).filter(Boolean);

    if (rows.length === 0) return a?.ortsgruppe || "";

    // jüngstes Jahr bestimmen
    const latestYear = rows.reduce((y, r) => (r._y > y ? r._y : y), rows[0]._y);

    // alle Meets des jüngsten Jahres (aufsteigend nach Datum)
    const inYear = rows
      .filter(r => r._y === latestYear)
      .sort((x, y) => x._d - y._d);

    // 1) Falls es National-Events gibt: den ERSTEN im Jahr
    const nationals = inYear.filter(r => r._isNational);
    if (nationals.length > 0) return nationals[0].Ortsgruppe || a?.ortsgruppe || "";

    // 2) Sonst: den LETZTEN Wettkampf des Jahres (z.B. international)
    const lastMeet = inYear[inYear.length - 1];
    return lastMeet?.Ortsgruppe || a?.ortsgruppe || "";
  }



  // ---------- DQ-Summe (über stats beider Bahnen) ----------
  function sumAllDQ(obj){
    const s50 = (obj.stats && obj.stats["50"]) || {};
    const s25 = (obj.stats && obj.stats["25"]) || {};
    let total = 0;
    for (const d of DISCIPLINES){
      total += Number(s50[d.key]?.dq || 0);
      total += Number(s25[d.key]?.dq || 0);
    }
    return total;
  }

  // ---- LSC-Chart: Utils ----
  function parseLSC(v){
    if (v == null) return NaN;
    const s = String(v).trim().replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  // 1. Juli des Jahrgangs als Geburtsdatum
  function assumedBirthDate(jahrgang){
    const y = Number(jahrgang);
    if (!Number.isFinite(y)) return null;
    return new Date(y, 6, 1); // Monat 0-basiert → 6 = Juli
  }

  function ageAt(dateStr, jahrgang){
    const birth = assumedBirthDate(jahrgang);
    if (!birth) return NaN;
    const d = new Date(dateStr);
    if (isNaN(d)) return NaN;
    const msPerYear = 365.2425 * 24 * 60 * 60 * 1000;
    return (d - birth) / msPerYear;
  }

  // Aus gemergten Meets (ax.meets) LSC-Punkte bauen:
  // pro Datum genau 1 Wert: höchster Vorläufe → bei Gleichstand höherer LSC
  function buildLSCSeries(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const byDate = new Map();

    for (const m of meets){
      const lsc = parseLSC(m.LSC);
      if (!Number.isFinite(lsc)) continue;
      const d = (m.date || "").slice(0,10);
      if (!d) continue;

      const lauf = Number(m._lauf_max || m.Vorläufe || m._lauf || 1);

      const prev = byDate.get(d);
      if (!prev || lauf > prev.lauf || (lauf === prev.lauf && lsc > prev.lsc)){
        byDate.set(d, { date: d, lsc, lauf });
      }
    }

    const arr = Array.from(byDate.values()).sort((x,y)=> new Date(x.date) - new Date(y.date));
    return arr
      .map(p => ({ ...p, age: ageAt(p.date, a.jahrgang) }))
      .filter(p => Number.isFinite(p.age));
  }

  // kleines SVG-Helper (Namespace!)
  function s(tag, attrs = {}, ...children){
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k,v] of Object.entries(attrs || {})){
      if (v == null) continue;
      el.setAttribute(k, String(v));
    }
    for (const c of children.flat()){
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }


  // ---- LSC-Chart Renderer mit X-Achsen-Label & Vergleichssuche (1 Vergleich max., ersetzt alte Auswahl) ----
  function renderLSCChart(a){
    // kleine Helfer
    const s = (tag, attrs = {}, ...children) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k,v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
      children.flat().forEach(c => c != null && el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };
    const hEl = (tag, attrs = {}, ...children) => {
      const el = document.createElement(tag);
      for (const [k,v] of Object.entries(attrs)){
        if (k === "class") el.className = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
      }
      children.flat().forEach(c => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };

    // Daten der Hauptperson
    const basePts = buildLSCSeries(a); // [{age,lsc,date,meet_name}]
    const card = hEl("div", { class:"ath-lsc-card" },
      hEl("div", { class:"lsc-head" }, hEl("h4", {}, "LSC Verlauf"))
    );
    if (!basePts.length){
      card.appendChild(hEl("div", { class:"best-empty" }, "Keine LSC-Daten vorhanden."));
      return card;
    }

    // Viewport + SVG + Tooltip
    const vp  = hEl("div", { class:"lsc-viewport" });
    const svg = s("svg", { class:"lsc-svg", role:"img", "aria-label":"LSC Verlauf" });
    vp.appendChild(svg);
    card.appendChild(vp);

    const tip = hEl("div", { class:"lsc-tooltip", "aria-hidden":"true" },
      hEl("div", { class:"tt-l1" }),
      hEl("div", { class:"tt-l2" })
    );
    card.appendChild(tip);

    // Legende
    const legend = hEl("div", { class:"lsc-legend" },
      hEl("span", { class:"lsc-key lsc-key--base" },
        hEl("span", { class:"lsc-key-dot blue" }),
        hEl("span", { class:"lsc-key-label" }, a?.name || "Athlet A")
      )
    );
    card.appendChild(legend);

    // Vergleichs-Suche (max. 1 Person – neue Auswahl ersetzt alte)
    let cmpAth  = null;
    let cmpPts  = null;

    const cmpWrap   = hEl("div", { class:"lsc-compare-wrap" });
    const cmpInput  = hEl("input", {
      class:"lsc-input",
      type:"search",
      placeholder:"Athlet zum Vergleich suchen …",
      autocomplete:"off",
      role:"searchbox",
      "aria-label":"Athlet zum Vergleich suchen"
    });
    const clearBtn  = hEl("button", { class:"lsc-clear hidden", type:"button", title:"Vergleich entfernen" }, "Entfernen");
    const suggest   = hEl("div", { class:"lsc-suggest hidden", role:"listbox" });

    cmpWrap.appendChild(hEl("div", { class:"lsc-search-row" }, cmpInput, clearBtn));
    cmpWrap.appendChild(suggest);
    card.appendChild(cmpWrap);

    // Suche
    let cmpQuery = "", cmpResults = [], cmpActive = -1;
    const normalizeLocal = (s) => (s||"").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim();

    function updateCmpSuggest(){
      const q = cmpQuery.trim();
      if (q.length < 2){ cmpResults = []; cmpActive = -1; paintCmpSuggest(); return; }

      const nq = normalizeLocal(q);
      const pool = (AppState?.athletes || []).filter(x => x?.id !== a?.id); // sich selbst ausblenden
      const list = pool.map(ax => ({ ax, nName: normalizeLocal(ax.name) }))
        .filter(x => x.nName.includes(nq))
        .sort((l,r) => {
          const la = l.nName.startsWith(nq) ? 0 : 1;
          const ra = r.nName.startsWith(nq) ? 0 : 1;
          if (la !== ra) return la - ra;
          return l.nName.localeCompare(r.nName);
        })
        .slice(0,8);

      cmpResults = list.map(x => x.ax);
      cmpActive  = cmpResults.length ? 0 : -1;
      paintCmpSuggest();
    }

    function paintCmpSuggest(){
      suggest.innerHTML = "";
      if (!cmpQuery || cmpResults.length === 0){
        const msg = cmpQuery.length < 2 ? "Mind. 2 Zeichen eingeben" : "Keine Treffer";
        suggest.appendChild(hEl("div", { class:"lsc-suggest-empty" }, msg));
        suggest.classList.remove("hidden");
        return;
      }
      cmpResults.forEach((ax, idx) => {
        const item = hEl("div", {
          class:"lsc-suggest-item" + (idx===cmpActive ? " active" : ""),
          role:"option", "aria-selected": idx===cmpActive ? "true" : "false"
        });
        item.appendChild(renderCapAvatar(ax, "sm", "lsc-suggest-avatar"));
        const name = hEl("div", { class:"lsc-suggest-name" }, ax.name, " ",
          hEl("span", { class:"lsc-year" }, `(${ax.jahrgang})`));
        const og = currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "";
        const sub = hEl("div", { class:"lsc-suggest-sub" }, "DLRG ", og);
        item.appendChild(hEl("div", { class:"lsc-suggest-text" }, name, sub));

        item.addEventListener("pointerdown", (ev)=>{ ev.preventDefault(); chooseCmp(ax); });
        item.addEventListener("mouseenter", ()=>{ suggest.querySelector(".active")?.classList.remove("active"); item.classList.add("active"); cmpActive = idx; });

        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    }

    function hideCmpSuggest(){ suggest.classList.add("hidden"); }

    function chooseCmp(ax){
      // REPLACE-MODUS: bestehende Auswahl (Legende & Daten) ersetzen
      cmpAth = ax;
      const merged = mergeDuplicateMeets(cmpAth.meets);
      cmpPts = buildLSCSeries({ ...cmpAth, meets: merged });

      // alte Vergleichslegende entfernen (falls vorhanden)
      legend.querySelector(".lsc-key--cmp")?.remove();
      legend.appendChild(
        hEl("span", { class:"lsc-key lsc-key--cmp" },
          hEl("span", { class:"lsc-key-dot green" }),
          hEl("span", { class:"lsc-key-label" }, cmpAth.name)
        )
      );

      clearBtn.classList.remove("hidden");
      hideCmpSuggest();
      cmpInput.value = cmpQuery = "";
      paint(); // neu zeichnen inkl. grün
    }

    cmpInput.addEventListener("input", e => { cmpQuery = e.target.value || ""; updateCmpSuggest(); });
    cmpInput.addEventListener("keydown", e => {
      if (!cmpResults.length) return;
      if (e.key === "ArrowDown"){ e.preventDefault(); cmpActive = (cmpActive+1) % cmpResults.length; paintCmpSuggest(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); cmpActive = (cmpActive-1+cmpResults.length) % cmpResults.length; paintCmpSuggest(); }
      else if (e.key === "Enter"){ e.preventDefault(); chooseCmp(cmpResults[cmpActive>=0?cmpActive:0]); }
      else if (e.key === "Escape"){ hideCmpSuggest(); }
    });
    document.addEventListener("click", (e) => { if (!cmpWrap.contains(e.target)) hideCmpSuggest(); });

    clearBtn.addEventListener("click", () => {
      cmpAth = null; cmpPts = null;
      clearBtn.classList.add("hidden");
      legend.querySelector(".lsc-key--cmp")?.remove();
      paint();
    });

    // Domains
    const yMin = 0, yMax = 1000;
    let xMin, xMax;
    const updateXDomain = () => {
      const all = cmpPts && cmpPts.length ? basePts.concat(cmpPts) : basePts;
      xMin = Math.floor(Math.min(...all.map(p=>p.age)));
      xMax = Math.ceil (Math.max(...all.map(p=>p.age)));
      if (xMax === xMin) xMax = xMin + 1;
    };
    updateXDomain();

    let activeIdx = null, activeSeries = "blue";

    function paint(){
      updateXDomain();

      const rect = vp.getBoundingClientRect();
      const W = Math.max(320, Math.floor(rect.width));
      const H = Math.max(260, vp.clientHeight);

      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const m  = { l: 8, r: 8, t: 10, b: 48 };
      const cw = W - m.l - m.r;
      const ch = H - m.t - m.b;
      const fx = (v) => m.l + ((v - xMin) / (xMax - xMin)) * cw;
      const fy = (v) => m.t + ch - ((v - yMin) / (yMax - yMin)) * ch;

      // Grid (0/200/400/600/800) + X-Ticks + X-Label
      const grid  = s("g", { class:"lsc-grid" });
      const y0 = fy(0);
      grid.appendChild(s("line", { x1:m.l, y1:y0, x2:W-m.r, y2:y0, class:"hline0" }));
      for (let val=200; val<=800; val+=200){
        const yy = fy(val);
        grid.appendChild(s("line", { x1:m.l, y1:yy, x2:W-m.r, y2:yy, class:"hline" }));
      }
      const xAxis = s("g", { class:"lsc-xaxis" });
      const tickLen = 8;
      for (let v = Math.floor(xMin); v <= Math.ceil(xMax); v++){
        const xx = fx(v);
        grid.appendChild(s("line", { x1:xx, y1:y0, x2:xx, y2:y0 + tickLen, class:"xtick" }));
        xAxis.appendChild(s("text", { x: xx, y: y0 + tickLen + 6, "text-anchor":"middle" }, String(v)));
      }
      xAxis.appendChild(s("text", { x: m.l + cw/2, y: y0 + tickLen + 26, "text-anchor":"middle" }, "Alter"));

      svg.appendChild(grid);
      svg.appendChild(xAxis);

      // Gradients (blau + grün)
      const defs = s("defs");
      const gradBlueId  = `lsc-grad-b-${Math.random().toString(36).slice(2)}`;
      const gradGreenId = `lsc-grad-g-${Math.random().toString(36).slice(2)}`;
      const mkGrad = (id, color) => {
        const g = s("linearGradient", { id, x1:"0", y1:"0", x2:"0", y2:"1" });
        g.appendChild(s("stop", { offset:"0%",   "stop-color":color, "stop-opacity":"0.22" }));
        g.appendChild(s("stop", { offset:"100%", "stop-color":color, "stop-opacity":"0" }));
        return g;
      };
      defs.appendChild(mkGrad(gradBlueId,  "#1d4ed8"));
      defs.appendChild(mkGrad(gradGreenId, "#10b981"));
      svg.appendChild(defs);

      // Serie zeichnen
      const drawSeries = (pts, colorClass, withArea=false, fillId=null) => {
        const pathD = pts.map((p,i)=>{
          const Y = Math.max(0, Math.min(1000, p.lsc));
          return `${i ? "L" : "M"}${fx(p.age)} ${fy(Y)}`;
        }).join(" ");

        if (withArea){
          const areaD = pathD + ` L${fx(pts[pts.length-1].age)} ${y0} L${fx(pts[0].age)} ${y0} Z`;
          svg.appendChild(s("path", { d: areaD, class:`lsc-area ${colorClass}`, fill:`url(#${fillId})` }));
        }
        svg.appendChild(s("path", { d: pathD, class:`lsc-line ${colorClass}` }));

        const dots = s("g", { class:`lsc-dots ${colorClass}` });
        pts.forEach((p, idx) => {
          const Y = Math.max(0, Math.min(1000, p.lsc));
          const c = s("circle", {
            cx: fx(p.age), cy: fy(Y), r:4.5, class:"lsc-dot", tabindex:0,
            "data-idx": idx, "data-series": colorClass,
            "data-name": (colorClass==="blue" ? (a?.name||"") : (cmpAth?.name||"")),
            "data-lsc": p.lsc.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 }),
            "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
            "data-meet": p.meet_name || "—"
          });

          const show = () => {
            activeIdx = idx; activeSeries = colorClass;
            c.setAttribute("data-active","1");
            const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
            tip.querySelector(".tt-l1").textContent = `${c.dataset.lsc} LSC${name}`;
            tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet || "—"}`;
            positionTipNearCircle(c);
          };
          const hide = () => {
            if (activeIdx === idx && activeSeries === colorClass){ activeIdx = null; }
            c.removeAttribute("data-active");
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden","true");
          };

          c.addEventListener("pointerenter", show);
          c.addEventListener("pointerleave", hide);
          c.addEventListener("focus", show);
          c.addEventListener("blur", hide);
          c.addEventListener("pointerdown", (e)=>{ e.stopPropagation(); show(); });

          dots.appendChild(c);
        });
        svg.appendChild(dots);
      };

      drawSeries(basePts, "blue",  true,  gradBlueId);
      if (cmpPts && cmpPts.length) drawSeries(cmpPts, "green", true,  gradGreenId);

      // Tooltip positionieren (iOS-robust)
      function positionTipNearCircle(circle){
        const pt = svg.createSVGPoint();
        pt.x = +circle.getAttribute("cx");
        pt.y = +circle.getAttribute("cy");
        const scr = pt.matrixTransform(svg.getScreenCTM());
        const cardRect = card.getBoundingClientRect();
        const px = scr.x - cardRect.left;
        const py = scr.y - cardRect.top;

        tip.style.opacity = "1";
        tip.style.transform = "translate(0,0)";
        tip.setAttribute("aria-hidden","false");
        tip.style.left = "0px"; tip.style.top  = "0px";
        const tr = tip.getBoundingClientRect();

        const offX = 6, offY = 10;
        let L = Math.round(px + offX - tr.width*0.12);
        let T = Math.round(py - offY - tr.height - 6);
        const maxL = card.clientWidth  - tr.width  - 8;
        const maxT = card.clientHeight - tr.height - 8;
        L = Math.max(8, Math.min(L, maxL));
        T = Math.max(8, Math.min(T, maxT));
        tip.style.left = `${L}px`;
        tip.style.top  = `${T}px`;
      }

      // Tooltip bei Resize am aktiven Punkt neu ausrichten
      if (activeIdx != null){
        const sel = `.lsc-dots.${activeSeries} .lsc-dot[data-idx="${activeIdx}"]`;
        const active = svg.querySelector(sel);
        if (active) positionTipNearCircle(active);
      }

      // Klick außerhalb schließt Tooltip
      if (!card._lscOutsideHandlerAttached){
        card.addEventListener("pointerdown", (e) => {
          if (!svg.contains(e.target)){
            activeIdx = null;
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden","true");
            svg.querySelectorAll('.lsc-dot[data-active="1"]').forEach(n => n.removeAttribute("data-active"));
          }
        }, { passive:true });
        card._lscOutsideHandlerAttached = true;
      }
    }

    const ro = new ResizeObserver(paint);
    ro.observe(vp);
    requestAnimationFrame(paint);

    return card;
  }

  function renderTimeChart(a){
    // kleine DOM-Helper
    const s = (tag, attrs = {}, ...children) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs||{}).forEach(([k,v]) => v!=null && el.setAttribute(k,String(v)));
      children.flat().forEach(c => c!=null && el.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
      return el;
    };
    const el = (tag, attrs = {}, ...children) => {
      const node = document.createElement(tag);
      for (const [k,v] of Object.entries(attrs||{})){
        if (k === "class") node.className = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
      }
      children.flat().forEach(c => c!=null && node.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
      return node;
    };

    // Disziplin-Vorauswahl: erste mit Daten, sonst erste in Liste
    const firstWithData = DISCIPLINES.find(d => buildTimeSeriesForDiscipline(a, d.key).length > 0);
    let discKey = (firstWithData || DISCIPLINES[0]).key;

    // Serien
    let basePts = buildTimeSeriesForDiscipline(a, discKey);
    let cmpAth = null, cmpPts = null;

    // Card + Kopf mit Dropdown
    const card = el("div", { class:"ath-time-card" });
    const head = el("div", { class:"time-head" },
      el("h4", {}, "Zeit-Verlauf"),
      (() => {
        const sel = el("select", { class:"time-disc" });
        DISCIPLINES.forEach(d => {
          sel.appendChild(el("option", { value:d.key, selected: d.key===discKey }, d.label));
        });
        sel.addEventListener("change", () => {
          discKey = sel.value;
          basePts = buildTimeSeriesForDiscipline(a, discKey);
          cmpPts  = cmpAth ? buildTimeSeriesForDiscipline({ ...cmpAth, meets: mergeDuplicateMeets(cmpAth.meets) }, discKey) : null;
          paint();
        });
        return sel;
      })()
    );
    card.appendChild(head);

    // Y-Achsen-Start (Sekunden) je Disziplin
    function getYAxisBaseSec(dKey){
      const dm = DISCIPLINES.find(d => d.key === dKey);
      const name = (dm?.label || dKey).toLowerCase();

      if (name.includes("50m retten"))          return 20;   // 0:20
      if (name.includes("100m retten"))         return 30;   // 0:30
      if (name.includes("100m kombi"))          return 30;   // 0:30
      if (name.includes("100m lifesaver"))      return 30;   // 0:30
      if (name.includes("200m hindernis"))      return 90;   // 1:30
      if (name.includes("200m superlifesaver")) return 120;  // 2:00
      return 0;
    }

    // ---- Y-Achsen-Spezifikation je Disziplin (Sekunden) ----
    // Keys: siehe DISCIPLINES (50_retten, 100_retten_flosse, 100_kombi, 100_lifesaver, 200_super, 200_hindernis)
    const Y_SPEC = {
      "50_retten":         { base:  20, step: 10 },
      "100_retten_flosse": { base:  40, step: 10 },
      "100_kombi":         { base:  50, step: 10 },
      "100_lifesaver":     { base:  40, step: 10 },
      "200_super":         { base: 120, step: 10 },
      "200_hindernis":     { base: 110, step: 10 },
    };

    function getYAxisBaseSec(dKey){
      return (Y_SPEC[dKey]?.base ?? 0);
    }
    function getYAxisStepSec(dKey){
      return (Y_SPEC[dKey]?.step ?? 30);
    }

    // Aufrunden auf nächstes Vielfaches der Schrittweite
    const ceilToStep = (sec, step) => Math.ceil(sec / step) * step;


    // Viewport + SVG
    const vp  = el("div", { class:"time-viewport" });
    const svg = s("svg", { class:"time-svg", role:"img", "aria-label":"Zeit-Verlauf" });
    vp.appendChild(svg);
    card.appendChild(vp);

    // Tooltip
    const tip = el("div", { class:"time-tooltip", "aria-hidden":"true" },
      el("div", { class:"tt-l1" }),
      el("div", { class:"tt-l2" })
    );
    card.appendChild(tip);

    // Legende
    const legend = el("div", { class:"time-legend" },
      el("span", { class:"time-key time-key--base" },
        el("span", { class:"time-key-dot blue"}), el("span", { class:"time-key-label" }, a?.name || "Athlet A")
      )
    );
    card.appendChild(legend);

    // Vergleichs-Suche (1 Vergleich; ersetzt bestehende)
    const cmpWrap  = el("div", { class:"time-compare-wrap" });
    const cmpInput = el("input", { class:"time-input", type:"search", placeholder:"Athlet zum Vergleich suchen …", autocomplete:"off", role:"searchbox" });
    const clearBtn = el("button", { class:"time-clear hidden", type:"button" }, "Entfernen");
    const suggest  = el("div", { class:"time-suggest hidden", role:"listbox" });
    cmpWrap.appendChild(el("div", { class:"time-search-row" }, cmpInput, clearBtn));
    cmpWrap.appendChild(suggest);
    card.appendChild(cmpWrap);

    let cmpQuery = "", cmpResults = [], cmpActive = -1;
    const normalizeLocal = (s) => (s||"").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim();

    function updateCmpSuggest(){
      const q = cmpQuery.trim();
      suggest.innerHTML = "";
      if (q.length < 2){
        suggest.appendChild(el("div", { class:"time-suggest-empty" }, "Mind. 2 Zeichen eingeben"));
        suggest.classList.remove("hidden"); return;
      }
      const nq = normalizeLocal(q);
      const pool = (AppState?.athletes || []).filter(x => x?.id !== a?.id);
      const list = pool.map(ax => ({ ax, n: normalizeLocal(ax.name) }))
        .filter(x => x.n.includes(nq))
        .sort((l,r) => {
          const al = l.n.startsWith(nq) ? 0 : 1;
          const ar = r.n.startsWith(nq) ? 0 : 1;
          return (al-ar) || l.n.localeCompare(r.n);
        })
        .slice(0,8);
      cmpResults = list.map(x => x.ax);
      cmpActive = cmpResults.length ? 0 : -1;

      if (!cmpResults.length){
        suggest.appendChild(el("div", { class:"time-suggest-empty" }, "Keine Treffer"));
        suggest.classList.remove("hidden"); return;
      }

      cmpResults.forEach((ax, idx) => {
        const item = el("div", { class:"time-suggest-item"+(idx===cmpActive?" active":""), role:"option", "aria-selected": idx===cmpActive?"true":"false" });
        item.appendChild(renderCapAvatar(ax, "sm", "time-suggest-avatar"));
        const text = el("div", { class:"time-suggest-text" },
          el("div", { class:"time-suggest-name" }, ax.name, " ", el("span",{class:"time-year"},`(${ax.jahrgang})`)),
          el("div", { class:"time-suggest-sub" }, "DLRG ", currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "")
        );
        item.appendChild(text);
        item.addEventListener("pointerdown", (ev)=>{ ev.preventDefault(); chooseCmp(ax); });
        item.addEventListener("mouseenter", ()=>{ suggest.querySelector(".active")?.classList.remove("active"); item.classList.add("active"); cmpActive = idx; });
        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    }
    function hideCmpSuggest(){ suggest.classList.add("hidden"); }
    function chooseCmp(ax){
      cmpAth = ax;
      cmpPts = buildTimeSeriesForDiscipline({ ...cmpAth, meets: mergeDuplicateMeets(cmpAth.meets) }, discKey);
      legend.querySelector(".time-key--cmp")?.remove();
      legend.appendChild(
        el("span", { class:"time-key time-key--cmp" },
          el("span", { class:"time-key-dot green"}), el("span",{class:"time-key-label"}, cmpAth.name)
        )
      );
      clearBtn.classList.remove("hidden");
      hideCmpSuggest();
      cmpInput.value = cmpQuery = "";
      paint();
    }
    cmpInput.addEventListener("input", e => { cmpQuery = e.target.value || ""; updateCmpSuggest(); });
    cmpInput.addEventListener("keydown", e => {
      if (!cmpResults.length) return;
      if (e.key === "ArrowDown"){ e.preventDefault(); cmpActive = (cmpActive+1) % cmpResults.length; updateCmpSuggest(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); cmpActive = (cmpActive-1+cmpResults.length) % cmpResults.length; updateCmpSuggest(); }
      else if (e.key === "Enter"){ e.preventDefault(); chooseCmp(cmpResults[cmpActive>=0?cmpActive:0]); }
      else if (e.key === "Escape"){ hideCmpSuggest(); }
    });
    document.addEventListener("click", (e) => { if (!cmpWrap.contains(e.target)) hideCmpSuggest(); });
    clearBtn.addEventListener("click", () => {
      cmpAth = null; cmpPts = null;
      clearBtn.classList.add("hidden");
      legend.querySelector(".time-key--cmp")?.remove();
      paint();
    });

    // Domain & Paint
    const mmss = (sec) => {
      if (!Number.isFinite(sec)) return "—";
      const m = Math.floor(sec/60);
      const s = Math.floor(sec%60);
      const cs = Math.round((sec - Math.floor(sec)) * 100);
      const sPart = m ? String(s).padStart(2,"0") : String(s);
      return (m? `${m}:${sPart}`: sPart) + "." + String(cs).padStart(2,"0");
    };

    let xMin, xMax, yMin, yMax, activeIdx = null, activeSeries = "blue";
    const updateDomains = () => {
      const all = (cmpPts && cmpPts.length) ? basePts.concat(cmpPts) : basePts;

      // X wie gehabt
      if (!all.length){ xMin = 0; xMax = 1; }
      else {
        xMin = Math.floor(Math.min(...all.map(p => p.age)));
        xMax = Math.ceil (Math.max(...all.map(p => p.age)));
        if (xMax === xMin) xMax = xMin + 1;
      }

      // Y nach Disziplin
      const base = getYAxisBaseSec(discKey);
      const step = getYAxisStepSec(discKey);
      const maxData = all.length ? Math.max(...all.map(p => p.sec)) : base + step * 3;

      yMin = base;
      const wanted = Math.max(maxData, base + step * 2); // etwas Luft
      yMax = ceilToStep(wanted, step);
      if (yMax <= yMin) yMax = yMin + step;
    };




    function paint(){
      updateDomains();
      const rect = vp.getBoundingClientRect();
      const W = Math.max(320, Math.floor(rect.width));
      const H = Math.max(260, vp.clientHeight);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W); svg.setAttribute("height", H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const m = { l: 8, r: 8, t: 28, b: 48 };
      const cw = W - m.l - m.r;
      const ch = H - m.t - m.b;
      const fx = v => m.l + ((v - xMin) / (xMax - xMin)) * cw;
      const fy = v => m.t + ch - ((v - yMin) / (yMax - yMin)) * ch;

      // Grid
      const grid  = s("g", { class: "time-grid" });
      const yAxis = s("g", { class: "time-yaxis" });

      const yStep = getYAxisStepSec(discKey);
      for (let v = yMin, first=true; v <= yMax + 1e-9; v += yStep){
        const yy = fy(v);
        grid.appendChild(s("line", { x1:m.l, y1:yy, x2:W-m.r, y2:yy, class: first ? "hline0" : "hline" }));
        yAxis.appendChild(
          s("text", { x:m.l, y:yy, "text-anchor":"start", "dominant-baseline":"middle" }, mmss(v))
        );
        first = false;
      }


      // X-Ticks wie gehabt (ganze Jahre)
      const xAxis = s("g", { class: "time-xaxis" });
      const tickLen = 8;
      for (let v = Math.floor(xMin); v <= Math.ceil(xMax); v++){
        const xx = fx(v);
        grid.appendChild(s("line", { x1: xx, y1: m.t + ch, x2: xx, y2: m.t + ch + tickLen, class: "xtick" }));
        xAxis.appendChild(s("text", { x: xx, y: m.t + ch + tickLen + 6, "text-anchor": "middle" }, String(v)));
      }
      xAxis.appendChild(s("text", { x: m.l + cw/2, y: m.t + ch + tickLen + 26, "text-anchor": "middle" }, "Alter"));
      yAxis.appendChild(s("text", { x: m.l, y: m.t - 4, "text-anchor": "start" }, ""));

      svg.appendChild(grid);
      svg.appendChild(xAxis);
      svg.appendChild(yAxis);



      // Gradients
      const defs = s("defs");
      const gidB = `time-grad-b-${Math.random().toString(36).slice(2)}`;
      const gidG = `time-grad-g-${Math.random().toString(36).slice(2)}`;
      const mkGrad = (id, color) => {
        const g = s("linearGradient", { id, x1:"0", y1:"0", x2:"0", y2:"1" });
        g.appendChild(s("stop", { offset:"0%",   "stop-color":color, "stop-opacity":"0.22" }));
        g.appendChild(s("stop", { offset:"100%", "stop-color":color, "stop-opacity":"0" }));
        return g;
      };
      defs.appendChild(mkGrad(gidB, "#1d4ed8"));
      defs.appendChild(mkGrad(gidG, "#10b981"));
      svg.appendChild(defs);

      // Draw series
      const drawSeries = (pts, colorClass, withArea=false, fillId=null) => {
        if (!pts || !pts.length) return;
        const pathD = pts.map((p,i)=> `${i?"L":"M"}${fx(p.age)} ${fy(p.sec)}`).join(" ");
        if (withArea){
          const areaD = `${pathD} L${fx(pts[pts.length-1].age)} ${fy(yMin)} L${fx(pts[0].age)} ${fy(yMin)} Z`;
          svg.appendChild(s("path", { d: areaD, class:`time-area ${colorClass}`, fill:`url(#${fillId})` }));
        }
        svg.appendChild(s("path", { d: pathD, class:`time-line ${colorClass}` }));

        const dots = s("g", { class:`time-dots ${colorClass}` });
        pts.forEach((p, idx) => {
          const c = s("circle", {
            cx: fx(p.age), cy: fy(p.sec), r:4.5, class:"time-dot", tabindex:0,
            "data-idx": idx, "data-series": colorClass,
            "data-name": (colorClass==="blue" ? (a?.name||"") : (cmpAth?.name||"")),
            "data-time": mmss(p.sec),
            "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
            "data-meet": p.meet_name || "—"
          });
          const show = () => {
            activeIdx = idx; activeSeries = colorClass;
            c.setAttribute("data-active","1");
            const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
            tip.querySelector(".tt-l1").textContent = `${c.dataset.time}${name}`;
            tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet || "—"}`;
            positionTip(c);
          };
          const hide = () => {
            if (activeIdx === idx && activeSeries === colorClass){ activeIdx = null; }
            c.removeAttribute("data-active");
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden","true");
          };
          c.addEventListener("pointerenter", show);
          c.addEventListener("pointerleave", hide);
          c.addEventListener("focus", show);
          c.addEventListener("blur", hide);
          c.addEventListener("pointerdown", (e)=>{ e.stopPropagation(); show(); });
          dots.appendChild(c);
        });
        svg.appendChild(dots);
      };

      if (basePts.length) drawSeries(basePts, "blue", true, gidB);
      if (cmpPts  && cmpPts.length) drawSeries(cmpPts,  "green", true, gidG);

      function positionTip(circle){
        const pt = svg.createSVGPoint();
        pt.x = +circle.getAttribute("cx");
        pt.y = +circle.getAttribute("cy");
        const scr = pt.matrixTransform(svg.getScreenCTM());
        const cardRect = card.getBoundingClientRect();
        const px = scr.x - cardRect.left;
        const py = scr.y - cardRect.top;

        tip.style.opacity = "1";
        tip.style.transform = "translate(0,0)";
        tip.setAttribute("aria-hidden","false");
        tip.style.left = "0px"; tip.style.top  = "0px";
        const tr = tip.getBoundingClientRect();

        const offX = 6, offY = 10;
        let L = Math.round(px + offX - tr.width*0.12);
        let T = Math.round(py - offY - tr.height - 6);
        const maxL = card.clientWidth  - tr.width  - 8;
        const maxT = card.clientHeight - tr.height - 8;
        L = Math.max(8, Math.min(L, maxL));
        T = Math.max(8, Math.min(T, maxT));
        tip.style.left = `${L}px`;
        tip.style.top  = `${T}px`;
      }

      // Reposition tooltip on resize
      if (activeIdx != null){
        const sel = `.time-dots.${activeSeries} .time-dot[data-idx="${activeIdx}"]`;
        const active = svg.querySelector(sel);
        if (active) positionTip(active);
      }

      // Click outside hides tooltip
      if (!card._timeOutsideHandlerAttached){
        card.addEventListener("pointerdown", (e)=>{
          if (!svg.contains(e.target)){
            activeIdx = null;
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden","true");
            svg.querySelectorAll('.time-dot[data-active="1"]').forEach(n => n.removeAttribute("data-active"));
          }
        }, { passive:true });
        card._timeOutsideHandlerAttached = true;
      }

      // Empty state
      if (!basePts.length && !(cmpPts && cmpPts.length)){
        const empty = el("div", { class:"best-empty" },
          "Keine Zeiten für ", (DISCIPLINES.find(d=>d.key===discKey)?.label || "diese Disziplin"), "."
        );
        svg.appendChild(s("g")); // nur damit SVG existiert
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





  /* baut die Serie [{age,lsc,date,meet_name}] aus (gemergten) meets */
  function buildLSCSeries(a){
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);

    const rows = [];
    for (const m of meets){
      const dateISO = String(m?.date || "").slice(0,10);
      if (!dateISO) continue;
      const d = new Date(dateISO);
      if (isNaN(d)) continue;

      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      let best = { lauf:-1, lsc:NaN };
      for (const r of runs){
        const lauf = Number(r?._lauf || r?.Vorläufe || 1);
        const lsc  = parseFloat(String(r?.LSC ?? m?.LSC ?? "").replace(",", "."));
        if (Number.isFinite(lauf) && Number.isFinite(lsc) && lauf >= best.lauf){
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




  /* Nimmt zusammengefasste Meets und liefert Punkte
    [{age:Number, lsc:Number, date:"YYYY-MM-DD", meet_name:String}]  */
  function buildLSCSeries(a){
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);

    const rows = [];
    for (const m of meets){
      const dateISO = String(m?.date || "").slice(0,10);
      if (!dateISO) continue;
      const d = new Date(dateISO);
      if (isNaN(d)) continue;

      // LSC aus höchstem Lauf wählen (falls _runs vorhanden)
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      let best = { lauf: -1, lsc: NaN };
      for (const r of runs){
        const lauf = Number(r?._lauf || r?.Vorläufe || 1);
        const lsc  = parseFloat(String(r?.LSC ?? m?.LSC ?? "").replace(",", "."));
        if (Number.isFinite(lauf) && Number.isFinite(lsc) && lauf >= best.lauf){
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




  // ---------- UI: Suche ----------
  const AppState = {
    athletes: [
      // Alte Struktur (funktioniert weiterhin)
      {
        id: "a1",
        name: "Lena Hoffmann",
        ortsgruppe: "Karlsruhe",
        geschlecht: "weiblich",
        jahrgang: 2007,
        poolLen: "50",
        medals: { gold: 18, silver: 6, bronze: 7, title: "Medaillen" },
        lsc: 742,
        totalDisciplines: 20,
        countriesDE: ["Deutschland","Schweiz","Italien"],
        meets: [
          { date: "2023-03-16", pool: "50", Land: "Deutschland" },
          { date: "2023-05-11", pool: "25", Land: "Deutschland" },
          { date: "2023-06-29", pool: "50", Land: "Schweiz" },
          { date: "2024-02-01", pool: "50", Land: "Italien" }
        ],
        pbs: {
          "50": { "50_retten": 32.18, "100_retten_flosse": 55.42, "100_kombi": 70.31, "100_lifesaver": 63.05, "200_super": 146.22, "200_hindernis": 139.88 },
          "25": { "50_retten": 31.50, "100_lifesaver": 54.10 }
        },
        stats: {
          "50": { "50_retten": { starts:12,dq:1 }, "100_retten_flosse":{ starts:8,dq:0 }, "100_kombi":{ starts:6,dq:0 }, "100_lifesaver":{ starts:10,dq:2 }, "200_super":{ starts:4,dq:0 }, "200_hindernis":{ starts:7,dq:1 } },
          "25": { "50_retten": { starts:9,dq:0 }, "100_lifesaver":{ starts:5,dq:1 } }
        }
      },
      // Neue Zielstruktur – Beispiel (gekürzt)
      {
        id: "ath_jan-philipp",
        name: "Jan-Philipp Gnad",
        geschlecht: "männlich",
        jahrgang: 2001,
        poolLen: "50",
        meets: [
          {
            meet_name: "BMS-KA - 2024",
            date: "2024-03-16",
            pool: "25",
            Ortsgruppe: "Wettersbach",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "OG",
            Wertung: "Einzelkampf",
            Vorläufe: "1",
            LSC: "792,40",

            Mehrkampf_Platz: "",

            "50m_Retten_Zeit": "0:34,20",  "50m_Retten_Platz": "2",
            "100m_Retten_Zeit": "0:57,90", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "DQ",       "100m_Kombi_Platz": "",
            "100m_Lifesaver_Zeit": "1:02,45", "100m_Lifesaver_Platz": "3",
            "200m_SuperLifesaver_Zeit": "2:40,30", "200m_SuperLifesaver_Platz": "1",
            "200m_Hindernis_Zeit": "2:25,50", "200m_Hindernis_Platz": "2"
          },
          {
            meet_name: "Orange-Cup - 2024",
            date: "2025-11-09",
            pool: "50",
            Ortsgruppe: "Masch",
            Regelwerk: "International",
            Land: "Niederlande",
            Startrecht: "BV",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "815,20",

            Mehrkampf_Platz: "2",

            "50m_Retten_Zeit": "0:34,85",  "50m_Retten_Platz": "2",
            "100m_Retten_Zeit": "0:58,40", "100m_Retten_Platz": "15",
            "100m_Kombi_Zeit": "1:14,80",  "100m_Kombi_Platz": "15",
            "100m_Lifesaver_Zeit": "1:01,90", "100m_Lifesaver_Platz": "6",
            "200m_SuperLifesaver_Zeit": "2:39,80", "200m_SuperLifesaver_Platz": "5",
            "200m_Hindernis_Zeit": "2:22,22", "200m_Hindernis_Platz": "4"
          },
          {
            meet_name: "Orange-Cup - 2024",
            date: "2025-11-09",
            pool: "50",
            Ortsgruppe: "Masch",
            Regelwerk: "International",
            Land: "Niederlande",
            Startrecht: "BV",
            Wertung: "Einzelkampf",
            Vorläufe: "2",
            LSC: "815,23",

            Mehrkampf_Platz: "5",
            "200m_Hindernis_Zeit": "2:18,50", "200m_Hindernis_Platz": "5",
            "50m_Retten_Zeit": "0:34,00",  "50m_Retten_Platz": "1",
          },
          {
            meet_name: "LMS - 2025",
            date: "2025-05-18",
            pool: "50",
            Ortsgruppe: "Malsch",
            Regelwerk: "International",
            Land: "Deutschland",
            Startrecht: "OG",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "830,75",

            Mehrkampf_Platz: "1",

            "50m_Retten_Zeit": "0:38,50",  "50m_Retten_Platz": "1",
            "100m_Retten_Zeit": "0:57,40", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "1:13,90",  "100m_Kombi_Platz": "2",
            "100m_Lifesaver_Zeit": "1:00,80", "100m_Lifesaver_Platz": "2",
            "200m_SuperLifesaver_Zeit": "2:38,50", "200m_SuperLifesaver_Platz": "1",
            "200m_Hindernis_Zeit": "2:22,95", "200m_Hindernis_Platz": "2"
          },
          {
            meet_name: "BP - 2025",
            date: "2025-07-27",
            pool: "50",
            Ortsgruppe: "Ettlingen",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "LV",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "830,75",

            Mehrkampf_Platz: "1",

            "50m_Retten_Zeit": "0:39,60",  "50m_Retten_Platz": "1",
            "100m_Retten_Zeit": "0:57,40", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "1:13,90",  "100m_Kombi_Platz": "2",
            "100m_Lifesaver_Zeit": "1:00,80", "100m_Lifesaver_Platz": "2",
            "200m_SuperLifesaver_Zeit": "2:38,50", "200m_SuperLifesaver_Platz": "1",
            "200m_Hindernis_Zeit": "2:22,95", "200m_Hindernis_Platz": "2"
          }
        ]
      },
      {
        id: "ath_julian",
        name: "Julian von Auenmüller",
        AktuelleOrtsgruppe: "Oberhausen Rheinhausen",
        geschlecht: "männlich",
        jahrgang: 2001,
        poolLen: "50",
        meets: [
          {
            meet_name: "BMS-KA - 2024",
            date: "2024-03-16",
            pool: "25",
            Ortsgruppe: "Oberhausen Rheinhausen",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "OG",
            Wertung: "Einzelkampf",
            Vorläufe: "1",
            LSC: "685,40",

            Mehrkampf_Platz: "2",

            "50m_Retten_Zeit": "0:33,20",  "50m_Retten_Platz": "2",
            "100m_Retten_Zeit": "0:57,90", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "DQ",       "100m_Kombi_Platz": "",
            "100m_Lifesaver_Zeit": "1:02,45", "100m_Lifesaver_Platz": "3",
            "200m_SuperLifesaver_Zeit": "2:40,30", "200m_SuperLifesaver_Platz": "1",
            "200m_Hindernis_Zeit": "2:25,50", "200m_Hindernis_Platz": "2"
          },
          {
            meet_name: "Orange-Cup - 2024",
            date: "2024-11-09",
            pool: "50",
            Ortsgruppe: "Oberhausen Rheinhausen",
            Regelwerk: "International",
            Land: "Niederlande",
            Startrecht: "LV",
            Wertung: "Einzel-/Mehrkampf",
            Vorläufe: "1",
            LSC: "752,20",

            Mehrkampf_Platz: "56",

            "50m_Retten_Zeit": "0:34,00",  "50m_Retten_Platz": "3",
            "100m_Retten_Zeit": "0:58,40", "100m_Retten_Platz": "2",
            "100m_Kombi_Zeit": "1:14,80",  "100m_Kombi_Platz": "5",
            "100m_Lifesaver_Zeit": "1:01,90", "100m_Lifesaver_Platz": "2",
            "200m_SuperLifesaver_Zeit": "2:39,80", "200m_SuperLifesaver_Platz": "4",
            "200m_Hindernis_Zeit": "", "200m_Hindernis_Platz": ""
          },
          {
            meet_name: "LMS - 2025",
            date: "2025-05-18",
            pool: "50",
            Ortsgruppe: "Oberhausen Rheinhausen",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "OG",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "880,75",

            Mehrkampf_Platz: "1",

            "50m_Retten_Zeit": "0:35,50",  "50m_Retten_Platz": "1",
            "100m_Retten_Zeit": "0:57,40", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "1:13,90",  "100m_Kombi_Platz": "2",
            "100m_Lifesaver_Zeit": "1:00,80", "100m_Lifesaver_Platz": "2",
            "200m_SuperLifesaver_Zeit": "2:38,50", "200m_SuperLifesaver_Platz": "1",
            "200m_Hindernis_Zeit": "2:22,95", "200m_Hindernis_Platz": "2"
          }
        ]
      },
      {
        id: "ath_lisa",
        name: "Lisa Brenzinger",
        AktuelleOrtsgruppe: "Malsch",
        geschlecht: "weiblich",
        jahrgang: 1999,
        poolLen: "50",
        meets: [
          {
            meet_name: "BMS-RN-MA - 2023",
            date: "2023-10-07",
            pool: "25",
            Ortsgruppe: "Malsch",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "OG",
            Wertung: "Einzelkampf",
            Vorläufe: "1",
            LSC: "801,12",

            Mehrkampf_Platz: "",

            "50m_Retten_Zeit": "0:33,50",  "50m_Retten_Platz": "1",
            "100m_Retten_Zeit": "0:56,70", "100m_Retten_Platz": "2",
            "100m_Kombi_Zeit": "1:12,90",  "100m_Kombi_Platz": "3",
            "100m_Lifesaver_Zeit": "1:00,30", "100m_Lifesaver_Platz": "2",
            "200m_SuperLifesaver_Zeit": "2:36,20", "200m_SuperLifesaver_Platz": "3",
            "200m_Hindernis_Zeit": "", "200m_Hindernis_Platz": ""
          },
          {
            meet_name: "French-Rescue - 2024",
            date: "2024-06-15",
            pool: "50",
            Ortsgruppe: "Malsch",
            Regelwerk: "International",
            Land: "Frankreich",
            Startrecht: "LV",
            Wertung: "Einzel-/Mehrkampf",
            Vorläufe: "1",
            LSC: "842,90",

            Mehrkampf_Platz: "1",

            "50m_Retten_Zeit": "0:33,90",  "50m_Retten_Platz": "2",
            "100m_Retten_Zeit": "0:57,20", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "1:13,10",  "100m_Kombi_Platz": "2",
            "100m_Lifesaver_Zeit": "1:00,10", "100m_Lifesaver_Platz": "1",
            "200m_SuperLifesaver_Zeit": "2:35,50", "200m_SuperLifesaver_Platz": "2",
            "200m_Hindernis_Zeit": "2:21,80", "200m_Hindernis_Platz": "3"
          },
          {
            meet_name: "MISP-2025",
            date: "2025-02-22",
            pool: "25",
            Ortsgruppe: "Malsch",
            Regelwerk: "International",
            Land: "Belgien",
            Startrecht: "LV",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "856,33",

            Mehrkampf_Platz: "1",

            "50m_Retten_Zeit": "0:33,20",  "50m_Retten_Platz": "1",
            "100m_Retten_Zeit": "0:56,10", "100m_Retten_Platz": "1",
            "100m_Kombi_Zeit": "1:11,90",  "100m_Kombi_Platz": "1",
            "100m_Lifesaver_Zeit": "0:59,60", "100m_Lifesaver_Platz": "1",
            "200m_SuperLifesaver_Zeit": "2:33,80", "200m_SuperLifesaver_Platz": "1",
            "200m_Hindernis_Zeit": "2:18,90", "200m_Hindernis_Platz": "2"
          }
        ]
      },
      {
        id: "ath_lea",
        name: "Lea Hunger",
        AktuelleOrtsgruppe: "Weil am Rhein",
        geschlecht: "weiblich",
        jahrgang: 2011,
        poolLen: "50",
        meets: [
          {
            meet_name: "BMS-HR-ML - 2024",
            date: "2024-04-20",
            pool: "25",
            Ortsgruppe: "Weil am Rhein",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "OG",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "612,10",

            Mehrkampf_Platz: "3",

            "50m_Retten_Zeit": "0:43,50",  "50m_Retten_Platz": "4",
            "100m_Retten_Zeit": "1:18,20", "100m_Retten_Platz": "5",
            "100m_Kombi_Zeit": "DQ",       "100m_Kombi_Platz": "",
            "100m_Lifesaver_Zeit": "1:25,00", "100m_Lifesaver_Platz": "6",
            "200m_SuperLifesaver_Zeit": "3:25,40", "200m_SuperLifesaver_Platz": "3",
            "200m_Hindernis_Zeit": "3:01,80", "200m_Hindernis_Platz": "4"
          },
          {
            meet_name: "SLRG - 2024",
            date: "2024-09-28",
            pool: "50",
            Ortsgruppe: "Weil am Rhein",
            Regelwerk: "National",
            Land: "Schweiz",
            Startrecht: "LV",
            Wertung: "Einzelkampf",
            Vorläufe: "1",
            LSC: "640,55",

            Mehrkampf_Platz: "",

            "50m_Retten_Zeit": "0:42,80",  "50m_Retten_Platz": "5",
            "100m_Retten_Zeit": "1:17,50", "100m_Retten_Platz": "5",
            "100m_Kombi_Zeit": "1:36,20",  "100m_Kombi_Platz": "6",
            "100m_Lifesaver_Zeit": "1:23,80", "100m_Lifesaver_Platz": "5",
            "200m_SuperLifesaver_Zeit": "", "200m_SuperLifesaver_Platz": "",
            "200m_Hindernis_Zeit": "2:58,40", "200m_Hindernis_Platz": "5"
          },
          {
            meet_name: "Bodensee-Pokal -2025",
            date: "2025-07-27",
            pool: "50",
            Ortsgruppe: "Weil am Rhein",
            Regelwerk: "National",
            Land: "Deutschland",
            Startrecht: "LV",
            Wertung: "Mehrkampf",
            Vorläufe: "1",
            LSC: "658,20",

            Mehrkampf_Platz: "2",

            "50m_Retten_Zeit": "0:41,95",  "50m_Retten_Platz": "3",
            "100m_Retten_Zeit": "1:16,90", "100m_Retten_Platz": "4",
            "100m_Kombi_Zeit": "1:35,10",  "100m_Kombi_Platz": "4",
            "100m_Lifesaver_Zeit": "1:22,60", "100m_Lifesaver_Platz": "4",
            "200m_SuperLifesaver_Zeit": "3:18,90", "200m_SuperLifesaver_Platz": "3",
            "200m_Hindernis_Zeit": "2:55,70", "200m_Hindernis_Platz": "3"
          }
        ]
      }
    ],

    query: "", suggestions: [], activeIndex: -1, selectedAthleteId: null, poolLen: "50"
  };

  const Refs = { input: null, suggest: null, profileMount: null, searchWrap: null, bestGrid: null, bestBtn50: null, bestBtn25: null };

  // ---------- Suche ----------
  function renderApp() {
    const mount = $("#athleten-container"); if (!mount) return;
    mount.innerHTML = "";
    const ui = h("section", { class: "ath-ui", role: "region", "aria-label": "Athletenbereich" });
    ui.appendChild(h("p", { class: "ath-ui-note" }, "Suche nach Name (ab 2 Zeichen). Treffer erscheinen im Dropdown. Auswahl öffnet das Profil."));
    ui.appendChild(renderSearch());
    const profile = h("div", { id: "ath-profile" }); Refs.profileMount = profile; ui.appendChild(profile);
    mount.appendChild(ui);
  }

  function renderSearch() {
    const wrap = h("div", { class: "ath-search-wrap" }); Refs.searchWrap = wrap;
    const input = h("input", { class: "ath-input", type: "search", placeholder: "Name suchen …", role: "searchbox", "aria-label": "Athleten suchen", autocomplete: "off", oninput: onQueryChange, onkeydown: onSearchKeyDown });
    Refs.input = input;
    const searchBtn = h("button", { class: "ath-btn primary", type: "button", title: "Ersten Treffer öffnen",
      onclick: () => { if (AppState.suggestions.length > 0) openProfile(AppState.suggestions[0]); } }, "Öffnen");
    wrap.appendChild(h("div", { class: "ath-ui-search", role: "search" }, input, searchBtn));
    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "ath-suggest" }); Refs.suggest = suggest; wrap.appendChild(suggest);
    document.addEventListener("click", (e) => { if (!Refs.searchWrap.contains(e.target)) hideSuggestions(); });
    return wrap;
  }

  function onQueryChange(e){ AppState.query = e.target.value || ""; updateSuggestions(); }
  function onSearchKeyDown(e){
    const { suggestions, activeIndex } = AppState;
    if (e.key === "ArrowDown") { if (!suggestions.length) return; e.preventDefault(); AppState.activeIndex = (activeIndex + 1) % suggestions.length; paintSuggestions(); }
    else if (e.key === "ArrowUp") { if (!suggestions.length) return; e.preventDefault(); AppState.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length; paintSuggestions(); }
    else if (e.key === "Enter") { if (!suggestions.length) return; e.preventDefault(); openProfile(suggestions[activeIndex >= 0 ? activeIndex : 0]); }
    else if (e.key === "Escape") { hideSuggestions(); }
  }

  function updateSuggestions() {
    const q = AppState.query.trim();
    if (q.length < 2) { AppState.suggestions = []; AppState.activeIndex = -1; hideSuggestions(); return; }
    const nq = normalize(q);
    let list = AppState.athletes.map(a => ({ a, nName: normalize(a.name) })).filter(({ nName }) => nName.includes(nq));
    list.sort((l, r) => {
      const aStart = l.nName.startsWith(nq) ? 0 : 1;
      const bStart = r.nName.startsWith(nq) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return l.nName.localeCompare(r.nName);
    });
    AppState.suggestions = list.map(x => x.a).slice(0, 8);
    AppState.activeIndex = AppState.suggestions.length ? 0 : -1;
    paintSuggestions();
  }

  function hideSuggestions(){ if (Refs.suggest) { Refs.suggest.classList.add("hidden"); Refs.suggest.innerHTML = ""; } }

  function paintSuggestions(){
    const box = Refs.suggest; if (!box) return;
    const q = AppState.query.trim(); box.innerHTML = "";

    if (!q || !AppState.suggestions.length) {
      box.appendChild(
        h("div", { class: "ath-suggest-empty" },
          q.length < 2 ? "Mind. 2 Zeichen eingeben" : "Keine Treffer"
        )
      );
      box.classList.remove("hidden");
      return;
    }

    AppState.suggestions.forEach((a, idx) => {
      const item = h("div", {
        class: "ath-suggest-item" + (idx === AppState.activeIndex ? " active" : ""),
        role: "option",
        "aria-selected": idx === AppState.activeIndex ? "true" : "false",
        onpointerdown: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); },
        ontouchstart: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); },
        onclick: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); },
        onmouseenter: () => {
          if (AppState.activeIndex === idx) return;
          box.querySelector('.ath-suggest-item.active')?.classList.remove('active');
          item.classList.add('active');
          AppState.activeIndex = idx;
        }
      });

      // Cap-Avatar (klein)
      item.appendChild(renderCapAvatar(a, "sm", "ath-suggest-avatar"));

      // Name + Jahrgang
      const nameEl = h("div", { class: "ath-suggest-name" });
      nameEl.innerHTML = `${highlight(a.name, q)} <span class="ath-year">(${a.jahrgang})</span>`;

      // ★ aktuelle OG aus Meets
      const ogNow = currentOrtsgruppeFromMeets(a) || a.ortsgruppe || "";
      const sub = h("div", { class: "ath-suggest-sub" }, formatOrtsgruppe(ogNow));

      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);
      item.appendChild(text);

      box.appendChild(item);
    });

    box.classList.remove("hidden");
  }


  // ---------- Bestzeiten-Section ----------
  function renderBahnSwitch(athlete) {
    const wrap = h("div", { class: "ath-bests-switch", role: "group", "aria-label": "Bahnlänge" });
    const b50 = h("button", { class: "seg-btn" + (AppState.poolLen === "50" ? " active" : ""), type: "button",
      onclick: () => { if (AppState.poolLen !== "50") { AppState.poolLen = "50"; b50.classList.add("active"); b25.classList.remove("active"); paintBestzeitenGrid(athlete); } } }, "50 m");
    const b25 = h("button", { class: "seg-btn" + (AppState.poolLen === "25" ? " active" : ""), type: "button",
      onclick: () => { if (AppState.poolLen !== "25") { AppState.poolLen = "25"; b25.classList.add("active"); b50.classList.remove("active"); paintBestzeitenGrid(athlete); } } }, "25 m");
    Refs.bestBtn50 = b50; Refs.bestBtn25 = b25;
    return h("div", { class: "seg" }, b50, b25);
  }

  function renderBestzeitenSection(athlete) {
    const header = h("div", { class: "ath-bests-header" }, h("h3", {}, ""), renderBahnSwitch(athlete));
    const grid = h("div", { class: "ath-bests-grid" }); Refs.bestGrid = grid;
    const section = h("div", { class: "ath-profile-section bests" }, header, grid);
    paintBestzeitenGrid(athlete);
    section.appendChild(renderTimeChart(athlete));
    return section;
  }

  function paintBestzeitenGrid(athlete) {
    if (!Refs.bestGrid) return;

    const lane    = AppState.poolLen || "50";
    const times   = (athlete.pbs   && athlete.pbs[lane])   || {};
    const statsMap= (athlete.stats && athlete.stats[lane]) || {};

    Refs.bestGrid.innerHTML = "";

    // --- NEU: Disziplinen anzeigen, wenn (PB-Zeit vorhanden) ODER (DQ>0) ---
    const showList = DISCIPLINES.filter(d => {
      const hasTime = Number.isFinite(times[d.key]);
      const dqOnly  = Number(statsMap[d.key]?.dq || 0) > 0;
      return hasTime || dqOnly;
    });

    if (!showList.length) {
      Refs.bestGrid.appendChild(
        h("div", { class: "best-empty" },
          lane === "50" ? "Keine Bestzeiten auf 50 m vorhanden." : "Keine Bestzeiten auf 25 m vorhanden."
        )
      );
      return;
    }

    showList.forEach(d => {
      const sec    = times[d.key];                     // PB (kann undefined sein)
      const st     = statsMap[d.key] || {};
      const starts = Number(st.starts || 0);
      const dq     = Number(st.dq || 0);
      const hasTime= Number.isFinite(sec);

      const frontValue = hasTime ? formatSeconds(sec) : (dq > 0 ? "DQ" : "—");
      const aria = hasTime ? `Bestzeit ${formatSeconds(sec)}` : (dq > 0 ? "DQ" : "keine Zeit");

      const tile = h("article", {
        class: "best-tile",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": `${d.label} – ${aria}`
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "best-label" }, d.label),
        h("div", { class: "best-time"  }, frontValue)
      );

      // BACK (Schnitt + Starts + DQ)
      const avgSec = avgTimeForDiscipline(athlete, lane, d);

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "tile-stats" },
          statRow("Schnitt", Number.isFinite(avgSec) ? formatSeconds(avgSec) : "—"),
          statRow("Starts", starts),
          statRow("DQ / Strafen", dq)
        )
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);
      Refs.bestGrid.appendChild(tile);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) tile.addEventListener("pointerdown", toggleLock);
      else { tile.addEventListener("click", toggleLock); tile.addEventListener("touchstart", toggleLock, { passive: true }); }
      tile.addEventListener("keydown", (e) => { if (e.key==="Enter"||e.key===" "){ e.preventDefault(); toggleLock(); } });

      function statRow(k, v){
        return h("div", { class: "stat" }, h("span", { class: "k" }, k), h("span", { class: "v" }, String(v)));
      }
    });
  }


  // ---------- Medaillen ----------
  function renderMedalStats(a) {
    const m = (a && a.medals) || {};
    const g = Number(m.gold || 0), s = Number(m.silver || 0), b = Number(m.bronze || 0);
    const total = g + s + b, max = Math.max(g, s, b, 1), H = 72;
    const bar = (cls, label, value) => {
      const hpx = Math.round((value / max) * H);
      return hDiv("div", { class: `med-col ${cls}` },
        hDiv("div", { class: "med-count" }, String(value)),
        hDiv("div", { class: "med-barWrap" }, hDiv("div", { class: "med-bar", style: `height:${hpx}px` })),
        hDiv("div", { class: "med-label" }, label)
      );
    };
    return hDiv("aside", { class: "med-card", "aria-label": "Medaillen" },
      hDiv("div", { class: "med-head" }, hDiv("div", { class: "med-title" }, m.title || "Medaillen"), hDiv("div", { class: "med-total" }, String(total))),
      hDiv("div", { class: "med-grid" }, bar("gold","GOLD",g), bar("silver","SILBER",s), bar("bronze","BRONZE",b))
    );
  }

  // ---------- Überblick ----------
  function renderOverviewSection(a){
    const header = h("div", { class: "ath-info-header" }, h("h3", {}, ""));
    const grid = h("div", { class: "ath-info-grid" });

    const meets = computeMeetInfo(a);
    const totalDisc = Number.isFinite(+a.totalDisciplines) ? +a.totalDisciplines : null;
    const totalDQ = sumAllDQ(a);
    const startsPer = computeStartsPerStartrecht(a);
    const totalStarts = totalStartsFromMeets(a);
    const dqLane = computeLaneDQProb(a);
    const totalMeters = sumWettkampfMeter(a);
    const chartCard = renderLSCChart(a);
    const pieCard = renderDisciplinePieCard(a);

    grid.appendChild(infoTileBig("LSC", a.lsc != null ? fmtInt(a.lsc) : "—"));
    grid.appendChild(infoTileWettkaempfeFlip(a, meets));
    grid.appendChild(infoTileStartsFlip(totalStarts, startsPer));
    grid.appendChild(infoTileDQFlip(totalDQ, dqLane));
    grid.appendChild(renderBahnverteilungTile(a));
    grid.appendChild(renderRegelwerkTile(a));
    grid.appendChild(infoTileYearsFlip(meets.activeYears, meets.first, meets.firstName));
    grid.appendChild(infoTileMetersFlip("Wettkampfmeter", totalMeters, meets.total)); // ← NEU

    return h("div", { class: "ath-profile-section info" }, header, grid, chartCard, pieCard);


    function infoTile(label, value){
      return h("div", { class: "info-tile" }, h("div", { class: "info-label" }, label), h("div", { class: "info-value" }, value));
    }
    function infoTileBig(label, value){
      const title = h("div", { class: "info-label lsc-label", "data-state": "short" },
        h("span", { class: "label label-short", "aria-hidden": "false" }, "LSC"),
        h("span", { class: "label label-long",  "aria-hidden": "true"  }, "Lifesaving Score")
      );
      const valueEl = h("div", { class: "info-value big" }, value);
      const wrap = h("div", { class: "info-tile accent lsc-tile", role: "button", tabindex: "0", "aria-pressed": "false",
        onclick: toggle, onkeydown: (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(); } } }, title, valueEl);
      function toggle(){
        const toLong = title.dataset.state !== "long";
        title.dataset.state = toLong ? "long" : "short";
        title.classList.toggle("show-long", toLong);
        title.querySelector(".label-short")?.setAttribute("aria-hidden", toLong ? "true" : "false");
        title.querySelector(".label-long")?.setAttribute("aria-hidden",  toLong ? "false" : "true");
        wrap.setAttribute("aria-pressed", toLong ? "true" : "false");
      }
      return wrap;
    }
    function infoTileDist(label, m){
      return h("div", { class: "info-tile dist" },
        h("div", { class: "info-label" }, label),
        h("div", { class: "info-progress" }, h("div", { class: "p50", style: `width:${m.pct50 || 0}%` })),
        h("div", { class: "info-legend" }, h("span", { class: "l50" }, `50m ${m.pct50 || 0}%`))
      );
    }

    function renderBahnverteilungTile(a){
      const m = computeMeetInfo(a); // liefert u.a. m.pct50, m.c50, m.c25

      const tile  = h("div", {
        class: "info-tile flip dist",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Bahnverteilung"
      });

      const inner = h("div", { class: "tile-inner" });

      // FRONT: Balken + Legende (wie vorher)
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Bahnverteilung"),
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "p50", style: `width:${m.pct50 || 0}%` })
          );
          return bar;
        })(),
        h("div", { class: "info-legend" },
          h("span", { class: "l50" }, `50m ${m.pct50 || 0}%`)
        )
      );

      // BACK: Anzahl Wettkämpfe 25m/50m (nur Zeilen > 0)
      const rows = [];
      if (m.c25 > 0) rows.push(statRow("25m Bahn", m.c25));
      if (m.c50 > 0) rows.push(statRow("50m Bahn", m.c50));
      if (rows.length === 0) rows.push(statRow("—", "—")); // falls (noch) keine Daten

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Wettkämpfe auf"),
        h("div", { class: "tile-stats" }, rows)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      // Klick = Lock/Unlock (Hover-Flip macht dein CSS)
      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;

      function statRow(k, v){
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }


    function infoTileWettkaempfeFlip(a, meets){
      const counts = countStartrechte(a);              // {OG,BZ,LV,BV}
      const rows = Object.entries(counts).filter(([,v]) => v > 0);

      const tile = h("div", {
        class: "info-tile flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Wettkämpfe – Details nach Startrecht",
      });

      const inner = h("div", { class: "tile-inner" });

      // Vorderseite (wie gehabt)
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Wettkämpfe"),
        h("div", { class: "info-value" }, fmtInt(meets.total))
      );

      // Rückseite: NUR Liste (keine Überschrift)
      const back = h("div", { class: "tile-face tile-back" },
        rows.length
          ? h("div", { class: "tile-stats" },
              ...rows.map(([k,v]) =>
                h("div", { class: "stat" },
                  h("span", { class: "k" }, k),
                  h("span", { class: "v" }, String(v))
                )
              )
            )
          : h("div", { class: "best-empty" }, "Keine Starts mit OG/BZ/LV/BV")
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      // Flip-Verhalten: Desktop hover, Klick toggelt Lock (auch mobil)
      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window){
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, {passive:true});
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;
    }

    function infoTileStartsFlip(total, per){
      const tile = h("div", {
        class: "info-tile flip starts-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      // FRONT – wie normale Info-Kachel
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Total Starts"),
        h("div", { class: "info-value" }, fmtInt(total))
      );

      // BACK – nur Startrechte mit >0 anzeigen
      const list = [];
      const labelMap = { OG: "OG", BZ: "BZ", LV: "LV", BV: "BV" };
      (["OG","BZ","LV","BV"]).forEach(k => {
        const v = per[k] || 0;
        if (v > 0) {
          list.push(statRow(labelMap[k], v));
        }
      });

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "tile-stats" }, ...list)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle(){
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }

      return tile;
    }

    function renderRegelwerkTile(a){
      const c = countRegelwerk(a.meets);

      const tile  = h("div", {
        class: "info-tile flip regelwerk",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Regelwerk"
      });

      const inner = h("div", { class: "tile-inner" });

      // FRONT (Progress + Legende)
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Regelwerk"),
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "pIntl", style: `width:${c.pctIntl}%` })
          );
          return bar;
        })(),
        h("div", { class: "info-legend" },
          h("span", {
            class: "lintl"
          }, (c.pctIntl === 0 ? `National: 100%` : `International: ${c.pctIntl}%`))
        )
      );

      // BACK (Zähler National/International – nur zeigen, was > 0 ist)
      const backStats = [];
      if (c.nat > 0)  backStats.push(statRow("National",      c.nat));
      if (c.intl > 0) backStats.push(statRow("International", c.intl));
      if (backStats.length === 0) backStats.push(statRow("—", "—")); // falls keine Daten

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Regelwerk"),
        h("div", { class: "tile-stats" }, backStats)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      // Hover-Flip macht dein CSS.
      // Klick = Lock/Unlock (wie bei den anderen)
      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;

      function statRow(k, v){
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }





    function infoTileYearsFlip(activeYears, firstISO, firstName){
      const tile = h("div", {
        class: "info-tile flip years-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      // Vorderseite
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Aktive Jahre"),
        h("div", { class: "info-value" }, fmtInt(activeYears))
      );

      // Rückseite: Datum + darunter der Name
      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Erster Wettkampf"),
        h("div", { class: "info-value" }, fmtDate(firstISO)),
        firstName ? h("div", { class: "info-sub" }, firstName) : null
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle(){
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }
      return tile;
    }

    function infoTileMetersFlip(label, totalMeters, totalMeets){
      const avg = totalMeets ? Math.round(totalMeters / totalMeets) : null;

      const tile  = h("div", {
        class: "info-tile flip meters",
        role: "button", tabindex: "0", "aria-pressed": "false"
      });
      const inner = h("div", { class: "tile-inner" });

      // Vorderseite
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, label),                 // "Wettkampfmeter"
        h("div", { class: "info-value" }, fmtMeters(totalMeters)) // Gesamtmeter
      );

      // Rückseite: NUR Titel "⌀ Meter / Wettkampf" + Wert
      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "⌀ Meter / Wettkampf"),
        h("div", { class: "info-value" }, avg != null ? fmtMeters(avg) : "—")
      );

      inner.append(front, back);
      tile.appendChild(inner);

      // Hover dreht (per CSS), Klick lockt/unlockt
      const toggle = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) tile.addEventListener("pointerdown", toggle);
      else { tile.addEventListener("click", toggle); tile.addEventListener("touchstart", toggle, { passive: true }); }
      tile.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });

      return tile;
    }



    function infoTileDQFlip(totalDQ, dqLane){
      const tile = h("div", {
        class: "info-tile flip dq-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      // Vorderseite (gesamt)
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "DQ / Strafen"),
        h("div", { class: "info-value" }, fmtInt(totalDQ))
      );

      // Rückseite (Wahrscheinlichkeit je Bahn – nur Zeilen mit Starts anzeigen)
      const rows = [];
      if (dqLane["25"].starts > 0){
        rows.push(
          h("div", { class: "dq-row" },
            h("span", { class: "lane" },  "25m"),
            h("span", { class: "pct"  },  `${dqLane["25"].pct.toLocaleString("de-DE",{ minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`),
            // geändert: nur DQ in Klammern
            h("span", { class: "meta" },  `(${dqLane["25"].dq})`)
          )
        );
      }
      if (dqLane["50"].starts > 0){
        rows.push(
          h("div", { class: "dq-row" },
            h("span", { class: "lane" },  "50m"),
            h("span", { class: "pct"  },  `${dqLane["50"].pct.toLocaleString("de-DE",{ minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`),
            // geändert: nur DQ in Klammern
            h("span", { class: "meta" },  `(${dqLane["50"].dq})`)
          )
        );
      }

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Wahrscheinlichkeit"),
        h("div", { class: "dq-rows" }, ...rows)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle(){
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }
      return tile;
    }




    function statRow(k, v){
      return h("div", { class: "stat" },
        h("span", { class: "k" }, k),
        h("span", { class: "v" }, fmtInt(v))
      );
    }
  }

  // ---------- Profil ----------
  function openProfile(a) {
    // NEU: zuerst meets mergen
    const mergedMeets = mergeDuplicateMeets(a.meets);

    // Aus (gemergten) meets alles ableiten …
    const derived = deriveFromMeets({ ...a, meets: mergedMeets });

    // ax enthält nur gemergte Meets
    const ax = { ...a, ...derived, meets: mergedMeets };

    AppState.poolLen = (ax && ax.poolLen) ? String(ax.poolLen) : (AppState.poolLen || "50");
    AppState.selectedAthleteId = ax?.id || null;
    hideSuggestions();

    // ... Rest von openProfile unverändert ...


    const mount = Refs.profileMount; if (!mount) return;
    if (!ax) { mount.innerHTML = ""; mount.classList.remove("ath-profile-wrap"); return; }

    const KV = (k, v) =>
      h("span", { class: "kv", "data-key": k },
        h("span", { class: "k" }, k + ":"),
        h("span", { class: "v" }, v)
      );

    // ★ aktuelle OG aus Meets berechnen (mit Fallback auf evtl. altes Feld)
    const currOG = currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "";
    // --- Tabs + Panels ---
    const tabsWrap = renderAthTabsAndPanels(ax);
    const profile = h("article", { class: "ath-profile" },
      h("div", { class: "ath-profile-head" },
      
        // Cap lädt intern bereits die aktuelle OG
        renderCapAvatar(ax),

        h("div", { class: "ath-profile-title" },
          h("h2", {}, ax.name),

          // Chips-Zeile: Gender + AK + Aktivitätsstatus
          (() => {
            const gt   = genderTag(ax.geschlecht);
            const ak   = akLabelFromJahrgang(ax.jahrgang);
            const meets = computeMeetInfo(ax);
            const act   = activityStatusFromLast(meets.last);
            const lastStr = fmtDate(meets.last);
            const age  = ageFromJahrgang(ax.jahrgang);
            const band = (age != null && age <= 18) ? "youth" : "open";

            const srIcons = renderStartrechtIcons(ax); // kann null sein

            return h("div", { class: "gender-row" },
              h("span", { class: `gender-chip ${gt.cls}`, title: gt.full, "aria-label": `Geschlecht: ${gt.full}` }, gt.full),
              h("span", { class: `ak-chip ${band}`,       title: `Altersklasse ${ak}`, "aria-label": `Altersklasse ${ak}` }, ak),
              h("span", { class: `status-chip ${act.key}`, title: `Letzter Wettkampf: ${lastStr}`, "aria-label": `Aktivitätsstatus: ${act.label}. Letzter Wettkampf: ${lastStr}` },
                h("span", { class: "status-dot" }), act.label
              ),
              srIcons
            );
          })(),

          // ★ Meta: OG + Jahrgang (OG = aktuelle)
          // ...innerhalb der ath-profile-title:
          h("div", { class: "ath-profile-meta" },
            KV("Ortsgruppe", currOG),
            KV("Jahrgang", String(ax.jahrgang)),
            KV("Länderpins", renderCountryFlagsInline(ax) || "—")   // ← NEU
          ),
        ),
        renderMedalStats(ax)
        
      ),
      h("div", { class: "ath-card-buttom" },
        tabsWrap,
        h("div", { class: "ath-profile-section muted" },
          "Hier kommt später die Statistik (GUI) aus deiner Excel-Datenbank rein."
        )
      ),
    );
    mount.innerHTML = "";
    mount.classList.add("ath-profile-wrap");
    mount.appendChild(profile);
    requestAnimationFrame(() => window.scrollTo({ top: 275, behavior: 'smooth' }));
  }


  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", renderApp);
})();
