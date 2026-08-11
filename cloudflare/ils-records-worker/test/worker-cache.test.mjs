import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const fixture = `
  <select>
    <optgroup label="Individual">
      <option>200m Obstacle Swim</option>
    </optgroup>
  </select>
  <table>
    <tr class="record-table-row">
      <td data-label="Event">Open - 200m Obstacle Swim - Men</td>
      <td data-label="Date">29-08-2024</td>
      <td data-label="Time">1:51.73</td>
      <td data-label="History"></td>
    </tr>
  </table>
`;

test("caches successful records for 12 hours and reuses them for GET and HEAD", async () => {
  const storedResponses = new Map();
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;

  globalThis.caches = {
    default: {
      async match(request) {
        return storedResponses.get(request.url)?.clone();
      },
      async put(request, response) {
        storedResponses.set(request.url, response.clone());
      }
    }
  };

  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(fixture, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  };

  try {
    const pending = [];
    const ctx = {
      waitUntil(promise) {
        pending.push(promise);
      }
    };

    const first = await worker.fetch(new Request("https://records.example/"), {}, ctx);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("X-ILS-Data-Cache"), "MISS");
    assert.equal(first.headers.get("X-ILS-Cache-TTL"), "43200");
    assert.match(first.headers.get("Cache-Control"), /max-age=43200/);
    assert.equal(upstreamCalls, 1);
    await Promise.all(pending);

    const second = await worker.fetch(new Request("https://records.example/records"), {}, {});
    assert.equal(second.headers.get("X-ILS-Data-Cache"), "HIT");
    assert.equal(upstreamCalls, 1);
    assert.equal((await second.json()).count, 1);

    const head = await worker.fetch(
      new Request("https://records.example/records", { method: "HEAD" }),
      {},
      {}
    );
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("X-ILS-Data-Cache"), "HIT");
    assert.equal(await head.text(), "");
    assert.equal(upstreamCalls, 1);
  } finally {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  }
});

test("does not cache upstream failures", async () => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  let cacheWrites = 0;

  globalThis.caches = {
    default: {
      async match() {
        return undefined;
      },
      async put() {
        cacheWrites += 1;
      }
    }
  };

  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });

  try {
    const response = await worker.fetch(new Request("https://records.example/records"), {}, {});
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
    assert.equal(cacheWrites, 0);
  } finally {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  }
});
