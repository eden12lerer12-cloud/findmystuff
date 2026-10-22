import { addLocation, renamePlace } from "./store.js";
import { resolveLocation, isInLocation, itemPlace } from "./locations.js";

export function setupHome({ getState, t, onChange, onFilter, addRoom }) {
  const $ = (id) => document.getElementById(id);
  let renaming = null;
  function button(text, callback, className = "text-button", label) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.textContent = text;
    if (label) el.setAttribute("aria-label", label);
    el.onclick = callback;
    return el;
  }
  function rename(type, preset) {
    renaming = { type, id: preset.id };
    $("rename-name").maxLength = type === "rooms" ? 80 : 180;
    $("rename-name").value = preset.name;
    $("rename-error").textContent = "";
    $("rename-dialog").showModal();
    $("rename-name").focus();
  }
  function render() {
    if (!$("home-dialog").open) return;
    const { catalog, items } = getState();
    const parent = $("location-parent"),
      previous = parent.value;
    parent.replaceChildren();
    const option = (value, text) => {
      const el = document.createElement("option");
      el.value = value;
      el.textContent = text;
      parent.append(el);
    };
    option("", t("unassignedPlaces"));
    for (const room of catalog.rooms) option(`room:${room.id}`, room.name);
    for (const place of catalog.locations) {
      const resolved = resolveLocation(catalog, place.id);
      option(
        `location:${place.id}`,
        [resolved.room, resolved.location].filter(Boolean).join(" › "),
      );
    }
    if ([...parent.options].some((o) => o.value === previous))
      parent.value = previous;
    const tree = $("home-tree");
    const expanded = new Set(
      [...tree.querySelectorAll("details[open][data-location-id]")].map(
        (node) => node.dataset.locationId,
      ),
    );
    tree.replaceChildren();
    function branch(place) {
      const details = document.createElement("details");
      details.className = "home-branch";
      details.dataset.locationId = place.id;
      details.open = expanded.has(place.id);
      const summary = document.createElement("summary");
      summary.textContent = place.name;
      details.append(summary);
      const actions = document.createElement("div");
      actions.className = "home-actions";
      const count = items.filter((item) =>
        isInLocation(item, place.id, catalog),
      ).length;
      actions.append(
        button(
          t("showItems", { count }),
          () => {
            onFilter({ locationId: place.id });
            $("home-dialog").close();
          },
          "text-button",
          t("showNamedItems", { name: place.name, count }),
        ),
        button(
          t("rename"),
          () => rename("locations", place),
          "text-button",
          t("renameNamed", { name: place.name }),
        ),
      );
      details.append(actions);
      for (const child of catalog.locations.filter(
        (node) => node.parentId === place.id,
      ))
        details.append(branch(child));
      return details;
    }
    for (const room of catalog.rooms) {
      const section = document.createElement("details");
      section.className = "home-room";
      section.open = true;
      const summary = document.createElement("summary");
      summary.textContent = room.name;
      section.append(summary);
      const actions = document.createElement("div");
      actions.className = "home-actions";
      const count = items.filter(
        (item) => itemPlace(item, catalog).room === room.name,
      ).length;
      actions.append(
        button(
          t("showItems", { count }),
          () => {
            onFilter({ room: room.name });
            $("home-dialog").close();
          },
          "text-button",
          t("showNamedItems", { name: room.name, count }),
        ),
        button(
          t("rename"),
          () => rename("rooms", room),
          "text-button",
          t("renameNamed", { name: room.name }),
        ),
      );
      section.append(actions);
      for (const node of catalog.locations.filter(
        (node) => !node.parentId && node.roomId === room.id,
      ))
        section.append(branch(node));
      tree.append(section);
    }
    const unassigned = catalog.locations.filter(
      (node) => !node.parentId && !node.roomId,
    );
    if (unassigned.length) {
      const heading = document.createElement("h3");
      heading.textContent = t("unassignedPlaces");
      tree.append(heading, ...unassigned.map(branch));
    }
    if (!catalog.rooms.length && !catalog.locations.length) {
      const empty = document.createElement("p");
      empty.className = "field-help";
      empty.textContent = t("homeEmpty");
      tree.append(empty);
    }
  }
  $("open-home").onclick = () => {
    $("home-dialog").showModal();
    render();
  };
  $("home-close").onclick = () => $("home-dialog").close();
  $("home-add-room").onclick = addRoom;
  $("location-form").onsubmit = async (event) => {
    event.preventDefault();
    $("location-save").disabled = true;
    $("home-error").textContent = "";
    try {
      const [type, id] = $("location-parent").value.split(":");
      const node = {
        name: $("location-name").value,
        kind: $("location-kind").value,
      };
      if (id) node[type === "room" ? "roomId" : "parentId"] = id;
      await addLocation(node);
      await onChange();
      $("location-name").value = "";
      render();
    } catch {
      $("home-error").textContent = t("locationError");
    } finally {
      $("location-save").disabled = false;
    }
  };
  $("rename-form").onsubmit = async (event) => {
    event.preventDefault();
    $("rename-save").disabled = true;
    try {
      await renamePlace(renaming.type, renaming.id, $("rename-name").value);
      await onChange();
      $("rename-dialog").close();
      render();
    } catch {
      $("rename-error").textContent = t("locationError");
    } finally {
      $("rename-save").disabled = false;
    }
  };
  $("rename-cancel").onclick = () => $("rename-dialog").close();
  return { render };
}
