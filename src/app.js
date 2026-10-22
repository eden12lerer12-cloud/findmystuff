import {
  categories,
  defaultCatalog,
  filterItems,
  validateItem,
} from "./model.js";
import { snapshot, mutate, eraseAll } from "./store.js";
import { applyTranslations, translate } from "./i18n.js";
import { createCatalogManager } from "./catalog-ui.js";
import { setupBackups } from "./backup-ui.js";
import { setupHome } from "./home-ui.js";
import { itemPlace, resolveLocation, isInLocation } from "./locations.js";
import {
  preference,
  savePreference,
  recentLocations,
  clearPreferences,
} from "./preferences.js";
const $ = (id) => document.getElementById(id);
let language = "he";
try {
  if (localStorage.getItem("findmystuff-language") === "en") language = "en";
} catch {
  /* Language storage is optional. */
}
const t = (key, params) => translate(language, key, params);
function setupEditorLayout() {
  const content = document.querySelector("#item-form .form-content");
  content.prepend(
    $("item-name").closest("label"),
    $("item-location-id").closest("label"),
    $("item-location").closest("label"),
  );
  const advanced = document.createElement("details");
  advanced.id = "advanced-fields";
  advanced.className = "advanced-fields";
  const summary = document.createElement("summary");
  summary.dataset.i18n = "additionalDetails";
  advanced.append(
    summary,
    $("photo-picker"),
    $("remove-photo"),
    $("item-notes").closest("label"),
  );
  content.append(advanced, $("form-error"));
}
setupEditorLayout();
function applyLanguage() {
  applyTranslations(document, language);
  $("language-switch").textContent = language === "he" ? "English" : "עברית";
  $("language-switch").lang = language === "he" ? "en" : "he";
  $("language-switch").setAttribute(
    "aria-label",
    language === "he" ? "Switch to English" : "מעבר לעברית",
  );
  renderCatalogOptions();
}
let items = [],
  catalog = defaultCatalog(),
  room = "",
  editingId = null,
  image = "",
  deletedItem = null,
  imageBusy = false,
  ready = false,
  editorSession = 0;
let previousCategory = "general",
  legacyCategoryLabel = null,
  viewingId = null;
