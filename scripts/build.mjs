import { mkdir, copyFile, cp, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of ["index.html", "styles.css", "icon.svg"])
  await copyFile(file, `dist/${file}`);
await cp("src", "dist/src", { recursive: true });
console.log("Static application built in dist/");
