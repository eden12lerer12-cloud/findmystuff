export const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "")
    .toLocaleLowerCase("he")
    .trim();
