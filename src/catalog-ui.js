import { addPreset, removePreset } from "./store.js";
import { normalize } from "./model.js";

export function createCatalogManager({
  getState,
  t,
  label,
  onChange,
  onCreated,
}) {
  const $ = (id) => document.getElementById(id);
  let type = "categories",
    pendingId = null,
    quick = false;
  const keys = {
    categories: ["manageCategories", "categoryHelp", "newCategoryName"],
    locations: ["manageLocations", "locationHelp", "newLocationName"],
    rooms: ["manageRooms", "roomHelp", "newRoomName"],
  };
  const dialog = $("catalog-dialog");
  function render() {
    if (!dialog.open) return;
    const { catalog, items } = getState();
    $("catalog-title").textContent = t(
      quick && type === "categories"
        ? "addCategory"
        : quick && type === "rooms"
          ? "addRoom"
          : keys[type][0],
    );
    $("catalog-help").textContent = t(keys[type][1]);
    $("preset-label").textContent = t(keys[type][2]);
    $("preset-name").maxLength =
      type === "categories" ? 60 : type === "rooms" ? 80 : 180;
    $("preset-list").replaceChildren(
      ...catalog[type].map((preset) => {
        const row = document.createElement("div");
        row.className = "preset-row";
        const name = document.createElement("span");
        name.textContent = label(preset, type);
        name.dir = "auto";
        const count = document.createElement("small");
        const uses = items.filter((item) =>
          type === "categories"
            ? item.category === preset.id && !item.categoryLabel
            : type === "rooms"
              ? item.room === preset.name
              : item.location === preset.name,
        ).length;
        count.textContent = t("presetUses", { count: uses });
        row.append(name, count);
        if (type === "categories" && preset.id === "general") {
          const fallback = document.createElement("small");
          fallback.textContent = t("fallbackCategory");
          row.append(fallback);
        } else {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "text-button";
          button.textContent = t("removePreset");
          button.setAttribute(
            "aria-label",
            t("removeNamedPreset", { name: label(preset, type) }),
          );
          button.onclick = () => {
            pendingId = preset.id;
            $("preset-confirm-message").textContent = t(
              type === "categories"
                ? "confirmCategoryDelete"
                : type === "rooms"
                  ? "confirmRoomDelete"
                  : "confirmLocationDelete",
              { name: label(preset, type), count: uses },
            );
            $("preset-confirm").hidden = false;
            $("preset-confirm-delete").focus();
          };
          row.append(button);
        }
        return row;
      }),
    );
    if (pendingId && !catalog[type].some((preset) => preset.id === pendingId)) {
      pendingId = null;
      $("preset-confirm").hidden = true;
    }
  }
  function open(nextType, quickAdd = false) {
    type = nextType;
    quick = quickAdd;
    pendingId = null;
    $("preset-form").reset();
    $("catalog-error").textContent = "";
    $("catalog-status").textContent = "";
    $("preset-confirm").hidden = true;
    dialog.showModal();
    render();
    $("preset-name").focus();
  }
  $("manage-categories").onclick = () => open("categories");
  $("editor-categories").onclick = () => open("categories", true);
  $("editor-rooms").onclick = () => open("rooms", true);
  for (const id of ["manage-locations", "editor-locations"])
    $(id).onclick = () => open("locations");
  for (const id of ["catalog-close", "catalog-done"])
    $(id).onclick = () => dialog.close();
  $("preset-cancel-delete").onclick = () => {
    pendingId = null;
    $("preset-confirm").hidden = true;
    $("preset-name").focus();
  };
  $("preset-form").onsubmit = async (event) => {
    event.preventDefault();
    $("catalog-error").textContent = "";
    $("preset-add").disabled = true;
    try {
      const name = $("preset-name").value.trim();
      if (
        getState().catalog[type].some(
          (preset) => normalize(label(preset, type)) === normalize(name),
        )
      )
        throw new Error("duplicatePreset");
      const preset = await addPreset(type, name);
      await onChange();
      onCreated(type, preset);
      if (quick) {
        dialog.close();
        return;
      }
      $("preset-name").value = "";
      $("catalog-status").textContent = t("presetAdded");
      $("preset-name").focus();
    } catch (error) {
      $("catalog-error").textContent = t(
        error.message === "duplicatePreset" ? "duplicatePreset" : "presetError",
      );
    } finally {
      $("preset-add").disabled = false;
    }
  };
  $("preset-confirm-delete").onclick = async () => {
    if (!pendingId) return;
    $("preset-confirm-delete").disabled = true;
    $("catalog-error").textContent = "";
    try {
      await removePreset(type, pendingId);
      pendingId = null;
      $("preset-confirm").hidden = true;
      await onChange();
      $("catalog-status").textContent = t("presetRemoved");
      $("preset-name").focus();
    } catch {
      $("catalog-error").textContent = t("presetError");
    } finally {
      $("preset-confirm-delete").disabled = false;
    }
  };
  return { render, open };
}