let selectedLocationId = "",
  generation = "initial",
  editorGeneration = "initial",
  visibleLimit = 36;
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("where-did-i-put-it")
    : null;
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}
function categoryName(id) {
  const preset = catalog.categories.find((p) => p.id === id);
  return Object.hasOwn(categories, id)
    ? t(`category_${id}`)
    : (preset?.name ?? t("category_general"));
}
function categoryIcon(id) {
  return Object.hasOwn(categories, id) ? categories[id][0] : "🏷️";
}
function renderCatalogOptions() {
  for (const id of ["category", "item-category"]) {
    const previous = $(id).value;
    const options = catalog.categories.map((preset) => {
      const option = node(
        "option",
        "",
        `${categoryIcon(preset.id)} ${categoryName(preset.id)}`,
      );
      option.value = preset.id;
      return option;
    });
    const special = node(
      "option",
      "",
      t(id === "category" ? "allCategories" : "addCategory"),
    );
    special.value = id === "category" ? "" : "__add__";
    $(id).replaceChildren(
      ...(id === "category" ? [special, ...options] : [...options, special]),
    );
    $(id).value = catalog.categories.some((p) => p.id === previous)
      ? previous
      : id === "category"
        ? ""
        : "general";
  }
  $("location-options").replaceChildren(
    ...catalog.locations.map((preset) => {
      const option = node("option");
      option.value = preset.name;
      return option;
    }),
  );
  previousCategory = $("item-category").value;
  const previousPlace = $("item-location-id").value;
  const manual = node("option", "", t("manualLocation"));
  manual.value = "";
  $("item-location-id").replaceChildren(
    manual,
    ...catalog.locations.map((preset) => {
      const path = resolveLocation(catalog, preset.id);
      const option = node(
        "option",
        "",
        [path.room, path.location].filter(Boolean).join(" › "),
      );
      option.value = preset.id;
      return option;
    }),
  );
  $("item-location-id").value = catalog.locations.some(
    (place) => place.id === previousPlace,
  )
    ? previousPlace
    : "";
}
const catalogManager = createCatalogManager({
  getState: () => ({ items, catalog }),
  t,
  label: (preset, type) =>
    type === "categories" ? categoryName(preset.id) : preset.name,
  onChange: async () => {
    await refresh();
    channel?.postMessage("changed");
  },
  onCreated: (type, preset) => {
    if (!$("editor").open) return;
    if (type === "categories") {
      $("item-category").value = preset.id;
      previousCategory = preset.id;
      legacyCategoryLabel = null;
    } else if (type === "rooms") $("item-room").value = preset.name;
    else {
      $("item-location-id").value = preset.id;
      selectLocation();
    }
  },
});
const homeUI = setupHome({
  getState: () => ({ items, catalog }),
  t,
  onChange: async () => {
    await refresh();
    channel?.postMessage("changed");
  },
  onFilter: (filter) => {
    resetFilters();
    room = filter.room ?? "";
    selectedLocationId = filter.locationId ?? "";
    rememberLocation(selectedLocationId);
    render();
  },
  addRoom: () => catalogManager.open("rooms"),
});
function selectLocation() {
  const id = $("item-location-id").value;
  $("item-room").readOnly = false;
  $("item-location").readOnly = !!id;
  if (id) {
    const place = resolveLocation(catalog, id);
    $("item-location").value = place.location;
    if (place.room) {
      $("item-room").value = place.room;
      $("item-room").readOnly = true;
    }
  }
}
$("item-location-id").onchange = selectLocation;
$("item-category").addEventListener("change", () => {
  if ($("item-category").value === "__add__") {
    $("item-category").value = previousCategory;
    catalogManager.open("categories", true);
  } else {
    previousCategory = $("item-category").value;
    legacyCategoryLabel = null;
  }
});
function toast(text, undo = false) {
  $("toast-text").textContent = text;
  $("undo").hidden = !undo;
  $("toast").hidden = false;
}
function fail(error) {
  console.error(error);
  toast(t("storageError"));
}
async function refresh() {
  const state = await snapshot();
  if (generation !== state.generation) resetPrivateUI();
  ({ items, catalog, generation } = state);
  render();
}
async function saveChanges(changes, removedId, importedCatalog) {
  await mutate(changes, removedId, importedCatalog, {
    expectedGeneration: $("editor").open ? editorGeneration : generation,
  });
  await refresh();
  channel?.postMessage("changed");
}
function resetFilters() {
  visibleLimit = 36;
  room = "";
  selectedLocationId = "";
  $("search").value = "";
  $("category").value = "";
  render();
}
function render() {
  if (
    selectedLocationId &&
    !catalog.locations.some((node) => node.id === selectedLocationId)
  )
    selectedLocationId = "";
  renderCatalogOptions();
  catalogManager.render();
  homeUI.render();
  const rooms = [
    ...new Set([
      ...items.map((i) => itemPlace(i, catalog).room),
      ...catalog.rooms.map((p) => p.name),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, language));
  if (room && !rooms.includes(room)) room = "";
  $("rooms").replaceChildren();
  for (const value of ["", ...rooms]) {
    const button = node("button", "chip", value || t("all"));
    button.type = "button";
    button.setAttribute("aria-pressed", String(room === value));
    button.onclick = () => {
      visibleLimit = 36;
      room = value;
      selectedLocationId = "";
      render();
    };
    $("rooms").append(button);
  }
  $("room-options").replaceChildren(
    ...rooms.map((value) => {
      const option = node("option");
      option.value = value;
      return option;
    }),
  );
  $("total").textContent = items.length;
  $("hero-add").textContent = t(items.length ? "heroMore" : "heroAdd");
  const filtered = filterItems(
    items,
    $("search").value,
    room,
    $("category").value,
    $("sort").value,
    catalog,
  ).filter(
    (item) =>
      !selectedLocationId || isInLocation(item, selectedLocationId, catalog),
  );
  $("empty").hidden = items.length !== 0;
  $("no-results").hidden = !items.length || filtered.length !== 0;
  $("results-label").textContent = items.length
    ? `${t(filtered.length === 1 ? "itemCountOne" : "itemCount", { count: filtered.length })}${room ? ` · ${room}` : ""}${selectedLocationId ? " · " + resolveLocation(catalog, selectedLocationId).location : ""}`
    : "";
  $("items").replaceChildren(...filtered.slice(0, visibleLimit).map(itemCard));
  $("show-more").hidden = filtered.length <= visibleLimit;
  $("showing").textContent =
    filtered.length > 36
      ? t("showing", {
          shown: Math.min(visibleLimit, filtered.length),
          total: filtered.length,
        })
      : "";
  renderRecent();
  if ($("item-details").open) {
    const current = items.find((i) => i.id === viewingId);
    if (current) renderDetails(current);
    else $("item-details").close();
  }
}
function itemCard(item) {
  const place = itemPlace(item, catalog);
  const article = node("article", "item-card");
  const open = node("button", "item-open");
  open.type = "button";
  open.setAttribute("aria-label", t("viewItem", { name: item.name }));
  open.onclick = () => openDetails(item);
  article.append(open);
  const visual = node("div", "item-visual");
  visual.dataset.category = item.category;
  if (item.image) {
    const photo = node("img", "item-photo");
    photo.src = item.image;
    photo.alt = item.name;
    photo.loading = "lazy";
    visual.append(photo);
  } else {
    const emoji = node("span", "", categoryIcon(item.category));
    emoji.setAttribute("aria-hidden", "true");
    visual.append(emoji);
  }
  visual.append(
    node(
      "span",
      "item-category",
      item.categoryLabel || categoryName(item.category),
    ),
  );
  const body = node("div", "item-body");
  body.append(node("h3", "", item.name));
  body.append(node("p", "last-recorded", t("lastRecorded")));
  const location = node("div", "location");
  const icon = node("span", "location-icon", "⌖");
  icon.setAttribute("aria-hidden", "true");
  const address = node("div");
  address.append(
    node("strong", "", place.room || t("roomNotSpecified")),
    node("span", "", place.location),
  );
  location.append(icon, address);
  body.append(location);
  if (item.notes) body.append(node("p", "notes", item.notes));
  const recorded = node(
    "time",
    "updated",
    t("recordedAt", {
      date: new Date(
        item.locationRecordedAt ?? item.updatedAt,
      ).toLocaleDateString(language === "he" ? "he-IL" : "en-US"),
    }),
  );
  recorded.dateTime = item.locationRecordedAt ?? item.updatedAt;
  recorded.title = new Date(
    item.locationRecordedAt ?? item.updatedAt,
  ).toLocaleString(language === "he" ? "he-IL" : "en-US");
  const footer = node("div", "card-footer");
  footer.append(recorded);
  const edit = node("button", "", t("edit"));
  edit.setAttribute("aria-label", t("editItem", { name: item.name }));
  edit.onclick = () => openEditor(item);
  const remove = node("button", "delete", t("delete"));
  remove.setAttribute("aria-label", t("deleteItem", { name: item.name }));
  remove.onclick = () => deleteRecord(item);
  footer.append(edit, remove);
  body.append(footer);
  article.append(visual, body);
  return article;
}
async function deleteRecord(item) {
  try {
    await saveChanges([], item.id);
    deletedItem = item;
    toast(t("deleted"), true);
  } catch (error) {
    fail(error);
  }
}
function renderDetails(item) {
  const place = itemPlace(item, catalog);
  $("item-details-title").textContent = item.name;
  const content = $("details-content");
  content.replaceChildren();
  if (item.image) {
    const img = node("img", "details-photo");
    img.src = item.image;
    img.alt = item.name;
    content.append(img);
  } else {
    const symbol = node(
      "div",
      "details-placeholder",
      categoryIcon(item.category),
    );
    symbol.setAttribute("aria-hidden", "true");
    content.append(symbol);
  }
  content.append(node("p", "last-recorded", t("lastRecorded")));
  const list = node("dl", "details-list");
  for (const [key, value] of [
    ["room", place.room || t("roomNotSpecified")],
    ["location", place.location],
    ["category", item.categoryLabel || categoryName(item.category)],
    ["notes", item.notes],
  ]) {
    if (!value) continue;
    const term = node("dt", "", t(key));
    const description = node("dd", "", value);
    description.dir = "auto";
    list.append(term, description);
  }
  content.append(
    list,
    node(
      "p",
      "field-help",
      t("recordedAt", {
        date: new Date(
          item.locationRecordedAt ?? item.updatedAt,
        ).toLocaleString(language === "he" ? "he-IL" : "en-US"),
      }),
    ),
    node("p", "field-help", t("accuracy")),
  );
  const history = node("details", "history");
  history.append(node("summary", "", t("locationHistory")));
  const listHistory = node("ol");
  for (const entry of [
    ...(item.history ?? [
      {
        room: item.room,
        location: item.location,
        recordedAt: item.locationRecordedAt ?? item.updatedAt,
      },
    ]),
  ].reverse()) {
    const row = node("li");
    row.append(
      node(
        "strong",
        "",
        [entry.room, entry.location].filter(Boolean).join(" › "),
      ),
      node(
        "p",
        "field-help",
        new Date(entry.recordedAt).toLocaleString(
          language === "he" ? "he-IL" : "en-US",
        ),
      ),
    );
    listHistory.append(row);
  }
  history.append(listHistory);
  content.append(history);
}
function openDetails(item) {
  rememberLocation(item.locationId);
  viewingId = item.id;
  renderDetails(item);
  $("item-details").showModal();
}
for (const id of ["details-close", "details-done"])
  $(id).onclick = () => $("item-details").close();
$("item-details").addEventListener("close", () => {
  viewingId = null;
});
$("details-edit").onclick = () => {
  const item = items.find((i) => i.id === viewingId);
  $("item-details").close();
  if (item) openEditor(item);
};
$("details-delete").onclick = async () => {
  const item = items.find((i) => i.id === viewingId);
  if (item) await deleteRecord(item);
};
function updatePhoto() {
  $("photo-preview").hidden = !image;
  $("photo-preview").src = image || "";
  $("photo-hint").hidden = !!image;
  $("remove-photo").hidden = !image;
}
function openEditor(item) {
  if (!ready) {
    toast(t("notReady"));
    return;
  }
  editorSession++;
  editorGeneration = generation;
  $("item-form").reset();
  renderCatalogOptions();
  $("form-error").textContent = "";
  editingId = item?.id ?? null;
  image = item?.image ?? "";
  $("advanced-fields").open = !!(item?.image || item?.notes);
  imageBusy = false;
  $("save-item").disabled = false;
  $("photo").disabled = false;
  $("editor-title").textContent = t(item ? "editTitle" : "editorTitle");
  if (item)
    for (const name of ["name", "room", "location", "category", "notes"])
      $(`item-${name}`).value = item[name];
  previousCategory = $("item-category").value;
  legacyCategoryLabel = item?.categoryLabel ?? null;
  $("item-location-id").value = item?.locationId ?? "";
  selectLocation();
  updatePhoto();
  $("editor").showModal();
  $("item-name").focus();
}
for (const id of ["hero-add", "add-item", "empty-add"])
  $(id).onclick = () => openEditor();
for (const id of ["close-editor", "cancel-editor"])
  $(id).onclick = () => $("editor").close();
let searchTimer;
$("search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  visibleLimit = 36;
  searchTimer = setTimeout(render, 100);
});
for (const id of ["category", "sort"])
  $(id).addEventListener("change", () => {
    visibleLimit = 36;
    render();
  });
