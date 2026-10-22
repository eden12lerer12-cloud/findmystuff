let database;
export async function openStore() {
  if (database) return database;
  database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("where-did-i-put-it", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("items", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database is blocked"));
  });
  return database;
}
export async function allItems() {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readonly");
    const request = tx.objectStore("items").getAll();
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}
export async function mutate(items = [], deletedId) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    if (deletedId) store.delete(deletedId);
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}
