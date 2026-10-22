import {
  mkdir,
  copyFile,
  cp,
  rm,
  readFile,
  writeFile,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "manifest.webmanifest",
  "THIRD_PARTY_NOTICES.md",
])
  await copyFile(file, `dist/${file}`);
await cp("src", "dist/src", { recursive: true });
console.log("Static application built in dist/");

async function files(path) {
  const list = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = `${path}/${entry.name}`;
    list.push(...(entry.isDirectory() ? await files(name) : [name]));
  }
  return list;
}
const html = await readFile("dist/index.html", "utf8");
await writeFile(
  "dist/index.html",
  html.replace(
    "</head>",
    '<meta name="offline-build" content="true" /></head>',
  ),
);
const assets = (await files("dist")).map((file) => file.slice(5)).sort();
const hash = createHash("sha256");
for (const file of assets) {
  hash.update(file);
  hash.update(await readFile(`dist/${file}`));
}
const template = await readFile("scripts/service-worker.template.js", "utf8");
await writeFile(
  "dist/sw.js",
  template
    .replace("__ASSETS__", JSON.stringify(assets))
    .replace("__DIGEST__", hash.digest("hex").slice(0, 16)),
);
