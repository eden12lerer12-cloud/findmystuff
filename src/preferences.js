// Optional UI preferences only. Inventory belongs in IndexedDB.
export function preference(key, fallback = null) {
  try {
    return localStorage.getItem(`findmystuff-${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key, value) {
  try {
    localStorage.setItem(`findmystuff-${key}`, value);
  } catch {
    /* Optional. */
  }
}
export function recentLocations(raw, catalog) {
  try {
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids)
      ? [
          ...new Set(
            ids.filter(
              (id) =>
                typeof id === "string" &&
                catalog.locations.some((p) => p.id === id),
            ),
          ),
        ].slice(0, 6)
      : [];
  } catch {
    return [];
  }
}
export function clearPreferences() {
  for (const key of ["language", "theme", "onboarding", "recent-locations"]) {
    try {
      localStorage.removeItem(`findmystuff-${key}`);
    } catch {
      /* Optional. */
    }
  }
}
