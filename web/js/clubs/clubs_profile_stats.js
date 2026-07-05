(function () {
  let shared = {};

  const CLUB_STATS_STATE = {
    includeOms: true,
    athleteMode: "count",
    athleteChartScale: "count"
  };
  const CLUB_STATS_AGE_CLASSES = [
    { key: "u10", label: "10 und jünger", shortLabel: "≤10", className: "u10" },
    { key: "ak11_12", label: "11/12", shortLabel: "11/12", className: "ak11-12" },
    { key: "ak13_14", label: "13/14", shortLabel: "13/14", className: "ak13-14" },
    { key: "ak15_16", label: "15/16", shortLabel: "15/16", className: "ak15-16" },
    { key: "ak17_18", label: "17/18", shortLabel: "17/18", className: "ak17-18" },
    { key: "ak19_plus", label: "19 und älter", shortLabel: "19+", className: "ak19-plus" },
    { key: "unknown", label: "unbekannt", shortLabel: "?", className: "unknown" }
  ];

  const COLS = new Proxy({}, {
    get(_target, key) {
      return getShared("COLS")?.[key];
    }
  });

  function getShared(name) {
    const value = shared?.[name];
    if (value == null) {
      throw new Error(`ClubsProfileStats missing helper: ${name}`);
    }
    return value;
  }

  function h(...args) {
    return getShared("h")(...args);
  }

  function normalize(...args) {
    return getShared("normalize")(...args);
  }

  function normalizeForCompare(...args) {
    return getShared("normalizeForCompare")(...args);
  }

  function groupMatchesRow(...args) {
    return getShared("groupMatchesRow")(...args);
  }

  function excelSerialToISO(...args) {
    return getShared("excelSerialToISO")(...args);
  }

  function getYearFromISO(...args) {
    return getShared("getYearFromISO")(...args);
  }

  function normalizeMeetName(...args) {
    return getShared("normalizeMeetName")(...args);
  }

  function normalizeGender(...args) {
    return getShared("normalizeGender")(...args);
  }

  function parseTwoDigitYearWithMeetYear(...args) {
    return getShared("parseTwoDigitYearWithMeetYear")(...args);
  }

  function makeAthleteId(...args) {
    return getShared("makeAthleteId")(...args);
  }

  async function getBestenlisteRows() {
    return getShared("getBestenlisteRows")();
  }

  function formatClubStatsNumber(value, options) {
    return Number(value || 0).toLocaleString("de-DE", options);
  }

  function formatClubStatsAge(value) {
    const number = Number(value) || 0;
    return formatClubStatsNumber(number, {
      minimumFractionDigits: Number.isInteger(number) ? 0 : 1,
      maximumFractionDigits: 1
    });
  }

  function isOmsMeetName(value) {
    return /^OMS\s*-/i.test(normalize(value));
  }

  function hasClubStatsStartValue(value) {
    if (value == null) return false;
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    const text = normalize(value);
    return !!text && !/^[-—]$/.test(text) && !/^0(?:[,.]0+)?$/.test(text);
  }

  function getClubStatsStartDisciplines() {
    return [
      { col: COLS.z50r, placeCol: COLS.p50r },
      { col: COLS.z100r, placeCol: COLS.p100r },
      { col: COLS.z100k, placeCol: COLS.p100k },
      { col: COLS.z100l, placeCol: COLS.p100l },
      { col: COLS.z200s, placeCol: COLS.p200s },
      { col: COLS.z200h, placeCol: COLS.p200h }
    ];
  }

  function countClubStatsStarts(row) {
    return getClubStatsStartDisciplines().reduce((count, discipline) => {
      const hasTime = hasClubStatsStartValue(row?.[discipline.col]);
      const hasPlace = hasClubStatsStartValue(row?.[discipline.placeCol]);
      return hasTime || hasPlace ? count + 1 : count;
    }, 0);
  }

  function getClubStatsAverageAge(ages) {
    const values = (Array.isArray(ages) ? ages : [])
      .map((age) => Number(age))
      .filter(Number.isFinite);

    return values.length
      ? values.reduce((sum, age) => sum + age, 0) / values.length
      : 0;
  }

  function createClubStatsAgeClassCounts() {
    return Object.fromEntries(CLUB_STATS_AGE_CLASSES.map((ageClass) => [ageClass.key, 0]));
  }

  function getClubStatsAgeClassKey(age) {
    if (age == null || String(age).trim() === "") return "unknown";
    const value = Number(age);
    if (!Number.isFinite(value)) return "unknown";
    if (value <= 10) return "u10";
    if (value <= 12) return "ak11_12";
    if (value <= 14) return "ak13_14";
    if (value <= 16) return "ak15_16";
    if (value <= 18) return "ak17_18";
    return "ak19_plus";
  }

  function isClubStatsUnknownBirthYear(value) {
    const text = normalize(value);
    return !text || text === "\"\"";
  }

  function getClubStatsAgeClassCounts(athletes, athleteAges, unknownAgeAthletes) {
    const counts = createClubStatsAgeClassCounts();
    const athleteIds = athletes instanceof Set ? athletes : new Set();
    const ageMap = athleteAges instanceof Map ? athleteAges : new Map();
    const unknownIds = unknownAgeAthletes instanceof Set ? unknownAgeAthletes : new Set();

    athleteIds.forEach((athleteId) => {
      const key = unknownIds.has(athleteId) ? "unknown" : getClubStatsAgeClassKey(ageMap.get(athleteId));
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }

  function getClubStatsAgeClassTotal(counts) {
    return CLUB_STATS_AGE_CLASSES.reduce((sum, ageClass) => sum + (Number(counts?.[ageClass.key]) || 0), 0);
  }

  function getClubStatsDominantAgeClass(counts) {
    let dominant = CLUB_STATS_AGE_CLASSES[0];
    let maxValue = -1;

    CLUB_STATS_AGE_CLASSES.forEach((ageClass) => {
      const value = Number(counts?.[ageClass.key]) || 0;
      if (value > maxValue) {
        dominant = ageClass;
        maxValue = value;
      }
    });

    return { ageClass: dominant, value: Math.max(0, maxValue) };
  }

  function formatClubStatsAgeClassLatestLabel(point) {
    const total = getClubStatsAgeClassTotal(point?.ageClassCounts);
    if (!point || !total) return "";

    const dominant = getClubStatsDominantAgeClass(point.ageClassCounts);
    return `${point.year}: ${formatClubStatsNumber(total)} Sportler, stärkste AK ${dominant.ageClass.label} (${formatClubStatsNumber(dominant.value)})`;
  }

  function mergeClubStatsAgeClassCounts(target, source) {
    CLUB_STATS_AGE_CLASSES.forEach((ageClass) => {
      target[ageClass.key] = (Number(target[ageClass.key]) || 0) + (Number(source?.[ageClass.key]) || 0);
    });
    return target;
  }

  function buildClubStatsData(rows, group, settings = {}) {
    const byYear = new Map();
    const allAthletes = new Set();
    const includeOms = settings.includeOms !== false;

    const ensureYear = (year) => {
      if (!byYear.has(year)) {
        byYear.set(year, {
          year,
          meetKeys: new Set(),
          athletes: new Set(),
          femaleAthletes: new Set(),
          maleAthletes: new Set(),
          athleteAges: new Map(),
          unknownAgeAthletes: new Set(),
          starts: 0
        });
      }
      return byYear.get(year);
    };

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !groupMatchesRow(group, row)) continue;

      const rawName = normalize(row[COLS.meetName]);
      if (!includeOms && isOmsMeetName(rawName)) continue;

      const dateIso = excelSerialToISO(row[COLS.excelDate]);
      const year = getYearFromISO(dateIso);
      if (!Number.isFinite(year) || year < 1900) continue;

      const yearEntry = ensureYear(year);
      const name = normalizeMeetName(rawName);

      if (name) {
        const meetKey = normalizeForCompare(name);

        yearEntry.meetKeys.add(meetKey);
      }

      yearEntry.starts += countClubStatsStarts(row);

      const athleteName = normalize(row[COLS.name]);
      if (athleteName) {
        const gender = normalizeGender(row[COLS.gender]);
        const hasUnknownBirthYear = isClubStatsUnknownBirthYear(row[COLS.yy2]);
        const birthYear = hasUnknownBirthYear ? "" : parseTwoDigitYearWithMeetYear(row[COLS.yy2], dateIso);
        const athleteId = makeAthleteId(athleteName, gender, birthYear);

        yearEntry.athletes.add(athleteId);
        if (gender === "w") {
          yearEntry.femaleAthletes.add(athleteId);
        } else {
          yearEntry.maleAthletes.add(athleteId);
        }
        if (hasUnknownBirthYear) {
          yearEntry.unknownAgeAthletes.add(athleteId);
        } else if (Number.isFinite(birthYear)) {
          const athleteAge = year - birthYear;
          if (athleteAge >= 0 && athleteAge <= 120 && !yearEntry.athleteAges.has(athleteId)) {
            yearEntry.athleteAges.set(athleteId, athleteAge);
          }
        }
        allAthletes.add(athleteId);
      }
    }

    const recordedYears = Array.from(byYear.keys()).sort((left, right) => left - right);
    const firstYear = recordedYears[0];
    const lastYear = recordedYears[recordedYears.length - 1];
    const years = recordedYears.length
      ? Array.from({ length: lastYear - firstYear + 1 }, (_value, index) => firstYear + index)
      : [];
    const series = years.map((year) => {
      const entry = byYear.get(year);
      const ages = entry?.athleteAges ? Array.from(entry.athleteAges.values()) : [];
      const ageClassCounts = getClubStatsAgeClassCounts(entry?.athletes, entry?.athleteAges, entry?.unknownAgeAthletes);
      return {
        year,
        competitions: entry?.meetKeys?.size || 0,
        athletes: entry?.athletes?.size || 0,
        femaleAthletes: entry?.femaleAthletes?.size || 0,
        maleAthletes: entry?.maleAthletes?.size || 0,
        starts: entry?.starts || 0,
        averageAge: getClubStatsAverageAge(ages),
        ageClassCounts
      };
    });

    const femaleAthletes = new Set();
    const maleAthletes = new Set();
    const totalAgeClassCounts = createClubStatsAgeClassCounts();
    let totalAgeSum = 0;
    let totalAgeCount = 0;
    series.forEach((point) => {
      const entry = byYear.get(point.year);
      entry?.femaleAthletes?.forEach((id) => femaleAthletes.add(id));
      entry?.maleAthletes?.forEach((id) => maleAthletes.add(id));
      mergeClubStatsAgeClassCounts(totalAgeClassCounts, point.ageClassCounts);
      entry?.athleteAges?.forEach((age) => {
        totalAgeSum += age;
        totalAgeCount += 1;
      });
    });

    return {
      years,
      series,
      totals: {
        competitions: series.reduce((sum, point) => sum + point.competitions, 0),
        athletes: allAthletes.size,
        femaleAthletes: femaleAthletes.size,
        maleAthletes: maleAthletes.size,
        starts: series.reduce((sum, point) => sum + point.starts, 0),
        averageAge: totalAgeCount ? totalAgeSum / totalAgeCount : 0,
        ageClassCounts: totalAgeClassCounts
      }
    };
  }

  function s(tag, props = {}, ...children) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);

    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") el.setAttribute("class", value);
      else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
    }

    for (const child of children.flat()) {
      if (child == null) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }

    return el;
  }

  function getClubStatsUnitLabel(value, labels = {}) {
    const number = Number(value) || 0;
    if (number === 1 && labels.singular) return labels.singular;
    return labels.plural || labels.singular || "";
  }

  function formatClubStatsPointLabel(point, key, labels, valueFormatter = formatClubStatsNumber) {
    const value = point[key];
    return `${point.year}: ${valueFormatter(value)} ${getClubStatsUnitLabel(value, labels)}`;
  }

  function renderClubStatsChart(series, valueKey, options = {}) {
    const points = Array.isArray(series) ? series : [];
    const chartLabel = options.chartLabel || "Jahresverlauf";
    const unitLabels = options.unitLabels || {};
    const chartType = options.type || "bar";
    const valueFormatter = options.valueFormatter || formatClubStatsNumber;
    const W = 520;
    const H = 178;
    const m = { t: 18, r: 14, b: 30, l: 34 };
    const cw = W - m.l - m.r;
    const ch = H - m.t - m.b;
    const maxValue = Math.max(1, ...points.map((point) => Number(point[valueKey]) || 0));
    const tickValues = Array.from(new Set([0, Math.ceil(maxValue / 2), maxValue]));
    const xForIndex = (index) => points.length <= 1 ? m.l + cw / 2 : m.l + (index / (points.length - 1)) * cw;
    const yForValue = (value) => m.t + ch - ((Number(value) || 0) / maxValue) * ch;
    const svg = s("svg", {
      class: `club-stats-chart club-stats-chart--${chartType}`,
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": chartLabel,
      focusable: "false"
    });

    const grid = s("g", { class: "club-stats-chart-grid" });
    tickValues.forEach((tick) => {
      const y = yForValue(tick);
      grid.appendChild(s("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "club-stats-grid-line" }));
      grid.appendChild(s("text", { x: m.l - 8, y: y + 4, class: "club-stats-y-label", "text-anchor": "end" }, valueFormatter(tick)));
    });
    svg.appendChild(grid);

    svg.appendChild(s("line", { x1: m.l, y1: m.t + ch, x2: W - m.r, y2: m.t + ch, class: "club-stats-axis" }));

    if (points.length) {
      const step = points.length > 7 ? Math.ceil(points.length / 6) : 1;
      const xAxis = s("g", { class: "club-stats-x-axis" });
      points.forEach((point, index) => {
        const showTick = index === 0 || index === points.length - 1 || index % step === 0;
        if (!showTick) return;
        const x = xForIndex(index);
        xAxis.appendChild(s("text", { x, y: H - 8, class: "club-stats-x-label", "text-anchor": "middle" }, String(point.year)));
      });
      svg.appendChild(xAxis);
    }

    if (chartType === "line") {
      const path = points.map((point, index) => {
        const prefix = index === 0 ? "M" : "L";
        return `${prefix}${xForIndex(index).toFixed(2)} ${yForValue(point[valueKey]).toFixed(2)}`;
      }).join(" ");

      if (path) {
        svg.appendChild(s("path", { d: path, class: "club-stats-line" }));
      }

      const dots = s("g", { class: "club-stats-dots" });
      points.forEach((point, index) => {
        dots.appendChild(
          s(
            "circle",
            { cx: xForIndex(index), cy: yForValue(point[valueKey]), r: 3.2, class: "club-stats-dot" },
            s("title", {}, formatClubStatsPointLabel(point, valueKey, unitLabels, valueFormatter))
          )
        );
      });
      svg.appendChild(dots);
    } else {
      const bars = s("g", { class: "club-stats-bars" });
      const barWidth = Math.max(3, Math.min(18, cw / Math.max(1, points.length * 1.85)));

      points.forEach((point, index) => {
        const value = Number(point[valueKey]) || 0;
        const x = xForIndex(index) - barWidth / 2;
        const y = yForValue(value);
        const height = Math.max(1, m.t + ch - y);

        bars.appendChild(
          s(
            "rect",
            { x, y, width: barWidth, height, rx: 2, class: "club-stats-bar" },
            s("title", {}, formatClubStatsPointLabel(point, valueKey, unitLabels, valueFormatter))
          )
        );
      });
      svg.appendChild(bars);
    }

    return svg;
  }

  function formatClubStatsPercent(value, total) {
    if (!total) return "0,0%";
    return `${((Number(value) / Number(total)) * 100).toFixed(1).replace(".", ",")}%`;
  }

  function formatClubStatsPercentNumber(value, total, maximumFractionDigits = 1) {
    if (!total) return "0";
    return ((Number(value) / Number(total)) * 100).toLocaleString("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits
    });
  }

  function formatClubStatsGenderShortPercentLabel(female, male) {
    const total = (Number(female) || 0) + (Number(male) || 0);
    return `${formatClubStatsPercent(male, total)} m / ${formatClubStatsPercent(female, total)} w`;
  }

  function formatClubStatsGenderCompactPercentLabel(female, male) {
    const total = (Number(female) || 0) + (Number(male) || 0);
    return `m/w ${formatClubStatsPercentNumber(male, total)}/${formatClubStatsPercentNumber(female, total)}%`;
  }

  function formatClubStatsScaleTick(value, scale) {
    return scale === "percent" ? `${formatClubStatsNumber(value)}%` : formatClubStatsNumber(value);
  }

  function renderClubStatsGenderChart(series, options = {}) {
    const points = Array.isArray(series) ? series : [];
    const scale = options.scale === "percent" ? "percent" : "count";
    const W = 520;
    const H = 178;
    const m = { t: 18, r: 14, b: 30, l: 34 };
    const cw = W - m.l - m.r;
    const ch = H - m.t - m.b;
    const maxValue = scale === "percent"
      ? 100
      : Math.max(1, ...points.map((point) => (Number(point.femaleAthletes) || 0) + (Number(point.maleAthletes) || 0)));
    const tickValues = scale === "percent"
      ? [0, 50, 100]
      : Array.from(new Set([0, Math.ceil(maxValue / 2), maxValue]));
    const xForIndex = (index) => points.length <= 1 ? m.l + cw / 2 : m.l + (index / (points.length - 1)) * cw;
    const yForValue = (value) => m.t + ch - ((Number(value) || 0) / maxValue) * ch;
    const svg = s("svg", {
      class: "club-stats-chart club-stats-chart--gender",
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Sportler nach Geschlecht und Jahr",
      focusable: "false"
    });

    const grid = s("g", { class: "club-stats-chart-grid" });
    tickValues.forEach((tick) => {
      const y = yForValue(tick);
      grid.appendChild(s("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "club-stats-grid-line" }));
      grid.appendChild(s("text", { x: m.l - 8, y: y + 4, class: "club-stats-y-label", "text-anchor": "end" }, formatClubStatsScaleTick(tick, scale)));
    });
    svg.appendChild(grid);
    svg.appendChild(s("line", { x1: m.l, y1: m.t + ch, x2: W - m.r, y2: m.t + ch, class: "club-stats-axis" }));

    if (points.length) {
      const step = points.length > 7 ? Math.ceil(points.length / 6) : 1;
      const xAxis = s("g", { class: "club-stats-x-axis" });
      points.forEach((point, index) => {
        const showTick = index === 0 || index === points.length - 1 || index % step === 0;
        if (!showTick) return;
        const x = xForIndex(index);
        xAxis.appendChild(s("text", { x, y: H - 8, class: "club-stats-x-label", "text-anchor": "middle" }, String(point.year)));
      });
      svg.appendChild(xAxis);
    }

    const bars = s("g", { class: "club-stats-gender-bars" });
    const barWidth = Math.max(6, Math.min(20, cw / Math.max(1, points.length * 1.9)));

    points.forEach((point, index) => {
      const female = Number(point.femaleAthletes) || 0;
      const male = Number(point.maleAthletes) || 0;
      const total = female + male;
      const x = xForIndex(index) - barWidth / 2;
      const base = m.t + ch;
      const femaleValue = scale === "percent" && total ? (female / total) * 100 : female;
      const maleValue = scale === "percent" && total ? (male / total) * 100 : male;
      const femaleHeight = femaleValue ? Math.max(1, (femaleValue / maxValue) * ch) : 0;
      const maleHeight = maleValue ? Math.max(1, (maleValue / maxValue) * ch) : 0;
      const femaleY = base - femaleHeight;
      const maleY = femaleY - maleHeight;
      const title = `${point.year}: ${formatClubStatsGenderShortPercentLabel(female, male)}`;

      if (male > 0) {
        bars.appendChild(
          s(
            "rect",
            { x, y: maleY, width: barWidth, height: maleHeight, rx: 2, class: "club-stats-gender-bar club-stats-gender-bar--male" },
            s("title", {}, title)
          )
        );
      }

      if (female > 0) {
        bars.appendChild(
          s(
            "rect",
            { x, y: femaleY, width: barWidth, height: femaleHeight, rx: 2, class: "club-stats-gender-bar club-stats-gender-bar--female" },
            s("title", {}, title)
          )
        );
      }
    });

    svg.appendChild(bars);
    return svg;
  }

  function renderClubStatsAgeClassChart(series, options = {}) {
    const points = Array.isArray(series) ? series : [];
    const scale = options.scale === "percent" ? "percent" : "count";
    const W = 520;
    const H = 178;
    const m = { t: 18, r: 14, b: 30, l: 34 };
    const cw = W - m.l - m.r;
    const ch = H - m.t - m.b;
    const maxValue = scale === "percent"
      ? 100
      : Math.max(1, ...points.map((point) => getClubStatsAgeClassTotal(point.ageClassCounts)));
    const tickValues = scale === "percent"
      ? [0, 50, 100]
      : Array.from(new Set([0, Math.ceil(maxValue / 2), maxValue]));
    const xForIndex = (index) => points.length <= 1 ? m.l + cw / 2 : m.l + (index / (points.length - 1)) * cw;
    const yForValue = (value) => m.t + ch - ((Number(value) || 0) / maxValue) * ch;
    const svg = s("svg", {
      class: "club-stats-chart club-stats-chart--age-classes",
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Altersklassen nach Jahren",
      focusable: "false"
    });

    const grid = s("g", { class: "club-stats-chart-grid" });
    tickValues.forEach((tick) => {
      const y = yForValue(tick);
      grid.appendChild(s("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "club-stats-grid-line" }));
      grid.appendChild(s("text", { x: m.l - 8, y: y + 4, class: "club-stats-y-label", "text-anchor": "end" }, formatClubStatsScaleTick(tick, scale)));
    });
    svg.appendChild(grid);
    svg.appendChild(s("line", { x1: m.l, y1: m.t + ch, x2: W - m.r, y2: m.t + ch, class: "club-stats-axis" }));

    if (points.length) {
      const step = points.length > 7 ? Math.ceil(points.length / 6) : 1;
      const xAxis = s("g", { class: "club-stats-x-axis" });
      points.forEach((point, index) => {
        const showTick = index === 0 || index === points.length - 1 || index % step === 0;
        if (!showTick) return;
        const x = xForIndex(index);
        xAxis.appendChild(s("text", { x, y: H - 8, class: "club-stats-x-label", "text-anchor": "middle" }, String(point.year)));
      });
      svg.appendChild(xAxis);
    }

    const bars = s("g", { class: "club-stats-age-class-bars" });
    const barWidth = Math.max(7, Math.min(22, cw / Math.max(1, points.length * 1.9)));

    points.forEach((point, index) => {
      const total = getClubStatsAgeClassTotal(point.ageClassCounts);
      const x = xForIndex(index) - barWidth / 2;
      let accumulated = 0;

      CLUB_STATS_AGE_CLASSES.forEach((ageClass) => {
        const value = Number(point.ageClassCounts?.[ageClass.key]) || 0;
        if (!value) return;

        const yBottom = yForValue(accumulated);
        accumulated += scale === "percent" && total ? (value / total) * 100 : value;
        const yTop = yForValue(accumulated);
        const label = `${point.year}: ${ageClass.label}: ${formatClubStatsNumber(value)} ${getClubStatsUnitLabel(value, { singular: "Sportler", plural: "Sportler" })} (${formatClubStatsPercent(value, total)})`;

        bars.appendChild(
          s(
            "rect",
            {
              x,
              y: yTop,
              width: barWidth,
              height: Math.max(1, yBottom - yTop),
              rx: 2,
              class: `club-stats-age-class-segment club-stats-age-class-segment--${ageClass.className}`
            },
            s("title", {}, label)
          )
        );
      });
    });

    svg.appendChild(bars);
    return svg;
  }

  function getClubStatsRangeLabel(data) {
    const years = Array.isArray(data?.years) ? data.years : [];
    if (!years.length) return "";
    if (years.length === 1) return String(years[0]);
    return `${years[0]}-${years[years.length - 1]}`;
  }

  function getClubStatsLatestLabel(series, valueKey, unitLabels, valueFormatter = formatClubStatsNumber) {
    const points = Array.isArray(series) ? series : [];
    if (!points.length) return "";
    const latest = points[points.length - 1];
    return `${latest.year}: ${valueFormatter(latest[valueKey])} ${getClubStatsUnitLabel(latest[valueKey], unitLabels)}`;
  }

  function renderClubStatCard(config, data) {
    const unitLabels = {
      singular: config.unitSingular,
      plural: config.unitPlural
    };
    const valueFormatter = config.valueFormatter || formatClubStatsNumber;
    const latestLabel = getClubStatsLatestLabel(data.series, config.key, unitLabels, valueFormatter);

    return h(
      "section",
      { class: `club-stats-card club-stats-card--${config.key}` },
      h(
        "header",
        { class: "club-stats-card-head" },
        h(
          "div",
          { class: "club-stats-title-group" },
          h("h3", {}, config.title),
          h("p", {}, "Gesamt")
        ),
        h("strong", { class: "club-stats-value" }, valueFormatter(data.totals[config.key]))
      ),
      latestLabel ? h("div", { class: "club-stats-latest" }, latestLabel) : null,
      h(
        "div",
        { class: "club-stats-chart-wrap" },
        renderClubStatsChart(data.series, config.key, {
          type: config.chartType,
          chartLabel: `${config.title} nach Jahren`,
          unitLabels,
          valueFormatter
        })
      )
    );
  }

  function renderClubAthleteModeToggle(activeMode, onChange) {
    const modes = [
      { key: "count", label: "Anzahl" },
      { key: "gender", label: "Geschlecht" },
      { key: "age", label: "Altersklasse" }
    ];

    return h(
      "div",
      { class: "club-stats-mode-toggle", role: "group", "aria-label": "Sportler Statistikmodus" },
      modes.map((mode) =>
        h(
          "button",
          {
            class: `club-stats-mode-btn${activeMode === mode.key ? " is-active" : ""}`,
            type: "button",
            "aria-pressed": activeMode === mode.key ? "true" : "false",
            onclick: () => {
              if (CLUB_STATS_STATE.athleteMode === mode.key) return;
              CLUB_STATS_STATE.athleteMode = mode.key;
              if (typeof onChange === "function") onChange();
            }
          },
          mode.label
        )
      )
    );
  }

  function renderClubAthleteScaleToggle(activeScale, onChange, stateKey = "athleteChartScale") {
    const scales = [
      { key: "count", label: "Anzahl" },
      { key: "percent", label: "%" }
    ];

    return h(
      "div",
      { class: "club-stats-chart-options", role: "group", "aria-label": "Diagramm-Skala" },
      h(
        "div",
        { class: "club-stats-scale-toggle" },
        scales.map((scale) =>
          h(
            "button",
            {
              class: `club-stats-scale-btn${activeScale === scale.key ? " is-active" : ""}`,
              type: "button",
              "aria-pressed": activeScale === scale.key ? "true" : "false",
              onclick: () => {
                if (CLUB_STATS_STATE[stateKey] === scale.key) return;
                CLUB_STATS_STATE[stateKey] = scale.key;
                if (typeof onChange === "function") onChange();
              }
            },
            scale.label
          )
        )
      )
    );
  }

  function getClubAthletesStatsValue(data, activeMode) {
    if (activeMode === "gender") {
      return formatClubStatsGenderCompactPercentLabel(data?.totals?.femaleAthletes, data?.totals?.maleAthletes);
    }
    if (activeMode === "age") {
      return `${formatClubStatsAge(data?.totals?.averageAge)} J.`;
    }
    return formatClubStatsNumber(data?.totals?.athletes);
  }

  function renderClubAthletesStatsCard(data, onModeChange) {
    const activeMode = ["gender", "age"].includes(CLUB_STATS_STATE.athleteMode) ? CLUB_STATS_STATE.athleteMode : "count";
    const chartScale = CLUB_STATS_STATE.athleteChartScale === "percent" ? "percent" : "count";
    const unitLabels = {
      singular: "Sportler",
      plural: "Sportler"
    };
    const points = Array.isArray(data?.series) ? data.series : [];
    const latest = points[points.length - 1] || null;
    const latestLabel = activeMode === "age"
      ? formatClubStatsAgeClassLatestLabel(latest)
      : activeMode === "gender"
        ? latest
          ? `${latest.year}: ${formatClubStatsGenderShortPercentLabel(latest.femaleAthletes, latest.maleAthletes)}`
          : ""
        : getClubStatsLatestLabel(data.series, "athletes", unitLabels);
    const subtitle = activeMode === "age" ? "Altersklassen" : activeMode === "gender" ? "nach Geschlecht" : "Anzahl";
    const totalValue = getClubAthletesStatsValue(data, activeMode);

    return h(
      "section",
      { class: `club-stats-card club-stats-card--athletes club-stats-card--athletes-${activeMode}` },
      h(
        "header",
        { class: "club-stats-card-head" },
        h(
          "div",
          { class: "club-stats-title-group" },
          h("h3", {}, "Sportler"),
          h("p", {}, subtitle)
        ),
        h("strong", { class: "club-stats-value" }, totalValue)
      ),
      renderClubAthleteModeToggle(activeMode, onModeChange),
      latestLabel ? h("div", { class: "club-stats-latest" }, latestLabel) : null,
      activeMode === "gender" ? h(
        "div",
        { class: "club-stats-legend", "aria-hidden": "true" },
        h("span", { class: "club-stats-legend-item" }, h("span", { class: "club-stats-legend-swatch club-stats-legend-swatch--female" }), "weiblich"),
        h("span", { class: "club-stats-legend-item" }, h("span", { class: "club-stats-legend-swatch club-stats-legend-swatch--male" }), "m\u00e4nnlich")
      ) : activeMode === "age" ? h(
        "div",
        { class: "club-stats-legend", "aria-hidden": "true" },
        CLUB_STATS_AGE_CLASSES.map((ageClass) =>
          h(
            "span",
            { class: "club-stats-legend-item" },
            h("span", { class: `club-stats-legend-swatch club-stats-legend-swatch--age-${ageClass.className}` }),
            ageClass.shortLabel
          )
        )
      ) : null,
      activeMode !== "count" ? renderClubAthleteScaleToggle(chartScale, onModeChange) : null,
      h(
        "div",
        { class: "club-stats-chart-wrap" },
        activeMode === "age"
          ? renderClubStatsAgeClassChart(data.series, { scale: chartScale })
          : activeMode === "gender"
            ? renderClubStatsGenderChart(data.series, { scale: chartScale })
            : renderClubStatsChart(data.series, "athletes", {
              type: "line",
              chartLabel: "Sportler Anzahl nach Jahren",
              unitLabels
            })
      )
    );
  }

  function renderClubStatsControls(onChange) {
    const checkbox = h("input", {
      type: "checkbox",
      checked: CLUB_STATS_STATE.includeOms,
      onchange: (event) => {
        CLUB_STATS_STATE.includeOms = !!event.currentTarget.checked;
        if (typeof onChange === "function") onChange();
      }
    });

    checkbox.checked = CLUB_STATS_STATE.includeOms;

    return h(
      "label",
      { class: "club-stats-toggle" },
      checkbox,
      h("span", {}, "OMS berücksichtigen")
    );
  }

  async function renderClubStats(panel, group) {
    if (!panel || !group) return;

    panel.innerHTML = "";
    const section = h("section", { class: "club-stats-section" });
    section.appendChild(h("div", { class: "club-bests-status" }, "Stats werden geladen ..."));
    panel.appendChild(section);

    try {
      const rows = await getBestenlisteRows();

      section.innerHTML = "";
      const summaryValue = h("span", { class: "club-stats-summary-value" }, "");
      const content = h("div", { class: "club-stats-content" });

      const toolbar = h(
        "div",
        { class: "club-stats-toolbar" },
        h(
          "div",
          { class: "club-stats-summary" },
          h("span", { class: "club-stats-summary-label" }, "Zeitraum"),
          summaryValue
        ),
        renderClubStatsControls(paint)
      );

      section.appendChild(toolbar);
      section.appendChild(content);
      paint();

      function paint() {
        const data = buildClubStatsData(rows, group, CLUB_STATS_STATE);
        summaryValue.textContent = getClubStatsRangeLabel(data) || "—";
        content.innerHTML = "";

        if (!data.series.length) {
          content.appendChild(h("div", { class: "club-bests-empty" }, "Keine Statistikdaten erfasst."));
          return;
        }

        content.appendChild(
          h(
            "div",
            { class: "club-stats-grid" },
            renderClubStatCard({
              key: "competitions",
              title: "Wettk\u00e4mpfe besucht",
              unitSingular: "Wettkampf",
              unitPlural: "Wettk\u00e4mpfe",
              chartType: "bar"
            }, data),
            renderClubStatCard({
              key: "starts",
              title: "Starts",
              unitSingular: "Start",
              unitPlural: "Starts",
              chartType: "bar"
            }, data),
            renderClubAthletesStatsCard(data, paint)
          )
        );
      }
    } catch (error) {
      console.error("Club-Stats konnten nicht geladen werden:", error);
      section.innerHTML = "";
      section.appendChild(
        h("div", { class: "club-bests-status club-bests-status--error" }, "Stats konnten nicht geladen werden.")
      );
    }
  }


  window.ClubsProfileStats = {
    render(panel, group, helpers = {}) {
      shared = helpers || {};
      return renderClubStats(panel, group);
    }
  };
})();
