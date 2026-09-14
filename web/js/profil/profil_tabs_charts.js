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
    getBaBestTimeDistributionValues,
    getAthletesPool,
  } = internals;

  const BA_DISTRIBUTION_LV = "BA";
  const BA_DISTRIBUTION_BIN_COUNT = 100;
  const BA_DISTRIBUTION_COMBINATION_CUTOFF = "2007-01-01";
  let distributionPatternCounter = 0;

  function normalizeDistributionGender(raw) {
    return String(raw || "").trim().toLowerCase().startsWith("w") ? "w" : "m";
  }

  function distributionLaneKey(lanes) {
    if (lanes.has("25") && lanes.has("50")) return "both";
    return lanes.has("25") ? "25" : "50";
  }

  function getOwnDistributionBest(athlete, lanes, discipline) {
    if (!athlete || !discipline) return NaN;
    let best = Infinity;

    for (const meet of athlete.meets || []) {
      if (!meet) continue;
      const runs = Array.isArray(meet._runs) && meet._runs.length ? meet._runs : [meet];

      for (const run of runs) {
        const lane = String(run?.pool || meet.pool || "").trim();
        if (!lanes.has(lane)) continue;

        const dateISO = String(run?.date || meet.date || "").slice(0, 10);
        if (
          discipline.key === "100_kombi" &&
          (!dateISO || dateISO < BA_DISTRIBUTION_COMBINATION_CUTOFF)
        ) {
          continue;
        }

        const seconds = parseTimeToSec(
          run?.[discipline.meetZeit] ?? meet?.[discipline.meetZeit]
        );
        if (Number.isFinite(seconds) && seconds < best) best = seconds;
      }
    }

    return Number.isFinite(best) ? best : NaN;
  }

  function buildDistributionHistogram(values, ownSeconds, comparisonSeconds) {
    if (!values.length) return null;

    const fastest = values[0];
    const percentileIndex = Math.max(0, Math.ceil(values.length * 0.95) - 1);
    const percentile95 = values[Math.min(percentileIndex, values.length - 1)];
    const rawWidth = Math.max(0, percentile95 - fastest) / BA_DISTRIBUTION_BIN_COUNT;
    const binWidth = Math.max(0.01, Math.round((rawWidth + Number.EPSILON) * 100) / 100);
    const counts = Array(BA_DISTRIBUTION_BIN_COUNT).fill(0);

    const indexForSeconds = (seconds) => {
      if (!Number.isFinite(seconds) || seconds <= fastest) return 0;
      const index = Math.floor(((seconds - fastest) + 1e-9) / binWidth);
      return Math.max(0, Math.min(BA_DISTRIBUTION_BIN_COUNT - 1, index));
    };

    values.forEach((seconds) => { counts[indexForSeconds(seconds)] += 1; });

    return {
      counts,
      fastest,
      slowest: values[values.length - 1],
      percentile95,
      binWidth,
      total: values.length,
      ownIndex: Number.isFinite(ownSeconds) ? indexForSeconds(ownSeconds) : null,
      ownSeconds,
      comparisonIndex: Number.isFinite(comparisonSeconds) ? indexForSeconds(comparisonSeconds) : null,
      comparisonSeconds
    };
  }
  function renderDisciplinePieCard(a) {
    const counts = countStartsPerDisciplineAll(a);
    const chartOrder = new Map([
      "50_retten",
      "100_kombi",
      "100_retten_flosse",
      "100_lifesaver",
      "200_super",
      "200_hindernis"
    ].map((key, index) => [key, index]));

    const ordered = DISCIPLINES.map(d => ({
      key: d.key,
      label: d.label,
      count: Number(counts[d.key] || 0)
    }))
      .filter(x => x.count > 0)
      .sort((a, b) => (chartOrder.get(a.key) ?? 999) - (chartOrder.get(b.key) ?? 999));

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

    const W = 420, H = 380, cx = W / 2, cy = H / 2;
    const R = 125, r = 72;
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

    const OUTSIDE_LABELS = {
      "50_retten": { text: "50 m Retten", lines: ["50 m", "Retten"] },
      "100_retten_flosse": { text: "100 m Retten Fl.", lines: ["100 m", "Retten Fl."] },
      "100_kombi": { text: "100 m Kombi", lines: ["100 m", "Kombi"] },
      "100_lifesaver": { text: "100 m Lifesaver", lines: ["100 m", "Lifesaver"] },
      "200_super": { text: "200 m SLS", lines: ["200 m SLS"] },
      "200_hindernis": { text: "200 m Hindernis", lines: ["200 m", "Hindernis"] }
    };

    const segmentNodes = [];
    const segmentAnchors = [];
    const calloutItems = [];
    let lockedIndex = null;

    const tooltip = document.createElement("div");
    tooltip.className = "pie-tooltip";
    tooltip.hidden = true;
    tooltip.setAttribute("role", "status");
    tooltip.setAttribute("aria-live", "polite");
    const tooltipTitle = document.createElement("strong");
    tooltipTitle.className = "pie-tooltip-title";
    const tooltipValue = document.createElement("span");
    tooltipValue.className = "pie-tooltip-value";
    tooltip.append(tooltipTitle, tooltipValue);

    function positionTooltip(index) {
      const anchor = segmentAnchors[index];
      if (!anchor) return;
      const svgRect = svg.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const x = (svgRect.left - wrapRect.left) + (anchor.x / W) * svgRect.width;
      const y = (svgRect.top - wrapRect.top) + (anchor.y / H) * svgRect.height;
      const halfWidth = tooltip.offsetWidth / 2;
      const safeX = Math.max(halfWidth + 8, Math.min(wrapRect.width - halfWidth - 8, x));
      const placeBelow = y < tooltip.offsetHeight + 20;

      tooltip.style.left = `${safeX}px`;
      tooltip.style.top = `${placeBelow ? y + 13 : y - 13}px`;
      tooltip.classList.toggle("is-below", placeBelow);
    }

    function showTooltip(index) {
      const item = ordered[index];
      if (!item) return;
      const countLabel = item.count === 1 ? "Start" : "Starts";
      tooltipTitle.textContent = OUTSIDE_LABELS[item.key]?.text
        || String(item.label || "").replace(/^(\d+)m\b/, "$1 m");
      tooltipValue.textContent = `${item.count} ${countLabel} · ${item.pct} % Anteil`;
      tooltip.hidden = false;
      segmentNodes.forEach((node, nodeIndex) => {
        node.toggleAttribute("data-active", nodeIndex === index);
      });
      positionTooltip(index);
    }

    function hideTooltip() {
      tooltip.hidden = true;
      segmentNodes.forEach((node) => node.removeAttribute("data-active"));
    }

    let angle = -Math.PI / 2;
    ordered.forEach((it, index) => {
      const sweep = (it.count / total) * Math.PI * 2;
      if (sweep <= 0) return;

      const start = angle;
      const end = angle + sweep;
      const mid = start + sweep / 2;
      const segment = document.createElementNS(svgNS, "g");
      const countLabel = it.count === 1 ? "Start" : "Starts";
      segment.setAttribute("class", "pie-segment");
      segment.setAttribute("tabindex", "0");
      segment.setAttribute("role", "img");
      segment.setAttribute("aria-label", `${it.label}: ${it.pct} Prozent, ${it.count} ${countLabel}`);
      segment.style.setProperty("--pie-hover-x", `${(Math.cos(mid) * 4).toFixed(2)}px`);
      segment.style.setProperty("--pie-hover-y", `${(Math.sin(mid) * 4).toFixed(2)}px`);

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", segPath(cx, cy, R, r, start, end));
      path.setAttribute("class", `pie-slice ${CLASS_MAP[it.key] || ""}`);
      segment.appendChild(path);

      calloutItems.push({
        item: it,
        segment,
        mid,
        side: Math.cos(mid) >= 0 ? "right" : "left",
        desiredY: cy + (R + 25) * Math.sin(mid)
      });

      segmentAnchors[index] = {
        x: cx + (R + 3) * Math.cos(mid),
        y: cy + (R + 3) * Math.sin(mid)
      };
      segment.addEventListener("pointerenter", () => {
        if (lockedIndex == null) showTooltip(index);
      });
      segment.addEventListener("pointerleave", () => {
        if (lockedIndex == null) hideTooltip();
      });
      segment.addEventListener("focus", () => showTooltip(index));
      segment.addEventListener("blur", () => {
        if (lockedIndex == null) hideTooltip();
      });
      segment.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (lockedIndex === index) {
          lockedIndex = null;
          hideTooltip();
        } else {
          lockedIndex = index;
          showTooltip(index);
        }
      });

      segmentNodes[index] = segment;
      svg.appendChild(segment);
      angle = end;
    });

    function spreadCallouts(items) {
      const minY = 28;
      const maxY = H - 28;
      const gap = 38;
      items.sort((a, b) => a.desiredY - b.desiredY);
      items.forEach((entry, index) => {
        entry.labelY = Math.max(entry.desiredY, index === 0 ? minY : items[index - 1].labelY + gap);
      });
      if (items.length && items[items.length - 1].labelY > maxY) {
        items[items.length - 1].labelY = maxY;
        for (let index = items.length - 2; index >= 0; index -= 1) {
          items[index].labelY = Math.min(items[index].labelY, items[index + 1].labelY - gap);
        }
      }
    }

    spreadCallouts(calloutItems.filter((entry) => entry.side === "left"));
    spreadCallouts(calloutItems.filter((entry) => entry.side === "right"));

    calloutItems.forEach((entry) => {
      const direction = entry.side === "right" ? 1 : -1;
      const label = OUTSIDE_LABELS[entry.item.key] || {
        text: entry.item.label,
        lines: [entry.item.label]
      };
      const startX = cx + (R + 2) * Math.cos(entry.mid);
      const startY = cy + (R + 2) * Math.sin(entry.mid);
      const bendX = cx + (R + 14) * Math.cos(entry.mid);
      const bendY = cy + (R + 14) * Math.sin(entry.mid);
      const lineEndX = entry.side === "right" ? W - 78 : 78;
      const textX = lineEndX + direction * 6;
      const line = document.createElementNS(svgNS, "polyline");
      line.setAttribute("points", `${startX},${startY} ${bendX},${bendY} ${lineEndX},${entry.labelY}`);
      line.setAttribute("class", "pie-callout-line");
      line.setAttribute("aria-hidden", "true");

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", textX);
      text.setAttribute("y", entry.labelY);
      text.setAttribute("text-anchor", entry.side === "right" ? "start" : "end");
      text.setAttribute("class", "pie-callout-label");
      text.setAttribute("aria-hidden", "true");
      const firstLineY = entry.labelY - ((label.lines.length - 1) * 7);
      label.lines.forEach((lineText, lineIndex) => {
        const tspan = document.createElementNS(svgNS, "tspan");
        tspan.setAttribute("x", textX);
        tspan.setAttribute("y", firstLineY + lineIndex * 14);
        tspan.textContent = lineText;
        text.appendChild(tspan);
      });
      entry.segment.append(line, text);
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

    wrap.addEventListener("pointerdown", (event) => {
      if (event.target.closest?.(".pie-segment")) return;
      lockedIndex = null;
      hideTooltip();
    });

    wrap.append(svg, tooltip);
    return card;
  }

  function renderDisciplineRadarCard(a, comparisonState) {
    const card = document.createElement("div");
    card.className = "ath-radar-card";

    const head = document.createElement("div");
    head.className = "radar-head";
    const heading = document.createElement("h4");
    heading.textContent = "Disziplinen-Punkte";
    head.appendChild(heading);

    const wrap = document.createElement("div");
    wrap.className = "radar-wrap";
    const loading = document.createElement("div");
    loading.className = "best-empty radar-status";
    loading.textContent = "Punkte werden berechnet …";
    wrap.appendChild(loading);
    const legend = document.createElement("div");
    legend.className = "radar-legend";
    legend.hidden = true;
    legend.setAttribute("aria-label", "Legende der Bestzeiten-Punkte");
    card.append(head, wrap, legend);

    const AXES = [
      { key: "50_retten", shortLabel: "50 m Retten", lines: ["50 m Retten"] },
      { key: "100_kombi", shortLabel: "100 m Kombi", lines: ["100 m Kombi"] },
      { key: "100_retten_flosse", shortLabel: "100 m Retten Fl.", lines: ["100 m", "Retten Fl."] },
      { key: "100_lifesaver", shortLabel: "100 m Lifesaver", lines: ["100 m", "Lifesaver"] },
      { key: "200_super", shortLabel: "200 m SLS", lines: ["200 m SLS"] },
      { key: "200_hindernis", shortLabel: "200 m Hindernis", lines: ["200 m", "Hindernis"] }
    ];
    const fmtPoints = (value) => new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
    const s = (tag, attrs = {}) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs).forEach(([key, value]) => {
        if (value != null) node.setAttribute(key, value);
      });
      return node;
    };

    function paint(result, comparisonResult = null, comparisonAthlete = null) {
      const byKey = new Map((result?.disciplines || []).map((item) => [item.key, item]));
      const comparisonByKey = new Map(
        (comparisonResult?.disciplines || []).map((item) => [item.key, item])
      );
      const values = AXES.map((axis) => ({
        ...axis,
        ...(byKey.get(axis.key) || {
          points: 0,
          averagePoints: 0,
          bestTimeSeconds: null,
          wrSeconds: null
        })
      }));
      const comparisonValues = AXES.map((axis) => ({
        ...axis,
        ...(comparisonByKey.get(axis.key) || { points: 0 })
      }));
      const hasComparisonPoints = comparisonValues.some((item) => Number(item.points) > 0);
      const hasAnyValue = values.some((item) => Number(item.points) > 0);

      legend.replaceChildren();
      legend.hidden = !hasComparisonPoints;
      if (hasComparisonPoints) {
        const legendItem = (tone, label) => {
          const item = document.createElement("span");
          item.className = "radar-legend-item";
          const swatch = document.createElement("span");
          swatch.className = `radar-legend-swatch is-${tone}`;
          swatch.setAttribute("aria-hidden", "true");
          const text = document.createElement("span");
          text.textContent = label;
          item.append(swatch, text);
          return item;
        };
        legend.append(
          legendItem("own", a?.name || "Profil-Athlet"),
          legendItem("comparison", comparisonAthlete?.name || "Vergleichsperson")
        );
      }

      wrap.replaceChildren();
      if (!hasAnyValue) {
        const empty = document.createElement("div");
        empty.className = "best-empty radar-status";
        empty.textContent = "Keine gültigen Bestzeiten für das Disziplinen-Netz vorhanden.";
        wrap.appendChild(empty);
        return;
      }

      const W = 420;
      const H = 430;
      const cx = 210;
      const cy = 214;
      const radius = 132;
      const labelRadius = 164;
      const ringLevels = [
        { points: 400, radiusRatio: 0.2 },
        { points: 600, radiusRatio: 0.4667 },
        { points: 800, radiusRatio: 0.7333 },
        { points: 1000, radiusRatio: 1 }
      ];
      const pointsToRadiusRatio = (rawPoints) => {
        const points = Math.max(0, Math.min(1000, Number(rawPoints) || 0));
        if (points <= 400) return (points / 400) * ringLevels[0].radiusRatio;
        return ringLevels[0].radiusRatio
          + ((points - 400) / 600) * (1 - ringLevels[0].radiusRatio);
      };
      const angleFor = (index) => (-Math.PI / 2) + index * (Math.PI * 2 / AXES.length);
      const pointAt = (index, distance) => {
        const angle = angleFor(index);
        return {
          x: cx + Math.cos(angle) * distance,
          y: cy + Math.sin(angle) * distance
        };
      };
      const pointsAttr = (distance) => AXES
        .map((_, index) => {
          const point = pointAt(index, distance);
          return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
        })
        .join(" ");

      const svg = s("svg", {
        class: "radar-svg",
        viewBox: `0 0 ${W} ${H}`,
        role: "img",
        "aria-label": "Disziplinen-Punkte aus den persönlichen Bestzeiten im Verhältnis zum aktuellen WR Open"
      });

      ringLevels.forEach((level) => {
        svg.appendChild(s("polygon", {
          points: pointsAttr(radius * level.radiusRatio),
          class: "radar-grid-ring",
          "aria-label": `${level.points} Punkte`
        }));
      });

      const axisNodes = [];
      AXES.forEach((_, index) => {
        const outer = pointAt(index, radius);
        const axisNode = s("line", {
          x1: cx,
          y1: cy,
          x2: outer.x,
          y2: outer.y,
          class: "radar-axis"
        });
        axisNodes[index] = axisNode;
        svg.appendChild(axisNode);
      });

      const polygonPoints = values.map((item, index) => {
        return pointAt(index, radius * pointsToRadiusRatio(item.points));
      });
      svg.appendChild(s("polygon", {
        points: polygonPoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
        class: "radar-value-area"
      }));

      const averagePolygonPoints = values.map((item, index) => {
        return pointAt(index, radius * pointsToRadiusRatio(item.averagePoints));
      });
      svg.appendChild(s("polygon", {
        points: averagePolygonPoints
          .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
          .join(" "),
        class: "radar-average-line",
        "aria-label": "Durchschnittliche Punktzahl je Disziplin"
      }));

      if (hasComparisonPoints) {
        const comparisonPolygonPoints = comparisonValues.map((item, index) => {
          return pointAt(index, radius * pointsToRadiusRatio(item.points));
        });
        svg.appendChild(s("polygon", {
          points: comparisonPolygonPoints
            .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
            .join(" "),
          class: "radar-comparison-line",
          "aria-label": `${comparisonAthlete?.name || "Vergleichsperson"}: Bestzeiten-Punkte`
        }));
      }

      AXES.forEach((axis, index) => {
        const labelPoint = pointAt(index, labelRadius);
        const angle = angleFor(index);
        const cos = Math.cos(angle);
        const label = s("text", {
          x: labelPoint.x,
          y: labelPoint.y - ((axis.lines.length - 1) * 7),
          class: "radar-axis-label",
          "text-anchor": cos > 0.25 ? "start" : (cos < -0.25 ? "end" : "middle"),
          "aria-hidden": "true"
        });
        axis.lines.forEach((line, lineIndex) => {
          const tspan = s("tspan", { x: labelPoint.x });
          if (lineIndex > 0) tspan.setAttribute("dy", 14);
          tspan.textContent = line;
          label.appendChild(tspan);
        });
        svg.appendChild(label);
      });

      const tooltip = document.createElement("div");
      tooltip.className = "radar-tooltip";
      tooltip.hidden = true;
      tooltip.setAttribute("role", "status");
      tooltip.setAttribute("aria-live", "polite");
      const tooltipTitle = document.createElement("strong");
      tooltipTitle.className = "radar-tooltip-title";
      const tooltipValue = document.createElement("span");
      tooltipValue.className = "radar-tooltip-value";
      tooltip.append(tooltipTitle, tooltipValue);

      const pointNodes = [];
      let lockedIndex = null;
      let activeIndex = null;

      function positionTooltip(index) {
        const point = polygonPoints[index];
        const svgRect = svg.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const x = (svgRect.left - wrapRect.left) + (point.x / W) * svgRect.width;
        const y = (svgRect.top - wrapRect.top) + (point.y / H) * svgRect.height;
        const halfWidth = tooltip.offsetWidth / 2;
        const safeX = Math.max(halfWidth + 8, Math.min(wrapRect.width - halfWidth - 8, x));
        const placeBelow = y < tooltip.offsetHeight + 20;

        tooltip.style.left = `${safeX}px`;
        tooltip.style.top = `${placeBelow ? y + 13 : y - 13}px`;
        tooltip.classList.toggle("is-below", placeBelow);
      }

      function showTooltip(index) {
        const item = values[index];
        activeIndex = index;
        tooltipTitle.textContent = item.shortLabel;
        tooltipValue.textContent = `Punkte: ${fmtPoints(item.points)} P`;
        tooltip.hidden = false;
        pointNodes.forEach((node, nodeIndex) => {
          node.toggleAttribute("data-active", nodeIndex === index);
        });
        axisNodes.forEach((node, nodeIndex) => {
          node.toggleAttribute("data-active", nodeIndex === index);
        });
        positionTooltip(index);
      }

      function hideTooltip() {
        activeIndex = null;
        tooltip.hidden = true;
        pointNodes.forEach((node) => node.removeAttribute("data-active"));
        axisNodes.forEach((node) => node.removeAttribute("data-active"));
      }

      values.forEach((item, index) => {
        if (!(Number(item.points) > 0)) return;
        const point = polygonPoints[index];
        const group = s("g", {
          class: "radar-point",
          tabindex: "0",
          role: "graphics-symbol",
          "aria-label": `${item.shortLabel}, Punkte ${fmtPoints(item.points)} P`
        });
        group.appendChild(s("rect", {
          x: point.x - 17,
          y: point.y - 17,
          width: 34,
          height: 34,
          class: "radar-point-hit"
        }));
        group.appendChild(s("circle", {
          cx: point.x,
          cy: point.y,
          r: 4.5,
          class: "radar-point-dot",
          "aria-hidden": "true"
        }));

        group.addEventListener("focus", () => showTooltip(index));
        group.addEventListener("blur", () => {
          if (lockedIndex == null) hideTooltip();
        });

        pointNodes[index] = group;
        svg.appendChild(group);
      });

      const hoverArea = s("polygon", {
        points: pointsAttr(radius),
        class: "radar-hover-area",
        "aria-hidden": "true"
      });
      const sectorIndexFromPointer = (event) => {
        const rect = svg.getBoundingClientRect();
        const pointerX = ((event.clientX - rect.left) / rect.width) * W;
        const pointerY = ((event.clientY - rect.top) / rect.height) * H;
        const clockwiseFromTop = (
          Math.atan2(pointerY - cy, pointerX - cx) + Math.PI / 2 + Math.PI * 2
        ) % (Math.PI * 2);
        return Math.floor((clockwiseFromTop + Math.PI / 6) / (Math.PI / 3)) % AXES.length;
      };
      hoverArea.addEventListener("pointermove", (event) => {
        if (lockedIndex != null) return;
        const index = sectorIndexFromPointer(event);
        if (activeIndex !== index) showTooltip(index);
      });
      hoverArea.addEventListener("pointerleave", () => {
        if (lockedIndex == null) hideTooltip();
      });
      hoverArea.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      hoverArea.addEventListener("click", (event) => {
        event.stopPropagation();
        const index = sectorIndexFromPointer(event);
        if (lockedIndex === index) {
          lockedIndex = null;
          hideTooltip();
        } else {
          lockedIndex = index;
          showTooltip(index);
        }
      });
      svg.appendChild(hoverArea);

      wrap.addEventListener("pointerdown", (event) => {
        lockedIndex = null;
        hideTooltip();
      });
      global.addEventListener("resize", () => {
        if (activeIndex != null) positionTooltip(activeIndex);
      }, { passive: true });

      wrap.append(svg, tooltip);
    }

    let updateRequestId = 0;
    let ownResultPromise = null;
    async function updateRadar(comparisonAthlete) {
      const requestId = ++updateRequestId;
      try {
        if (!global.ProfileLSC || typeof global.ProfileLSC.calculateBestDisciplinePoints !== "function") {
          throw new Error("LSC-Punkteberechnung ist nicht verfügbar.");
        }
        ownResultPromise ||= global.ProfileLSC.calculateBestDisciplinePoints(a);
        const ownResult = await ownResultPromise;
        let comparisonResult = null;
        if (comparisonAthlete) {
          try {
            comparisonResult = await global.ProfileLSC.calculateBestDisciplinePoints(comparisonAthlete);
          } catch (error) {
            console.error("Vergleichs-Punkte konnten nicht berechnet werden:", error);
          }
        }
        if (requestId !== updateRequestId) return;
        paint(ownResult, comparisonResult, comparisonAthlete);
      } catch (error) {
        if (requestId !== updateRequestId) return;
        console.error("Disziplinen-Netz konnte nicht berechnet werden:", error);
        wrap.replaceChildren();
        legend.hidden = true;
        legend.replaceChildren();
        const message = document.createElement("div");
        message.className = "best-empty radar-status";
        message.textContent = "Disziplinen-Punkte konnten nicht berechnet werden.";
        wrap.appendChild(message);
      }
    }

    comparisonState?.subscribe?.((nextAthlete) => {
      updateRadar(nextAthlete || null);
    });
    updateRadar(comparisonState?.get?.() || null);

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
    const isCoarsePointer = !!(global.matchMedia && global.matchMedia("(hover: none), (pointer: coarse)").matches);
    const allowDotKeyboardFocus = !isCoarsePointer;

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
    let interactiveDots = [];
    let positionActiveTip = null;

    function clearActiveDots() {
      svg.querySelectorAll('.lsc-dot[data-active="1"]').forEach((node) => node.removeAttribute("data-active"));
    }

    function hideActiveTip() {
      activeIdx = null;
      tip.style.opacity = "0";
      tip.style.transform = "translate(-9999px,-9999px)";
      tip.setAttribute("aria-hidden", "true");
      clearActiveDots();
    }

    function showTipForCircle(circle, idx, series) {
      if (!(circle instanceof Element)) return;
      clearActiveDots();
      activeIdx = idx;
      activeSeries = series;
      circle.setAttribute("data-active", "1");
      const name = circle.dataset.name ? ` – ${circle.dataset.name}` : "";
      tip.querySelector(".tt-l1").textContent = `${circle.dataset.lsc} LSC${name}`;
      tip.querySelector(".tt-l2").textContent = `${circle.dataset.date} — ${circle.dataset.meet || "—"}`;
      if (typeof positionActiveTip === "function") {
        positionActiveTip(circle);
      }
    }

    function paint() {
      if (!basePts.length) return;
      updateXDomain();
      interactiveDots = [];

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
          const cx = fx(p.age);
          const cy = fy(Y);
          const c = sLocal("circle", {
            cx,
            cy,
            r: 4.5,
            class: "lsc-dot",
            tabindex: allowDotKeyboardFocus ? 0 : null,
            focusable: allowDotKeyboardFocus ? "true" : "false",
            "data-idx": idx,
            "data-series": colorClass,
            "data-name": (colorClass === "blue" ? (a?.name || "") : (cmpAth?.name || "")),
            "data-lsc": p.lsc.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
            "data-meet": p.meet_name || "—"
          });
          interactiveDots.push({ circle: c, idx, series: colorClass, cx, cy });

          if (!isCoarsePointer) {
            const show = () => {
              showTipForCircle(c, idx, colorClass);
              return;
            const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
            tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet || "—"}`;
            positionTipNearCircle(c);
          };
            const hide = () => {
              if (activeIdx === idx && activeSeries === colorClass) {
                hideActiveTip();
              }
            };

          c.addEventListener("pointerenter", show);
          c.addEventListener("pointerleave", hide);
          if (allowDotKeyboardFocus) {
            c.addEventListener("focus", show);
            c.addEventListener("blur", hide);
          }
          c.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            show();
          });
          }

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

      positionActiveTip = positionTipNearCircle;

      if (activeIdx != null) {
        const sel = `.lsc-dots.${activeSeries} .lsc-dot[data-idx="${activeIdx}"]`;
        const active = svg.querySelector(sel);
        if (active) positionTipNearCircle(active);
        else hideActiveTip();
      }

      if (!card._lscOutsideHandlerAttached) {
        card.addEventListener("pointerdown", (e) => {
          if (!svg.contains(e.target)) {
            hideActiveTip();
          }
        }, { passive: true });
        card._lscOutsideHandlerAttached = true;
      }

      if (isCoarsePointer && !card._lscTapHandlerAttached) {
        svg.addEventListener("click", (e) => {
          e.stopPropagation();
          const ctm = svg.getScreenCTM();
          if (!ctm || !interactiveDots.length) return;

          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const local = pt.matrixTransform(ctm.inverse());

          let best = null;
          let bestDistSq = Infinity;
          interactiveDots.forEach((entry) => {
            const dx = entry.cx - local.x;
            const dy = entry.cy - local.y;
            const distSq = (dx * dx) + (dy * dy);
            if (distSq < bestDistSq) {
              best = entry;
              bestDistSq = distSq;
            }
          });

          const maxTapDistance = 18;
          if (!best || bestDistSq > (maxTapDistance * maxTapDistance)) {
            hideActiveTip();
            return;
          }

          if (activeIdx === best.idx && activeSeries === best.series) {
            hideActiveTip();
            return;
          }

          showTipForCircle(best.circle, best.idx, best.series);
        });
        card._lscTapHandlerAttached = true;
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

  function renderTimeChart(a, comparisonState) {
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
      comparisonState?.set?.(cmpAth);
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
      comparisonState?.set?.(null);
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


  function renderBestTimeDistributionChart(a, comparisonState) {
    if (String(a?.LV_state || "").trim().toUpperCase() !== BA_DISTRIBUTION_LV) return null;

    const sLocal = (tag, attrs = {}, ...children) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs || {}).forEach(([key, value]) => {
        if (value != null) node.setAttribute(key, String(value));
      });
      children.flat().forEach((child) => {
        if (child != null) node.appendChild(
          typeof child === "string" ? document.createTextNode(child) : child
        );
      });
      return node;
    };

    const el = (tag, attrs = {}, ...children) => {
      const node = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([key, value]) => {
        if (key === "class") node.className = value;
        else if (key.startsWith("on") && typeof value === "function") {
          node.addEventListener(key.slice(2), value);
        } else if (value !== false && value != null) {
          node.setAttribute(key, value === true ? "" : value);
        }
      });
      children.flat().forEach((child) => {
        if (child != null) node.appendChild(
          typeof child === "string" ? document.createTextNode(child) : child
        );
      });
      return node;
    };

    const gender = normalizeDistributionGender(a?.geschlecht);
    const lanes = new Set(["50"]);
    let comparisonAthlete = comparisonState?.get?.() || null;
    const overlapPatternId = `distribution-overlap-${++distributionPatternCounter}`;
    const firstWithOwnTime = DISCIPLINES.find((discipline) =>
      Number.isFinite(getOwnDistributionBest(a, lanes, discipline))
    );
    let disciplineKey = (firstWithOwnTime || DISCIPLINES[0]).key;
    let histogram = null;
    let activeIndex = null;
    let barNodes = [];
    let plotLayout = null;

    const card = el("div", { class: "ath-time-card ath-distribution-card" });
    const btn50 = el("button", {
      class: "seg-btn active",
      type: "button",
      "aria-pressed": "true",
      onclick: () => toggleLane("50", btn50)
    }, "50m");
    const btn25 = el("button", {
      class: "seg-btn",
      type: "button",
      "aria-pressed": "false",
      onclick: () => toggleLane("25", btn25)
    }, "25m");
    const laneSeg = el("div", {
      class: "seg time-lanes",
      role: "group",
      "aria-label": "Bahnlänge der badischen Zeitverteilung"
    }, btn50, btn25);

    const select = el("select", {
      class: "time-disc",
      "aria-label": "Disziplin der badischen Zeitverteilung"
    });
    DISCIPLINES.forEach((discipline) => {
      select.appendChild(el("option", {
        value: discipline.key,
        selected: discipline.key === disciplineKey
      }, discipline.label));
    });

    const head = el("div", { class: "time-head" },
      el("h4", {}, "Badische Zeitverteilung"),
      select,
      laneSeg
    );
    const meta = el("div", { class: "distribution-meta", "aria-live": "polite" });
    const viewport = el("div", { class: "time-viewport distribution-viewport" });
    const svg = sLocal("svg", {
      class: "time-svg distribution-svg",
      role: "img",
      "aria-label": "Verteilung der badischen Bestzeiten"
    });
    const description = sLocal("desc", {},
      "Balkendiagramm mit 100 Zeitbereichen. Die Höhe zeigt die Anzahl der Personen. " +
      "Die eigene Bestzeit ist rot und die Bestzeit der Vergleichsperson blau markiert. " +
      "Treffen beide denselben Zeitbereich, wird der Balken rot-blau gestreift."
    );
    svg.appendChild(description);
    viewport.appendChild(svg);

    const tooltip = el("div", {
      class: "time-tooltip distribution-tooltip",
      "aria-hidden": "true"
    },
      el("div", { class: "tt-l1" }),
      el("div", { class: "tt-l2" }),
      el("div", { class: "tt-l3" }),
      el("div", { class: "tt-l4" }),
      el("div", { class: "tt-l5" })
    );

    const legendBase = el("span", { class: "time-key" },
      el("span", { class: "time-key-dot distribution-key-dot" }),
      el("span", {}, "BA-Bestzeiten")
    );
    const legendOwn = el("span", { class: "time-key" },
      el("span", { class: "time-key-dot distribution-key-dot is-own" }),
      el("span", {}, "Eigene Bestzeit")
    );
    const legendComparisonLabel = el("span", {}, "Vergleichsperson");
    const legendComparison = el("span", { class: "time-key", hidden: true },
      el("span", { class: "time-key-dot distribution-key-dot is-compare" }),
      legendComparisonLabel
    );
    const legend = el("div", { class: "time-legend distribution-legend" },
      legendBase,
      legendOwn,
      legendComparison
    );

    card.append(head, meta, viewport, tooltip, legend);

    function setButtonState(button, on) {
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }

    function toggleLane(code, button) {
      const isActive = lanes.has(code);
      if (isActive && lanes.size === 1) return;
      if (isActive) lanes.delete(code);
      else lanes.add(code);
      setButtonState(button, lanes.has(code));
      recompute();
      paint();
    }

    function recompute() {
      const discipline = DISCIPLINES.find((item) => item.key === disciplineKey) || DISCIPLINES[0];
      const values = getBaBestTimeDistributionValues(gender, lanes, discipline.key);
      const ownSeconds = getOwnDistributionBest(a, lanes, discipline);
      const comparisonSeconds = getOwnDistributionBest(comparisonAthlete, lanes, discipline);
      histogram = buildDistributionHistogram(values, ownSeconds, comparisonSeconds);
      activeIndex = null;

      if (!histogram) {
        meta.textContent = `Keine BA-Vergleichsdaten für ${discipline.label}.`;
        legendOwn.hidden = true;
        legendComparison.hidden = true;
        delete card.dataset.total;
        return;
      }

      meta.textContent = `${histogram.total.toLocaleString("de-DE")} Bestzeiten`;
      legendOwn.hidden = !Number.isFinite(ownSeconds);
      legendComparison.hidden = !Number.isFinite(comparisonSeconds);
      legendComparisonLabel.textContent = comparisonAthlete?.name || "Vergleichsperson";
      card.dataset.total = String(histogram.total);
      card.dataset.fastest = histogram.fastest.toFixed(2);
      card.dataset.percentile95 = histogram.percentile95.toFixed(2);
      card.dataset.binWidth = histogram.binWidth.toFixed(2);
      card.dataset.ownTime = Number.isFinite(ownSeconds) ? ownSeconds.toFixed(2) : "";
      card.dataset.ownBin = histogram.ownIndex == null ? "" : String(histogram.ownIndex);
      card.dataset.comparisonTime = Number.isFinite(comparisonSeconds) ? comparisonSeconds.toFixed(2) : "";
      card.dataset.comparisonBin = histogram.comparisonIndex == null ? "" : String(histogram.comparisonIndex);
      card.dataset.comparisonAthlete = comparisonAthlete?.id || "";
      card.dataset.lanes = distributionLaneKey(lanes);
      card.dataset.discipline = discipline.key;
    }

    function rangeLabel(index) {
      if (!histogram) return "";
      const lower = histogram.fastest + (index * histogram.binWidth);
      if (index === BA_DISTRIBUTION_BIN_COUNT - 1) {
        return `${formatSeconds(lower)} bis ${formatSeconds(Math.max(lower, histogram.slowest))}`;
      }
      const upper = lower + histogram.binWidth;
      return `${formatSeconds(lower)} bis ${formatSeconds(upper)}`;
    }

    function topPercentage(index) {
      if (!histogram?.total) return 0;
      const cumulative = histogram.counts
        .slice(0, index + 1)
        .reduce((sum, count) => sum + count, 0);
      return Math.min(100, Math.max(0.1, (cumulative / histogram.total) * 100));
    }

    function niceYAxis(maxValue) {
      const rawStep = Math.max(1, maxValue / 5);
      const magnitude = 10 ** Math.floor(Math.log10(rawStep));
      const normalized = rawStep / magnitude;
      const factor = normalized <= 1 ? 1 : (normalized <= 2 ? 2 : (normalized <= 5 ? 5 : 10));
      const step = Math.max(1, factor * magnitude);
      return { step, max: Math.max(step, Math.ceil(maxValue / step) * step) };
    }

    function hideTooltip() {
      activeIndex = null;
      barNodes.forEach((bar) => bar.removeAttribute("data-active"));
      tooltip.style.opacity = "0";
      tooltip.style.transform = "translate(-9999px,-9999px)";
      tooltip.setAttribute("aria-hidden", "true");
    }

    function showTooltip(index) {
      if (!histogram || !barNodes[index]) return;
      activeIndex = index;
      barNodes.forEach((bar, barIndex) => {
        if (barIndex === index) bar.setAttribute("data-active", "1");
        else bar.removeAttribute("data-active");
      });

      const count = histogram.counts[index];
      const topPercent = topPercentage(index);
      tooltip.querySelector(".tt-l1").textContent = rangeLabel(index);
      tooltip.querySelector(".tt-l2").textContent =
        `${count.toLocaleString("de-DE")} ${count === 1 ? "Person" : "Personen"}`;
      tooltip.querySelector(".tt-l3").textContent =
        `Top ${topPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} % in Baden`;
      tooltip.querySelector(".tt-l4").textContent = index === histogram.ownIndex &&
        Number.isFinite(histogram.ownSeconds)
        ? `Eigene Bestzeit: ${formatSeconds(histogram.ownSeconds)}`
        : "";
      tooltip.querySelector(".tt-l4").hidden = !tooltip.querySelector(".tt-l4").textContent;
      tooltip.querySelector(".tt-l5").textContent = index === histogram.comparisonIndex &&
        Number.isFinite(histogram.comparisonSeconds)
        ? `${comparisonAthlete?.name || "Vergleich"}: ${formatSeconds(histogram.comparisonSeconds)}`
        : "";
      tooltip.querySelector(".tt-l5").hidden = !tooltip.querySelector(".tt-l5").textContent;
      tooltip.style.opacity = "1";
      tooltip.style.transform = "translate(0,0)";
      tooltip.setAttribute("aria-hidden", "false");

      const barRect = barNodes[index].getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      tooltip.style.left = "0px";
      tooltip.style.top = "0px";
      const tooltipRect = tooltip.getBoundingClientRect();
      let left = (barRect.left - cardRect.left) + (barRect.width / 2) - (tooltipRect.width / 2);
      let top = (barRect.top - cardRect.top) - tooltipRect.height - 9;
      left = Math.max(8, Math.min(left, card.clientWidth - tooltipRect.width - 8));
      if (top < 8) top = (barRect.bottom - cardRect.top) + 9;
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
    }

    function paint() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(description);
      hideTooltip();
      barNodes = [];

      const rect = viewport.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = window.innerWidth <= 480 ? 340 : (window.innerWidth <= 720 ? 370 : 420);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);

      if (!histogram) {
        svg.appendChild(sLocal("text", {
          x: width / 2,
          y: height / 2,
          class: "distribution-empty-label",
          "text-anchor": "middle"
        }, "Keine Vergleichsdaten vorhanden."));
        return;
      }

      const margin = { left: 42, right: 8, top: 22, bottom: 18 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;
      const maxCount = Math.max(1, ...histogram.counts);
      const yAxis = niceYAxis(maxCount);
      const y = (value) => margin.top + chartHeight - ((value / yAxis.max) * chartHeight);
      const stepWidth = chartWidth / BA_DISTRIBUTION_BIN_COUNT;
      const gap = Math.min(1.8, stepWidth * 0.24);
      const barWidth = Math.max(0.8, stepWidth - gap);
      plotLayout = { left: margin.left, width: chartWidth, stepWidth };

      const defs = sLocal("defs");
      const overlapPattern = sLocal("pattern", {
        id: overlapPatternId,
        width: 8,
        height: 8,
        patternUnits: "userSpaceOnUse",
        patternTransform: "rotate(45)"
      },
        sLocal("rect", { width: 4, height: 8, fill: "rgb(227, 6, 19)" }),
        sLocal("rect", { x: 4, width: 4, height: 8, fill: "rgb(5, 105, 180)" })
      );
      defs.appendChild(overlapPattern);
      svg.appendChild(defs);

      const grid = sLocal("g", { class: "distribution-grid" });
      for (let value = 0; value <= yAxis.max + 1e-9; value += yAxis.step) {
        const lineY = y(value);
        grid.appendChild(sLocal("line", {
          x1: margin.left,
          y1: lineY,
          x2: width - margin.right,
          y2: lineY,
          class: value === 0 ? "hline0" : "hline"
        }));
        grid.appendChild(sLocal("text", {
          x: margin.left - 7,
          y: lineY,
          "text-anchor": "end",
          "dominant-baseline": "middle"
        }, String(value)));
      }
      grid.appendChild(sLocal("text", {
        x: margin.left,
        y: margin.top - 7,
        class: "distribution-axis-title",
        "text-anchor": "start"
      }, "Personen"));
      svg.appendChild(grid);

      const bars = sLocal("g", { class: "distribution-bars" });
      histogram.counts.forEach((count, index) => {
        const barHeight = (count / yAxis.max) * chartHeight;
        const x = margin.left + (index * stepWidth) + (gap / 2);
        const isOwn = index === histogram.ownIndex;
        const isComparison = index === histogram.comparisonIndex;
        const isOverlap = isOwn && isComparison;
        const visualBarHeight = Math.max(isOwn || isComparison ? 2 : 0, barHeight);
        const barY = margin.top + chartHeight - visualBarHeight;
        const label = `${rangeLabel(index)}: ${count} ${count === 1 ? "Person" : "Personen"}. ` +
          `Top ${topPercentage(index).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % in Baden` +
          (isOwn && Number.isFinite(histogram.ownSeconds)
            ? `. Eigene Bestzeit ${formatSeconds(histogram.ownSeconds)}`
            : "") +
          (isComparison && Number.isFinite(histogram.comparisonSeconds)
            ? `. ${comparisonAthlete?.name || "Vergleich"} ${formatSeconds(histogram.comparisonSeconds)}`
            : "");
        const bar = sLocal("rect", {
          x,
          y: barY,
          width: barWidth,
          height: visualBarHeight,
          rx: Math.min(1.5, barWidth / 2),
          class: `distribution-bar${isOwn ? " is-own" : ""}${isComparison ? " is-compare" : ""}${isOverlap ? " is-overlap" : ""}`,
          style: isOverlap ? `fill:url(#${overlapPatternId})` : null,
          "data-index": index,
          role: "graphics-symbol",
          "aria-label": label
        });
        bars.appendChild(bar);
        barNodes.push(bar);
      });
      svg.appendChild(bars);
    }

    select.addEventListener("change", () => {
      disciplineKey = select.value;
      recompute();
      paint();
    });

    svg.addEventListener("pointermove", (event) => {
      if (!histogram || !plotLayout || !svg.getScreenCTM()) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(svg.getScreenCTM().inverse());
      if (local.x < plotLayout.left || local.x > plotLayout.left + plotLayout.width) {
        hideTooltip();
        return;
      }
      const index = Math.max(0, Math.min(
        BA_DISTRIBUTION_BIN_COUNT - 1,
        Math.floor((local.x - plotLayout.left) / plotLayout.stepWidth)
      ));
      if (activeIndex !== index) showTooltip(index);
    });
    svg.addEventListener("pointerleave", hideTooltip);
    svg.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideTooltip();
    });

    const resizeObserver = new ResizeObserver(paint);
    resizeObserver.observe(viewport);
    comparisonState?.subscribe?.((nextAthlete) => {
      comparisonAthlete = nextAthlete || null;
      recompute();
      paint();
    });
    recompute();
    requestAnimationFrame(paint);
    return card;
  }


  ProfileTabsCharts.renderDisciplinePieCard = renderDisciplinePieCard;
  ProfileTabsCharts.renderDisciplineRadarCard = renderDisciplineRadarCard;
  ProfileTabsCharts.renderLSCChart = renderLSCChart;
  ProfileTabsCharts.renderTimeChart = renderTimeChart;
  ProfileTabsCharts.renderBestTimeDistributionChart = renderBestTimeDistributionChart;
  ProfileTabsCharts.deriveFromMeets = deriveFromMeets;
  global.ProfileTabsCharts = ProfileTabsCharts;
})(window);
