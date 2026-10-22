import { saveCollection, deleteCollection } from "./store.js";
import { itemPlace, resolveLocation } from "./locations.js";
export function setupCollections({ getState, t, onChange, onView, openQR }) {
  const $ = (id) => document.getElementById(id);
  let currentId = "",
    editGeneration = "initial",
    filter = "";
  function button(text, action) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "text-button";
    el.textContent = text;
    el.onclick = action;
    return el;
  }
  function showError(error) {
    console.error(error);
    $("collections-error").textContent = t("collectionError");
  }
  async function persist(group) {
    try {
      await saveCollection(group, editGeneration);
      await onChange();
      render();
    } catch (error) {
      showError(error);
    }
  }
  function render() {
    if (!$("collections-dialog").open) return;
    const { catalog, items } = getState();
    const select = $("collection-select");
    select.replaceChildren();
    for (const group of catalog.collections) {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      select.append(option);
    }
    if (!catalog.collections.some((group) => group.id === currentId))
      currentId = catalog.collections[0]?.id ?? "";
    select.value = currentId;
    const group = catalog.collections.find((group) => group.id === currentId);
    $("collection-controls").hidden = !group;
    $("collection-entry-list").replaceChildren();
    $("collection-candidates").replaceChildren();
    if (!group) return;
    $("collection-description").textContent = t(
      group.kind === "moving" ? "movingHelp" : "collectionHelp",
    );
    $("collection-count").textContent =
      group.kind === "moving"
        ? t("packedCount", {
            packed: group.entries.filter((e) => e.packed).length,
            total: group.entries.length,
          })
        : t("memberCount", { count: group.entries.length });
    for (const entry of group.entries) {
      const item = items.find((item) => item.id === entry.itemId),
        row = document.createElement("div");
      row.className = "collection-entry";
      const title = document.createElement("strong");
      title.textContent = item?.name ?? t("missingMember");
      row.append(title);
      if (item) {
        const place = itemPlace(item, catalog),
          text = document.createElement("p");
        text.className = "field-help";
        text.textContent = [place.room, place.location]
          .filter(Boolean)
          .join(" › ");
        row.append(
          text,
          button(t("viewDetails"), () => onView(item)),
        );
      }
      if (group.kind === "moving") {
        const box = document.createElement("select");
        box.setAttribute(
          "aria-label",
          t("packingBox", { name: item?.name ?? t("missingMember") }),
        );
        const none = document.createElement("option");
        none.value = "";
        none.textContent = t("chooseBox");
        box.append(none);
        if (entry.boxName && !entry.boxId) {
          const option = document.createElement("option");
          option.value = "__previous__";
          option.textContent = entry.boxName;
          box.append(option);
        }
        for (const node of catalog.locations.filter((p) => p.kind === "box")) {
          const option = document.createElement("option");
          option.value = node.id;
          option.textContent = resolveLocation(catalog, node.id).location;
          box.append(option);
        }
        box.value = entry.boxId ?? (entry.boxName ? "__previous__" : "");
        box.onchange = () => {
          const next = { ...entry };
          delete next.boxId;
          delete next.boxName;
          if (box.value === "__previous__") next.boxName = entry.boxName;
          else if (box.value) {
            next.boxId = box.value;
            next.boxName = resolveLocation(catalog, box.value).location;
          }
          if (!box.value) next.packed = false;
          persist({
            ...group,
            entries: group.entries.map((e) =>
              e.itemId === entry.itemId ? next : e,
            ),
          });
        };
        const label = document.createElement("label");
        label.className = "check-label";
        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = entry.packed;
        check.disabled = !entry.boxId && !entry.boxName;
        check.onchange = () =>
          persist({
            ...group,
            entries: group.entries.map((e) =>
              e.itemId === entry.itemId ? { ...e, packed: check.checked } : e,
            ),
          });
        label.append(
          check,
          document.createTextNode(
            t("packedNamed", { name: item?.name ?? t("missingMember") }),
          ),
        );
        row.append(box, label);
        if (entry.boxId)
          row.append(button(t("qrTitle"), () => openQR(entry.boxId)));
      }
      row.append(
        button(t("removeMember"), () =>
          persist({
            ...group,
            entries: group.entries.filter((e) => e.itemId !== entry.itemId),
          }),
        ),
      );
      $("collection-entry-list").append(row);
    }
    const candidates = items
      .filter(
        (item) =>
          !group.entries.some((e) => e.itemId === item.id) &&
          item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
      )
      .slice(0, 30);
    for (const item of candidates)
      $("collection-candidates").append(
        button(t("addMember", { name: item.name }), () =>
          persist({
            ...group,
            entries: [
              ...group.entries,
              {
                itemId: item.id,
                ...(group.kind === "moving" ? { packed: false } : {}),
              },
            ],
          }),
        ),
      );
  }
  $("open-collections").onclick = () => {
    editGeneration = getState().generation;
    $("collections-error").textContent = "";
    $("collections-dialog").showModal();
    render();
  };
  $("collections-close").onclick = () => $("collections-dialog").close();
  $("collection-select").onchange = () => {
    $("collection-delete-confirm").hidden = true;
    currentId = $("collection-select").value;
    render();
  };
  $("collection-search").oninput = () => {
    filter = $("collection-search").value;
    render();
  };
  $("collection-create").onsubmit = async (event) => {
    event.preventDefault();
    const name = $("collection-name").value,
      kind = $("collection-kind").value;
    currentId = `group-${crypto.randomUUID()}`;
    await persist({ id: currentId, name, kind, entries: [] });
    $("collection-name").value = "";
  };
  $("collection-delete").onclick = () => {
    $("collection-delete-confirm").hidden = false;
  };
  $("collection-delete-cancel").onclick = () => {
    $("collection-delete-confirm").hidden = true;
  };
  $("collection-delete-yes").onclick = async () => {
    try {
      await deleteCollection(currentId, editGeneration);
      await onChange();
      $("collection-delete-confirm").hidden = true;
      render();
    } catch (error) {
      showError(error);
    }
  };
  return {
    render,
    reset() {
      currentId = "";
      filter = "";
      $("collection-delete-confirm").hidden = true;
    },
  };
}
