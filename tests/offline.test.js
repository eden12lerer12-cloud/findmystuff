import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
test("offline worker intercepts only explicit static files and scoped root navigation", async () => {
  const source = (
    await readFile(
      new URL("../scripts/service-worker.template.js", import.meta.url),
      "utf8",
    )
  )
    .replace(
      "__ASSETS__",
      JSON.stringify(["index.html", "styles.css", "src/app.js"]),
    )
    .replace("__DIGEST__", "test");
  const events = {},
    deleted = [],
    prefix = "findmystuff-shell:https://example.org/findmystuff/:";
  const cache = {
    match: async () => new Response("shell"),
    addAll: async () => {},
  };
  const context = {
    URL,
    Request,
    Response,
    Set,
    fetch: async () => new Response("network"),
    caches: {
      open: async () => cache,
      keys: async () => [prefix + "old", "another-app", prefix + "test"],
      delete: async (key) => deleted.push(key),
    },
    self: {
      registration: { scope: "https://example.org/findmystuff/" },
      location: { origin: "https://example.org" },
      clients: { claim: async () => {} },
      addEventListener: (type, fn) => (events[type] = fn),
    },
  };
  vm.runInNewContext(source, context);
  function intercept(url, mode = "cors", method = "GET") {
    let intercepted = false;
    events.fetch({
      request: { url, mode, method },
      respondWith: () => (intercepted = true),
    });
    return intercepted;
  }
  assert.equal(intercept("https://example.org/findmystuff/styles.css"), true);
  assert.equal(intercept("https://example.org/findmystuff/", "navigate"), true);
  for (const url of [
    "https://example.org/findmystuff/backup.json",
    "https://example.org/findmystuff/styles.css?private=x",
    "https://example.org/other/",
    "https://other.org/findmystuff/styles.css",
    "blob:https://example.org/private",
  ])
    assert.equal(intercept(url), false);
  assert.equal(
    intercept("https://example.org/findmystuff/styles.css", "cors", "POST"),
    false,
  );
  let activation;
  events.activate({ waitUntil: (p) => (activation = p) });
  await activation;
  assert.deepEqual(deleted, [prefix + "old"]);
});
