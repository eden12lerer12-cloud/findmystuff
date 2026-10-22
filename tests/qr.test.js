import { test } from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";
import { locationURL, locationFromHash, qrMatrix } from "../src/qr.js";
test("QR round trip decodes an opaque location URL with no private data", () => {
  const url = locationURL(
    "https://example.org/findmystuff/?private=remove#old",
    "custom-123",
  );
  assert.equal(url, "https://example.org/findmystuff/#place=custom-123");
  assert.equal(locationFromHash(new URL(url).hash), "custom-123");
  const matrix = qrMatrix(url),
    cell = 8,
    size = (matrix.length + 8) * cell,
    data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (matrix[Math.floor(y / cell) - 4]?.[Math.floor(x / cell) - 4]) {
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  assert.equal(jsQR(data, size, size)?.data, url);
  assert.throws(() => locationURL("https://example.org", "private name"));
  assert.throws(() => locationURL("javascript:alert(1)", "safe"));
  assert.equal(locationFromHash("#place=<script>"), null);
});
test("vendored QR encoder matches pinned package byte-for-byte", async () => {
  assert.deepEqual(
    await readFile(new URL("../src/vendor/qrcode.js", import.meta.url)),
    await readFile(
      new URL(
        "../node_modules/qrcode-generator/dist/qrcode.mjs",
        import.meta.url,
      ),
    ),
  );
});