$("show-more").onclick = () => {
  visibleLimit += 36;
  render();
};
$("clear-filters").onclick = resetFilters;
$("item-form").onsubmit = async (event) => {
  event.preventDefault();
  if (imageBusy) return;
  $("save-item").disabled = true;
  $("form-error").textContent = "";
  try {
    const item = validateItem(
      {
        id: editingId ?? crypto.randomUUID(),
        name: $("item-name").value,
        room: $("item-room").value,
        location: $("item-location").value,
        ...($("item-location-id").value
          ? { locationId: $("item-location-id").value }
          : {}),
        category: $("item-category").value,
        ...(legacyCategoryLabel && $("item-category").value === "general"
          ? { categoryLabel: legacyCategoryLabel }
          : {}),
        notes: $("item-notes").value,
        image,
        updatedAt: new Date().toISOString(),
      },
      catalog,
    );
    await saveChanges([item]);
    resetFilters();
    $("editor").close();
    toast(t(editingId ? "edited" : "saved"));
  } catch (error) {
    console.error(error);
    $("form-error").textContent = t("saveError");
  } finally {
    $("save-item").disabled = false;
  }
};
async function compressedPhoto(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error(t("photoFormatError"));
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    try {
      await photo.decode();
    } catch {
      throw new Error(t("photoReadError"));
    }
    if (photo.naturalWidth * photo.naturalHeight > 50000000)
      throw new Error(t("photoSizeError"));
    const ratio = Math.min(
      1,
      1200 / Math.max(photo.naturalWidth, photo.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.8);
    if (data.length > 2000000) throw new Error(t("photoSizeError"));
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
$("photo").onchange = async () => {
  const file = $("photo").files[0];
  if (!file) return;
  const session = editorSession;
  imageBusy = true;
  $("save-item").disabled = true;
  $("photo").disabled = true;
  $("form-error").textContent = "";
  try {
    const result = await compressedPhoto(file);
    if (session === editorSession) {
      image = result;
      updatePhoto();
    }
  } catch (error) {
    if (session === editorSession) $("form-error").textContent = error.message;
  } finally {
    if (session === editorSession) {
      imageBusy = false;
      $("save-item").disabled = false;
      $("photo").disabled = false;
      $("photo").value = "";
    }
  }
};
$("remove-photo").onclick = () => {
  image = "";
  updatePhoto();
};
$("undo").onclick = async () => {
  if (!deletedItem) return;
  try {
    await saveChanges([
      {
        ...deletedItem,
        category: catalog.categories.some((p) => p.id === deletedItem.category)
          ? deletedItem.category
          : "general",
      },
    ]);
    deletedItem = null;
    toast(t("restored"));
  } catch (error) {
    fail(error);
  }
};
$("demo").onclick = async () => {
  if (!ready || items.length) return;
  const examples =
    language === "he"
      ? [
          ["מפתח רזרבי", "כניסה לבית", "בקופסה הכחולה, במגירה העליונה", "keys"],
          ["דרכון", "חדר שינה", "בארון, בתיקיית המסמכים הירוקה", "documents"],
          ["אוזניות", "סלון", "בסלסילה שעל המדף ליד הספה", "electronics"],
        ]
      : [
          ["Spare key", "Entrance", "Top drawer, inside the blue box", "keys"],
          [
            "Passport",
            "Bedroom",
            "Closet, inside the green document folder",
            "documents",
          ],
          [
            "Headphones",
            "Living room",
            "Basket on the shelf by the sofa",
            "electronics",
          ],
        ];
  try {
    await saveChanges(
      examples.map(([name, room, location, category]) => ({
        id: crypto.randomUUID(),
        name,
        room,
        location,
        category: catalog.categories.some((p) => p.id === category)
          ? category
          : "general",
        notes: t("demoNote"),
        image: "",
        updatedAt: new Date().toISOString(),
      })),
    );
    toast(t("demoAdded"));
  } catch (error) {
    fail(error);
  }
};
const backups = setupBackups({
  t,
  toast,
  onChanged: async () => {
    await refresh();
    resetFilters();
    channel?.postMessage("changed");
  },
});
$("language-switch").onclick = () => {
  language = language === "he" ? "en" : "he";
  try {
    localStorage.setItem("findmystuff-language", language);
  } catch {
    /* App works without preference persistence. */
  }
  applyLanguage();
  render();
  $("toast").hidden = true;
};
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) &&
    !$("editor").open &&
    !$("backup-dialog").open &&
    !$("catalog-dialog").open &&
    !$("item-details").open &&
    !$("backup-progress").open &&
    !$("home-dialog").open &&
    !document.querySelector("dialog[open]")
  ) {
    event.preventDefault();
    $("search").focus();
  }
});
if (channel)
  channel.onmessage = ({ data }) => {
    if (data === "erased") resetPrivateUI();
    refresh().catch(fail);
  };
