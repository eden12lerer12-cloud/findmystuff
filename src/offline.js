export function setupOffline({ t }) {
  if (
    !("serviceWorker" in navigator) ||
    !document.querySelector("meta[name=offline-build]")
  )
    return;
  navigator.serviceWorker
    .register(new URL("../sw.js", import.meta.url), {
      scope: new URL("../", import.meta.url).href,
      type: "classic",
    })
    .then((registration) => {
      const note = document.getElementById("offline-status");
      function status() {
        note.textContent = t(
          registration.waiting
            ? "offlineUpdate"
            : navigator.serviceWorker.controller
              ? "offlineReady"
              : "offlinePreparing",
        );
      }
      status();
      navigator.serviceWorker.addEventListener("controllerchange", status);
      registration.addEventListener("updatefound", () =>
        registration.installing?.addEventListener("statechange", status),
      );
      document
        .getElementById("language-switch")
        .addEventListener("click", status);
    })
    .catch(() => {
      document.getElementById("offline-status").textContent =
        t("offlineUnavailable");
    });
}
