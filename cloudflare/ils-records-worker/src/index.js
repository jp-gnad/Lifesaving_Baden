const ILS_RECORDS_URL = "https://sport.ilsf.org/records";
const RECORDS_CACHE_TTL_SECONDS = 12 * 60 * 60;
const RECORDS_CACHE_CONTROL = `public, max-age=${RECORDS_CACHE_TTL_SECONDS}, s-maxage=${RECORDS_CACHE_TTL_SECONDS}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
  "Access-Control-Max-Age": "86400"
};

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    if (requestUrl.pathname !== "/" && requestUrl.pathname !== "/records") {
      return jsonResponse({ error: "Not found." }, 404);
    }

    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = createRecordsCacheKey(request);

    if (cache) {
      try {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          return prepareRecordsResponse(cachedResponse, request.method, "HIT");
        }
      } catch (error) {
        console.warn("ILS records cache read failed:", error);
      }
    }

    try {
      const upstream = await fetch(ILS_RECORDS_URL, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "Lifesaving-Baden-ILS-Records/1.0"
        }
      });

      if (!upstream.ok) {
        throw new Error(`ILS antwortete mit HTTP ${upstream.status}.`);
      }

      const html = await upstream.text();
      const records = parseIlsRecordsHtml(html);

      if (!records.length) {
        throw new Error("In der ILS-Antwort wurden keine Weltrekorde erkannt.");
      }

      const payload = {
        source: ILS_RECORDS_URL,
        fetchedAt: new Date().toISOString(),
        count: records.length,
        records
      };

      const response = jsonResponse(payload, 200, {
        "Cache-Control": RECORDS_CACHE_CONTROL,
        "X-ILS-Record-Count": String(records.length),
        "X-ILS-Cache-TTL": String(RECORDS_CACHE_TTL_SECONDS)
      });

      if (cache) {
        const cacheWrite = cache.put(cacheKey, response.clone()).catch(error => {
          console.warn("ILS records cache write failed:", error);
        });

        if (ctx && typeof ctx.waitUntil === "function") {
          ctx.waitUntil(cacheWrite);
        } else {
          await cacheWrite;
        }
      }

      return prepareRecordsResponse(response, request.method, "MISS");
    } catch (error) {
      console.error("ILS records fetch failed:", error);
      return jsonResponse({
        error: "Die offiziellen ILS-Weltrekorde sind derzeit nicht erreichbar."
      }, 502);
    }
  }
};

function createRecordsCacheKey(request) {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = "/records";
  cacheUrl.search = "";
  cacheUrl.hash = "";
  return new Request(cacheUrl.toString(), { method: "GET" });
}

function prepareRecordsResponse(response, method, cacheStatus) {
  const headers = new Headers(response.headers);
  headers.set("X-ILS-Data-Cache", cacheStatus);
  headers.set("X-ILS-Cache-TTL", String(RECORDS_CACHE_TTL_SECONDS));

  return new Response(method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function parseIlsRecordsHtml(html) {
  const source = String(html || "");
  const eventKinds = parseEventKinds(source);
  const records = [];
  const rowPattern = /<tr\b[^>]*class=["'][^"']*\brecord-table-row\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;

  let rowMatch;
  while ((rowMatch = rowPattern.exec(source))) {
    const rowHtml = rowMatch[1];
    const descriptor = cleanHtmlText(extractCell(rowHtml, "Event"));
    const time = cleanHtmlText(extractCell(rowHtml, "Time"));
    const parsedDescriptor = parseRecordDescriptor(descriptor);
    const seconds = parseRecordTime(time);

    if (!parsedDescriptor || !Number.isFinite(seconds) || seconds <= 0) {
      continue;
    }

    const dateText = cleanHtmlText(extractCell(rowHtml, "Date"));
    const dateMatch = dateText.match(/\b\d{2}-\d{2}-\d{4}\b/);
    const historyCell = extractCell(rowHtml, "History");
    const historyMatch = historyCell.match(/href=["']([^"']+)["']/i);
    const eventKey = normalizeText(parsedDescriptor.event);

    records.push({
      ...parsedDescriptor,
      kind: eventKinds.get(eventKey) || inferEventKind(parsedDescriptor.event),
      time,
      seconds: Math.round(seconds * 100) / 100,
      date: dateMatch ? dateMatch[0] : null,
      historyUrl: historyMatch
        ? new URL(decodeHtmlEntities(historyMatch[1]), ILS_RECORDS_URL).href
        : null
    });
  }

  return records;
}

function parseEventKinds(html) {
  const kinds = new Map();
  const groupPattern = /<optgroup\b[^>]*label=["']([^"']+)["'][^>]*>([\s\S]*?)<\/optgroup>/gi;
  let groupMatch;

  while ((groupMatch = groupPattern.exec(html))) {
    const groupLabel = cleanHtmlText(groupMatch[1]).toLowerCase();
    const kind = groupLabel.includes("team") ? "team" : "individual";
    const optionPattern = /<option\b[^>]*>([\s\S]*?)<\/option>/gi;
    let optionMatch;

    while ((optionMatch = optionPattern.exec(groupMatch[2]))) {
      const eventName = cleanHtmlText(optionMatch[1]);
      if (eventName) {
        kinds.set(normalizeText(eventName), kind);
      }
    }
  }

  return kinds;
}

function parseRecordDescriptor(value) {
  const parts = String(value || "")
    .split(/\s+-\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length < 3) return null;

  const categoryLabel = parts[0];
  if (categoryLabel === "Masters") {
    if (parts.length < 4) return null;
    const age = parts.at(-1);
    const gender = mapGender(parts.at(-2));
    const event = parts.slice(1, -2).join(" - ");
    if (!/^M\d+$/i.test(age) || !gender || !event) return null;

    return {
      category: "masters",
      age: age.toUpperCase(),
      gender,
      event
    };
  }

  if (categoryLabel !== "Open" && categoryLabel !== "Youth") return null;

  const gender = mapGender(parts.at(-1));
  const event = parts.slice(1, -1).join(" - ");
  if (!gender || !event) return null;

  return {
    category: categoryLabel.toLowerCase(),
    age: categoryLabel,
    gender,
    event
  };
}

function mapGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "men") return "male";
  if (normalized === "women") return "female";
  if (normalized === "mixed") return "mixed";
  return null;
}

function inferEventKind(eventName) {
  return /\b(relay|line throw)\b/i.test(String(eventName || ""))
    ? "team"
    : "individual";
}

function parseRecordTime(value) {
  const normalized = String(value || "").trim().replace(",", ".");
  const match = normalized.match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,2})$/);
  if (!match) return NaN;

  const minutes = Number(match[1] || 0);
  const seconds = Number(match[2] || 0);
  const hundredths = Number(String(match[3] || "0").padEnd(2, "0").slice(0, 2));
  return minutes * 60 + seconds + hundredths / 100;
}

function extractCell(rowHtml, label) {
  const safeLabel = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<td\\b[^>]*data-label=["']${safeLabel}["'][^>]*>([\\s\\S]*?)<\\/td>`,
    "i"
  );
  return rowHtml.match(pattern)?.[1] || "";
}

function cleanHtmlText(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };

  return String(value || "").replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith("#x")) {
        return String.fromCodePoint(parseInt(lower.slice(2), 16));
      }
      if (lower.startsWith("#")) {
        return String.fromCodePoint(parseInt(lower.slice(1), 10));
      }
      return Object.prototype.hasOwnProperty.call(named, lower) ? named[lower] : match;
    }
  );
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function responseHeaders(extra = {}) {
  return {
    ...CORS_HEADERS,
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extra
  };
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders(extraHeaders)
  });
}
