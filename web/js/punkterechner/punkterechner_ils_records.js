const PR_ILS_RECORDS_API_URL = "https://ils-records.jp-gnad.workers.dev/records";

const PR_ILS_EVENT_LABELS_DE = {
  "200m Obstacle Swim": "200m Hindernisschwimmen",
  "100m Obstacle Swim": "100m Hindernisschwimmen",
  "100m Rescue Medley": "100m komb. Rettungsübung",
  "100m Manikin Carry with Fins": "100m Retten mit Flossen",
  "100m Manikin Tow with Fins": "100m Lifesaver",
  "50m Manikin Carry": "50m Retten",
  "200m Super Lifesaver": "200m Super-Lifesaver",
  "4x25m Manikin Relay": "4×25m Puppenstaffel",
  "4x50m Lifesaving Relay": "4×50m Lifesavingstaffel",
  "4x50m Medley Relay": "4×50m Gurtretterstaffel",
  "4x50m Obstacle Relay": "4×50m Hindernisstaffel",
  "4x50m Pool Lifesaver Relay": "4×50m Rettungsstaffel",
  "Line Throw": "Leinenwurf"
};

const PR_ILS_EVENT_ORDER = [
  "200m Obstacle Swim",
  "100m Obstacle Swim",
  "100m Rescue Medley",
  "100m Manikin Carry with Fins",
  "100m Manikin Tow with Fins",
  "50m Manikin Carry",
  "200m Super Lifesaver",
  "Line Throw",
  "4x25m Manikin Relay",
  "4x50m Lifesaving Relay",
  "4x50m Medley Relay",
  "4x50m Obstacle Relay",
  "4x50m Pool Lifesaver Relay"
];

const prIlsRecords = {
  records: [],
  fetchedAt: null,
  loaded: false,
  error: null,
  loadPromise: null
};

async function prEnsureIlsRecords(options = {}) {
  const force = options && options.force === true;
  if (prIlsRecords.loaded && !force) return prIlsRecords.records;
  if (prIlsRecords.loadPromise) return prIlsRecords.loadPromise;

  prIlsRecords.loadPromise = (async () => {
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(PR_ILS_RECORDS_API_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`ILS-Proxy antwortete mit HTTP ${response.status}.`);
        }

        const payload = await response.json();
        const records = prNormalizeIlsRecordsPayload(payload);
        if (!records.length) {
          throw new Error("Der ILS-Proxy lieferte keine verwertbaren Weltrekorde.");
        }

        prIlsRecords.records = records;
        prIlsRecords.fetchedAt = payload && payload.fetchedAt ? String(payload.fetchedAt) : null;
        prIlsRecords.loaded = true;
        prIlsRecords.error = null;
        return records;
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise(resolve => window.setTimeout(resolve, 500));
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    prIlsRecords.records = [];
    prIlsRecords.fetchedAt = null;
    prIlsRecords.loaded = false;
    prIlsRecords.error = lastError || new Error("ILS-Weltrekorde konnten nicht geladen werden.");
    throw prIlsRecords.error;
  })();

  try {
    return await prIlsRecords.loadPromise;
  } finally {
    prIlsRecords.loadPromise = null;
  }
}

function prNormalizeIlsRecordsPayload(payload) {
  const sourceRecords = payload && Array.isArray(payload.records) ? payload.records : [];

  return sourceRecords
    .map(record => {
      const category = String(record?.category || "").toLowerCase();
      const age = String(record?.age || "");
      const gender = String(record?.gender || "").toLowerCase();
      const event = String(record?.event || "").trim();
      const kind = String(record?.kind || "").toLowerCase();
      const seconds = Number(record?.seconds);

      if (!['open', 'youth', 'masters'].includes(category)) return null;
      if (!['male', 'female', 'mixed'].includes(gender)) return null;
      if (!['individual', 'team'].includes(kind)) return null;
      if (!event || !Number.isFinite(seconds) || seconds <= 0) return null;

      return {
        category,
        age,
        gender,
        event,
        kind,
        seconds,
        time: String(record?.time || ""),
        date: record?.date ? String(record.date) : null,
        historyUrl: record?.historyUrl ? String(record.historyUrl) : null
      };
    })
    .filter(Boolean);
}

function prGetIlsMasterAgeValues() {
  return Array.from(new Set(
    prIlsRecords.records
      .filter(record => record.category === "masters" && record.kind === "individual")
      .map(record => parseInt(String(record.age).replace(/^M/i, ""), 10))
      .filter(age => Number.isFinite(age))
  ))
    .sort((a, b) => a - b)
    .map(String);
}

function prGetIlsDisciplines(mode, age, gender) {
  const selection = prGetIlsSelection(age, gender);
  if (!selection) return [];

  const expectedKind = mode === "Mannschaft" ? "team" : "individual";
  const byEvent = new Map();

  prIlsRecords.records.forEach(record => {
    if (record.category !== selection.category) return;
    if (record.age !== selection.age) return;
    if (record.gender !== selection.gender) return;
    if (record.kind !== expectedKind) return;

    const key = prNormalizeIlsEventName(record.event);
    const current = byEvent.get(key);
    if (!current || record.seconds < current.seconds) {
      byEvent.set(key, record);
    }
  });

  return Array.from(byEvent.values())
    .sort(prCompareIlsEvents)
    .map(record => ({
      id: prCreateIlsDisciplineId(record),
      label: PR_ILS_EVENT_LABELS_DE[record.event] || record.event,
      labelEn: record.event,
      ilsEvent: record.event,
      recordSeconds: record.seconds,
      recordTime: record.time,
      recordDate: record.date,
      recordHistoryUrl: record.historyUrl
    }));
}

function prGetIlsSelection(age, gender) {
  const rawAge = String(age || "");
  const genderKey = prGetIlsGenderKey(gender);
  if (!genderKey) return null;

  if (rawAge === "Youth" || rawAge === "Junioren") {
    return { category: "youth", age: "Youth", gender: genderKey };
  }

  if (rawAge === "Offen" || rawAge === "Open") {
    return { category: "open", age: "Open", gender: genderKey };
  }

  const numericAge = parseInt(rawAge, 10);
  if (Number.isFinite(numericAge)) {
    return { category: "masters", age: `M${numericAge}`, gender: genderKey };
  }

  return null;
}

function prGetIlsGenderKey(gender) {
  const value = String(gender || "").toLowerCase();
  if (value === "mixed") return "mixed";
  if (value.startsWith("w") || value === "female") return "female";
  if (value.startsWith("m") || value === "male") return "male";
  return null;
}

function prCompareIlsEvents(a, b) {
  const indexA = PR_ILS_EVENT_ORDER.indexOf(a.event);
  const indexB = PR_ILS_EVENT_ORDER.indexOf(b.event);
  const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
  const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

  if (orderA !== orderB) return orderA - orderB;
  return a.event.localeCompare(b.event, "en");
}

function prCreateIlsDisciplineId(record) {
  return [record.category, record.age, record.gender, record.kind, record.event]
    .map(prNormalizeIlsEventName)
    .filter(Boolean)
    .join("_");
}

function prNormalizeIlsEventName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

window.prIlsRecords = prIlsRecords;
window.prEnsureIlsRecords = prEnsureIlsRecords;
window.prGetIlsDisciplines = prGetIlsDisciplines;
window.prGetIlsMasterAgeValues = prGetIlsMasterAgeValues;
