import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretCommand, createRecognition } from "../src/voice-core.js";
test("typed or spoken commands propose fields without saving anything", () => {
  assert.deepEqual(interpretCommand("I put my wallet in the bedroom drawer."), {
    kind: "record",
    name: "wallet",
    location: "bedroom drawer",
  });
  assert.deepEqual(interpretCommand("שמתי את הארנק שלי במגירה בחדר שינה"), {
    kind: "record",
    name: "הארנק",
    location: "מגירה בחדר שינה",
  });
  assert.deepEqual(interpretCommand("Where are my car keys?"), {
    kind: "search",
    query: "Where are my car keys?",
  });
  assert.deepEqual(interpretCommand("איפה הדרכון שלי?"), {
    kind: "search",
    query: "איפה הדרכון שלי?",
  });
  assert.deepEqual(
    interpretCommand("שמתי את חפץ בדיקת דיבור בקופסת QR לדוגמה"),
    { kind: "record", name: "חפץ בדיקת דיבור", location: "קופסת QR לדוגמה" },
  );
  assert.deepEqual(interpretCommand("שמתי את הארנק במגירה"), {
    kind: "record",
    name: "הארנק",
    location: "מגירה",
  });
  assert.throws(() => interpretCommand(""));
  assert.throws(() => interpretCommand("x".repeat(2001)));
});
test("speech adapter does not start recording until explicitly requested", () => {
  let started = 0,
    aborted = 0,
    instance,
    result;
  class MockRecognition {
    constructor() {
      instance = this;
    }
    start() {
      started++;
    }
    abort() {
      aborted++;
    }
  }
  const speech = createRecognition({
    Recognition: MockRecognition,
    language: "he-IL",
    onResult: (text) => (result = text),
    onError: () => {},
  });
  assert.equal(started, 0);
  speech.start();
  assert.equal(started, 1);
  assert.equal(instance.lang, "he-IL");
  instance.onresult({ results: [[{ transcript: "שמתי ארנק במגירה" }]] });
  assert.equal(result, "שמתי ארנק במגירה");
  speech.abort();
  assert.equal(aborted, 1);
});
