import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const args = process.argv.slice(2);
const root = resolve(args.includes("--dist") ? "dist" : ".");
const baseIndex = args.indexOf("--base");
const base =
  baseIndex < 0
    ? ""
    : "/" +
      String(args[baseIndex + 1] || "")
        .split("/")
        .filter(Boolean)
        .join("/");
if (baseIndex >= 0 && !/^\/[a-zA-Z0-9_-]+$/.test(base))
  throw new Error("Expected a single safe base path");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (base && pathname === base) {
      res.writeHead(302, { Location: base + "/" });
      res.end();
      return;
    }
    if (base && !pathname.startsWith(base + "/"))
      throw new Error("Outside base path");
    pathname = pathname.slice(base.length);
    const path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep))
      throw new Error("Invalid path");
    const file = path === root ? resolve(root, "index.html") : path;
    if (!types[extname(file)]) {
      res.writeHead(404);
      res.end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log(`Local: http://127.0.0.1:4173${base}/`),
);
