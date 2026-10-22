import { BACKUP_LIMITS } from "./limits.js";

export function setupBackups({ t, toast, onChanged }) {
  const $ = (id) => document.getElementById(id);
  let worker = null,
    state = "idle";
  function reset() {
    worker?.terminate();
    worker = null;
    state = "idle";
    $("export").disabled = false;
    $("import").disabled = false;
    $("backup-progress").close();
    $("backup-dialog").close();
    $("import-file").value = "";
  }
  function report(code) {
    reset();
    toast(
      t(
        [
          "backupTooLarge",
          "backupTooMany",
          "storageQuota",
          "backupUnsupported",
        ].includes(code)
          ? code
          : "backupInvalid",
      ),
    );
  }
  function begin(action, payload = {}) {
    reset();
    if (typeof Worker === "undefined") {
      report("backupUnsupported");
      return;
    }
    state = "working";
    $("export").disabled = true;
    $("import").disabled = true;
    $("backup-progress-message").textContent = t(
      action === "export" ? "backupPreparing" : "backupValidating",
    );
    $("backup-progress-cancel").disabled = false;
    $("backup-progress").showModal();
    try {
      worker = new Worker(new URL("./backup-worker.js", import.meta.url), {
        type: "module",
      });
    } catch {
      report("backupUnsupported");
      return;
    }
    worker.onerror = () => report("backupInvalid");
    worker.onmessage = async ({ data }) => {
      if (data.type === "error") {
        report(data.code);
        return;
      }
      if (data.type === "preview") {
        state = "preview";
        $("backup-progress").close();
        $("replace-import").checked = false;
        $("backup-summary").textContent =
          t("backupPreview", data.summary) + " " + t("importCatalogNotice");
        $("backup-dialog").showModal();
      } else if (data.type === "exported") {
        const url = URL.createObjectURL(data.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `findmystuff-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        reset();
        toast(t("backupSaved"));
      } else if (data.type === "imported") {
        reset();
        await onChanged();
        toast(t("backupImported", data.result));
      }
    };
    worker.postMessage({ action, ...payload });
  }
  $("export").onclick = () => begin("export");
  $("import").onclick = () => $("import-file").click();
  $("import-file").onchange = () => {
    const file = $("import-file").files[0];
    if (!file) return;
    if (file.size > BACKUP_LIMITS.maxBytes) {
      report("backupTooLarge");
      return;
    }
    begin("prepare", { file });
  };
  $("backup-progress-cancel").onclick = () => {
    if (state !== "committing") reset();
  };
  $("backup-progress").addEventListener("cancel", (event) => {
    if (state === "committing") event.preventDefault();
    else reset();
  });
  $("cancel-import").onclick = reset;
  $("backup-dialog").addEventListener("cancel", () => reset());
  $("confirm-import").onclick = () => {
    if (state !== "preview" || !worker) return;
    state = "committing";
    $("backup-dialog").close();
    $("backup-progress-message").textContent = t("backupRestoring");
    $("backup-progress-cancel").disabled = true;
    $("backup-progress").showModal();
    worker.postMessage({
      action: "commit",
      replace: $("replace-import").checked,
    });
  };
}
