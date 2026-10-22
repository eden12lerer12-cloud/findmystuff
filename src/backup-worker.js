import { createBackup, readBackup, importPreview } from "./backup-core.js";
import { snapshot, itemKeys, mutate } from "./store.js";
let prepared, generation;
self.onmessage = async ({ data }) => {
  try {
    if (data.action === "export")
      self.postMessage({
        type: "exported",
        blob: createBackup(await snapshot()),
      });
    else if (data.action === "prepare") {
      generation = (await snapshot()).generation;
      prepared = await readBackup(data.file);
      self.postMessage({
        type: "preview",
        summary: importPreview(prepared, await itemKeys()),
      });
    } else if (data.action === "commit" && prepared) {
      const result = await mutate(prepared.items, undefined, prepared.catalog, {
        skipExisting: !data.replace,
        expectedGeneration: generation,
      });
      prepared = null;
      self.postMessage({ type: "imported", result });
    } else throw new Error("Invalid backup operation");
  } catch (error) {
    self.postMessage({
      type: "error",
      code:
        error.code ??
        (error.name === "QuotaExceededError"
          ? "storageQuota"
          : "backupInvalid"),
    });
  }
};
