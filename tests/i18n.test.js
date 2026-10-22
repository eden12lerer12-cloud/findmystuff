import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { messages, translate } from "../src/i18n.js";
test("Hebrew and English cover the same translation keys", () => {
  assert.deepEqual(
    Object.keys(messages.he).sort(),
    Object.keys(messages.en).sort(),
  );
});
test("All declared UI translation keys exist in both languages", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const [, key] of html.matchAll(
    /data-i18n(?:-(?:placeholder|aria-label|alt))?="([^"]+)"/g,
  )) {
    for (const language of ["he", "en"])
      assert.equal(
        typeof messages[language][key],
        "string",
        `${language}:${key}`,
      );
  }
});
test("Parameters and recorded-location language are explicit", () => {
  assert.equal(
    translate("en", "editItem", { name: "Passport" }),
    "Edit Passport",
  );
  assert.equal(translate("he", "lastRecorded"), "המיקום האחרון שתועד");
  assert.equal(translate("en", "lastRecorded"), "Last recorded location");
  assert.throws(() => translate("en", "missing-key"));
});
