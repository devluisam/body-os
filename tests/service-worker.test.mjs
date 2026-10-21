import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
test("offline shell excludes API and login responses and serves cached assets", async () => {
  const listeners = {},
    entries = new Map();
  const key = (r) => (typeof r === "string" ? r : r.url);
  const cache = {
    addAll: async (urls) =>
      urls.forEach((u) => entries.set(u, new Response(u))),
    put: async (k, r) => entries.set(key(k), r.clone()),
    match: async (k) => entries.get(key(k))?.clone(),
  };
  let offline = false,
    login = false;
  const fetch = async () => {
    if (offline) throw Error("offline");
    const response = new Response(
      login ? "<html>Sign in</html>" : '<body data-bodyos-shell="1">App</body>',
      { headers: { "content-type": "text/html" } },
    );
    Object.defineProperty(response, "url", {
      value: login ? "https://app.test/signin" : "https://app.test/",
    });
    Object.defineProperty(response, "redirected", { value: login });
    return response;
  };
  const self = {
    location: { origin: "https://app.test" },
    addEventListener: (n, f) => (listeners[n] = f),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(
    await readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    {
      self,
      URL,
      fetch,
      caches: {
        open: async () => cache,
        match: cache.match,
        keys: async () => [],
        delete: async () => true,
      },
    },
  );
  let pending;
  listeners.install({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.ok(entries.has("/"));
  let response;
  offline = true;
  listeners.fetch({
    request: { method: "GET", mode: "navigate", url: "https://app.test/" },
    respondWith: (p) => (response = p),
  });
  assert.match(await (await response).text(), /data-bodyos-shell/);
  response = undefined;
  listeners.fetch({
    request: { method: "GET", url: "https://app.test/api/data" },
    respondWith: (p) => (response = p),
  });
  assert.equal(response, undefined, "private API is never intercepted");
  offline = false;
  login = true;
  listeners.fetch({
    request: { method: "GET", mode: "navigate", url: "https://app.test/" },
    respondWith: (p) => (response = p),
  });
  await response;
  assert.match(
    await entries.get("/").clone().text(),
    /data-bodyos-shell/,
    "login must not replace app shell",
  );
  login = false;
  listeners.message({
    data: {
      type: "CACHE_ASSETS",
      urls: [
        "https://app.test/assets/app.js",
        "https://app.test/_next/static/chunks/body-os-abc.js",
        "https://app.test/_next/static/css/index-abc.css",
        "https://app.test/api/photos?id=private",
        "https://external.test/assets/app.js",
      ],
    },
    waitUntil: (p) => (pending = p),
  });
  await pending;
  assert.ok(entries.has("https://app.test/assets/app.js"));
  // The Vinext build serves its chunks here; missing them broke offline start.
  assert.ok(entries.has("https://app.test/_next/static/chunks/body-os-abc.js"));
  assert.ok(entries.has("https://app.test/_next/static/css/index-abc.css"));
  assert.ok(!entries.has("https://app.test/api/photos?id=private"));
  assert.ok(!entries.has("https://external.test/assets/app.js"));
});
