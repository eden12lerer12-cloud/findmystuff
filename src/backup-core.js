import { BACKUP_LIMITS } from "./limits.js";
import { parseBackupBundle, validateBackupObject } from "./model.js";

export class BackupError extends Error {
  constructor(code) {
    super(code);
    this.name = "BackupError";
    this.code = code;
  }
}
export function createBackup(state, limits = BACKUP_LIMITS) {
  if (!Array.isArray(state.items) || state.items.length > limits.maxItems)
    throw new BackupError("backupTooMany");
  const data = validateBackupObject({
    app: "where-did-i-put-it",
    version: 4,
    ...state,
  });
  const prefix =
    JSON.stringify({
      app: "where-did-i-put-it",
      version: 4,
      exportedAt: new Date().toISOString(),
      catalog: data.catalog,
    }).slice(0, -1) + ',"items":[';
  const parts = [prefix];
  const encoder = new TextEncoder();
  let size = encoder.encode(prefix).length + 2;
  if (size > limits.maxBytes) throw new BackupError("backupTooLarge");
  for (const [index, item] of data.items.entries()) {
    const text = (index ? "," : "") + JSON.stringify(item);
    size += encoder.encode(text).length;
    if (size > limits.maxBytes) throw new BackupError("backupTooLarge");
    parts.push(text);
  }
  parts.push("]}");
  const blob = new Blob(parts, { type: "application/json" });
  if (blob.size > limits.maxBytes) throw new BackupError("backupTooLarge");
  return blob;
}
export async function readBackup(file, limits = BACKUP_LIMITS) {
  if (file.size > limits.maxBytes) throw new BackupError("backupTooLarge");
  const bundle = parseBackupBundle(await file.text());
  if (bundle.items.length > limits.maxItems)
    throw new BackupError("backupTooMany");
  return bundle;
}
export function importPreview(bundle, existingIds) {
  const ids = new Set(existingIds);
  const existing = bundle.items.filter((item) => ids.has(item.id)).length;
  return {
    total: bundle.items.length,
    existing,
    newItems: bundle.items.length - existing,
  };
}
