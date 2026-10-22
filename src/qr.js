import qrcode from "./vendor/qrcode.js";
export function locationURL(base, id) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("Invalid location ID");
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Invalid URL");
  url.search = "";
  url.hash = `place=${id}`;
  return url.href;
}
export function locationFromHash(hash) {
  const match = /^#place=([a-zA-Z0-9_-]{1,80})$/.exec(hash);
  return match?.[1] ?? null;
}
export function qrMatrix(url) {
  const qr = qrcode(0, "M");
  qr.addData(url, "Byte");
  qr.make();
  return Array.from({ length: qr.getModuleCount() }, (_, row) =>
    Array.from({ length: qr.getModuleCount() }, (_, col) =>
      qr.isDark(row, col),
    ),
  );
}
export function setupQR({ getState, t }) {
  const $ = (id) => document.getElementById(id);
  let currentURL = "";
  function open(id) {
    const place = getState().catalog.locations.find((place) => place.id === id);
    if (!place) return;
    currentURL = locationURL(location.href, id);
    const matrix = qrMatrix(currentURL),
      canvas = $("qr-canvas"),
      size = matrix.length + 8,
      cell = 6;
    canvas.width = canvas.height = size * cell;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    matrix.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) ctx.fillRect((x + 4) * cell, (y + 4) * cell, cell, cell);
      }),
    );
    $("qr-name").textContent = place.name;
    $("qr-link").href = currentURL;
    $("qr-link").textContent = currentURL;
    $("qr-dialog").showModal();
  }
  $("qr-print").onclick = () => window.print();
  $("qr-close").onclick = () => $("qr-dialog").close();
  $("qr-download").onclick = () => {
    const link = document.createElement("a");
    link.download = "findmystuff-location-qr.png";
    link.href = $("qr-canvas").toDataURL("image/png");
    link.click();
  };
  return { open };
}
