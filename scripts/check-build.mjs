import { readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
const root = resolve("dist");
async function exists(relative) {
  const path = resolve(root, relative);
  if (!path.startsWith(root + "/")) throw new Error("Asset escaped build");
  await stat(path);
}
const html = await readFile("dist/index.html", "utf8"),
  pkg = JSON.parse(await readFile("package.json", "utf8"));
if (!html.includes(`name="application-version" content="${pkg.version}"`))
  throw new Error("Release version mismatch");
for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g))
  await exists(asset);
const worker = await readFile("dist/sw.js", "utf8"),
  match = /const ASSETS = (\[[^;]+\]);/.exec(worker);
if (!match) throw new Error("Missing static asset allowlist");
const assets = JSON.parse(match[1]);
for (const asset of assets) {
  await exists(asset);
  if (!asset.endsWith(".js")) continue;
  const source = await readFile(resolve(root, asset), "utf8");
  for (const [, dependency] of source.matchAll(
    /(?:from\s+|import\s*)["'](\.[^"']+)["']/g,
  )) {
    const relative = resolve(root, dirname(asset), dependency).slice(
      root.length + 1,
    );
    if (!assets.includes(relative))
      throw new Error(`Missing offline module ${relative}`);
  }
}
for (const required of [
  "src/backup-worker.js",
  "src/vendor/qrcode.js",
  "index.html",
  "manifest.webmanifest",
])
  if (!assets.includes(required))
    throw new Error(`Missing runtime asset ${required}`);
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
for (const icon of manifest.icons) {
  await exists(icon.src);
  const png = await readFile(resolve(root, icon.src));
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20);
  if (icon.sizes !== `${width}x${height}`)
    throw new Error("Icon dimensions mismatch");
}
console.log(
  `Verified ${assets.length} static offline assets, relative imports, icons and release ${pkg.version}`,
);