window.addEventListener("focus", () => {
  if (ready) refresh().catch(fail);
});
function rememberLocation(id) {
  if (!id) return;
  const ids = recentLocations(preference("recent-locations"), catalog);
  savePreference(
    "recent-locations",
    JSON.stringify([id, ...ids.filter((value) => value !== id)].slice(0, 6)),
  );
  renderRecent();
}
function renderRecent() {
  const ids = recentLocations(preference("recent-locations"), catalog);
  $("recent-places").hidden = !ids.length;
  $("recent-place-list").replaceChildren(
    ...ids.map((id) => {
      const place = resolveLocation(catalog, id);
      const button = node(
        "button",
        "chip",
        [place.room, place.location].filter(Boolean).join(" › "),
      );
      button.onclick = () => {
        resetFilters();
        selectedLocationId = id;
        rememberLocation(id);
        render();
      };
      return button;
    }),
  );
}
function resetPrivateUI() {
  backups.cancel();
  clearTimeout(searchTimer);
  editorSession++;
  deletedItem = null;
  image = "";
  editingId = null;
  viewingId = null;
  for (const form of document.querySelectorAll("form")) form.reset();
  for (const id of ["details-content", "home-tree", "preset-list"])
    $(id).replaceChildren();
  updatePhoto();
  $("toast").hidden = true;
  for (const dialog of document.querySelectorAll("dialog[open]"))
    dialog.close();
  $("search").value = "";
  room = "";
  selectedLocationId = "";
  visibleLimit = 36;
  savePreference("recent-locations", "[]");
}
$("theme").value = preference("theme", "system");
if (!["system", "light", "dark"].includes($("theme").value))
  $("theme").value = "system";
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  document.documentElement.dataset.theme =
    $("theme").value === "system"
      ? systemTheme.matches
        ? "dark"
        : "light"
      : $("theme").value;
}
systemTheme.addEventListener("change", applyTheme);
$("theme").onchange = () => {
  savePreference("theme", $("theme").value);
  applyTheme();
};
applyTheme();
$("open-guide").onclick = () => $("guide-dialog").showModal();
for (const id of ["guide-done", "guide-skip"])
  $(id).onclick = () => {
    savePreference("onboarding", "done");
    $("guide-dialog").close();
  };
$("guide-dialog").addEventListener("cancel", () =>
  savePreference("onboarding", "done"),
);
$("open-feedback").onclick = () => $("feedback-dialog").showModal();
$("feedback-close").onclick = () => $("feedback-dialog").close();
$("open-erase").onclick = () => {
  $("erase-form").reset();
  $("erase-error").textContent = "";
  $("erase-dialog").showModal();
};
$("erase-cancel").onclick = () => $("erase-dialog").close();
$("erase-form").onsubmit = async (event) => {
  event.preventDefault();
  if (!$("erase-check").checked) return;
  $("erase-confirm").disabled = true;
  try {
    backups.cancel();
    await eraseAll();
    resetPrivateUI();
    clearPreferences();
    channel?.postMessage("erased");
    await refresh();
    toast(t("erased"));
  } catch (error) {
    console.error(error);
    $("erase-error").textContent = t("storageError");
  } finally {
    $("erase-confirm").disabled = false;
  }
};
applyLanguage();
try {
  await refresh();
  ready = true;
  if (!items.length && preference("onboarding") !== "done")
    $("guide-dialog").showModal();
} catch (error) {
  render();
  fail(error);
}
