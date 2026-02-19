// 🔥 Nether World Companion
// Seed is hard-embedded so Chunkbase always uses YOUR world.

const WORLD = {
  seed: "7604837355593823012",
  platform: "bedrock", // locked to bedrock for your world
};

const LS_KEY = "nether_world_companion_v1";

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.textContent = ""), 2400);
}

function safeNum(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function copyText(text) {
  return navigator.clipboard.writeText(text);
}

function getState() {
  return {
    player: { x: safeNum($("x").value), z: safeNum($("z").value) },
    locations: appState.locations,
    tasks: appState.tasks,
  };
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(getState()));
  toast("Saved ✔");
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    toast("No saved data yet.");
    return;
  }
  try {
    const data = JSON.parse(raw);
    $("x").value = safeNum(data?.player?.x);
    $("z").value = safeNum(data?.player?.z);
    appState.locations = Array.isArray(data?.locations) ? data.locations : [];
    appState.tasks = Array.isArray(data?.tasks) ? data.tasks : [];
    renderLocations();
    renderTasks();
    toast("Loaded ✔");
  } catch {
    toast("Saved data was corrupted.");
  }
}

function resetAll() {
  if (!confirm("Reset everything? This clears saved locations & tasks from your browser.")) return;
  localStorage.removeItem(LS_KEY);
  appState.locations = [];
  appState.tasks = [];
  $("x").value = 0;
  $("z").value = 0;
  $("owX").value = 0;
  $("owZ").value = 0;
  $("resX").value = "";
  $("resZ").value = "";
  $("exportBox").value = "";
  renderLocations();
  renderTasks();
  toast("Reset complete.");
}

// ---------- Chunkbase URL Builder ----------
// This is the part that guarantees every Chunkbase link uses your seed.
function chunkbaseUrl(toolSlug, x, z) {
  // Chunkbase uses "mc-seed-map" for the seed map.
  // For specific tools, they use "/apps/<tool>".
  const base = "https://www.chunkbase.com/apps";
  const seed = encodeURIComponent(WORLD.seed);
  const platform = WORLD.platform; // bedrock

  // If coords are not provided, just open the tool with the seed.
  const hasCoords = Number.isFinite(x) && Number.isFinite(z);

  // NOTE: Chunkbase may treat params slightly differently between tools.
  // These query params work for opening with a seed; coords are included to center when supported.
  const q = new URLSearchParams();
  q.set("seed", WORLD.seed);
  q.set("platform", platform);

  if (hasCoords) {
    q.set("x", String(Math.trunc(x)));
    q.set("z", String(Math.trunc(z)));
  }

  if (toolSlug === "seed-map") {
    // Seed map tool
    return `${base}/seed-map#${q.toString()}`;
  }

  // Other apps
  return `${base}/${toolSlug}#${q.toString()}`;
}

function openChunkbase(toolSlug) {
  const x = safeNum($("x").value);
  const z = safeNum($("z").value);
  const url = chunkbaseUrl(toolSlug, x, z);
  window.open(url, "_blank", "noopener,noreferrer");
}

// ---------- Locations ----------
const appState = {
  selectedLocId: null,
  locations: [],
  tasks: [],
};

function newId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function addLocation() {
  const name = $("locName").value.trim();
  const x = safeNum($("locX").value);
  const z = safeNum($("locZ").value);

  if (!name) {
    toast("Give the location a name.");
    return;
  }

  appState.locations.unshift({ id: newId(), name, x, z, created: Date.now() });
  $("locName").value = "";
  renderLocations();
  toast("Location added.");
}

function clearLocations() {
  if (!confirm("Clear ALL locations?")) return;
  appState.locations = [];
  appState.selectedLocId = null;
  renderLocations();
  toast("Locations cleared.");
}

function selectLocation(id) {
  appState.selectedLocId = id;
  renderLocations();
}

function useSelectedLocationToCoords() {
  const loc = appState.locations.find(l => l.id === appState.selectedLocId);
  if (!loc) {
    toast("Select a location first.");
    return;
  }
  $("x").value = loc.x;
  $("z").value = loc.z;
  toast("Player coords updated from selected location.");
}

function renderLocations() {
  const list = $("locList");
  list.innerHTML = "";

  if (appState.locations.length === 0) {
    const empty = document.createElement("div");
    empty.className = "callout";
    empty.textContent = "No locations yet. Add bases, portals, farms, etc.";
    list.appendChild(empty);
    return;
  }

  for (const loc of appState.locations) {
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.id = loc.id;

    const left = document.createElement("div");
    left.className = "item__left";

    const name = document.createElement("div");
    name.className = "item__name";
    name.textContent = loc.name + (loc.id === appState.selectedLocId ? "  ✓" : "");

    const meta = document.createElement("div");
    meta.className = "item__meta";
    meta.textContent = `X ${loc.x}  Z ${loc.z}`;

    left.appendChild(name);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "item__right";

    const btnSelect = document.createElement("button");
    btnSelect.className = "btn ghost small";
    btnSelect.textContent = "Select";
    btnSelect.onclick = () => selectLocation(loc.id);

    const btnCopy = document.createElement("button");
    btnCopy.className = "btn ghost small";
    btnCopy.textContent = "Copy";
    btnCopy.onclick = async () => {
      await copyText(`${loc.name}: X ${loc.x}, Z ${loc.z}`);
      toast("Copied location.");
    };

    const btnChunk = document.createElement("button");
    btnChunk.className = "btn small";
    btnChunk.textContent = "Open Map";
    btnChunk.onclick = () => {
      // Open seed map centered near that location
      window.open(chunkbaseUrl("seed-map", loc.x, loc.z), "_blank", "noopener,noreferrer");
    };

    const btnDel = document.createElement("button");
    btnDel.className = "btn danger small";
    btnDel.textContent = "Delete";
    btnDel.onclick = () => {
      appState.locations = appState.locations.filter(l => l.id !== loc.id);
      if (appState.selectedLocId === loc.id) appState.selectedLocId = null;
      renderLocations();
      toast("Deleted.");
    };

    right.appendChild(btnSelect);
    right.appendChild(btnCopy);
    right.appendChild(btnChunk);
    right.appendChild(btnDel);

    item.appendChild(left);
    item.appendChild(right);

    list.appendChild(item);
  }
}

// ---------- Tasks ----------
function addTask() {
  const text = $("taskInput").value.trim();
  if (!text) {
    toast("Type a task first.");
    return;
  }
  appState.tasks.unshift({ id: newId(), text, done: false, created: Date.now() });
  $("taskInput").value = "";
  renderTasks();
  toast("Task added.");
}

function clearTasks() {
  if (!confirm("Clear ALL tasks?")) return;
  appState.tasks = [];
  renderTasks();
  toast("Tasks cleared.");
}

function toggleTask(id) {
  const t = appState.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  renderTasks();
}

function deleteTask(id) {
  appState.tasks = appState.tasks.filter(x => x.id !== id);
  renderTasks();
}

function renderTasks() {
  const list = $("taskList");
  list.innerHTML = "";

  if (appState.tasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "callout";
    empty.textContent = "No tasks yet. Add a checklist for the world.";
    list.appendChild(empty);
    return;
  }

  for (const t of appState.tasks) {
    const item = document.createElement("div");
    item.className = "item";

    const left = document.createElement("div");
    left.className = "item__left";

    const name = document.createElement("div");
    name.className = "item__name";
    name.textContent = t.done ? `✅ ${t.text}` : `⬜ ${t.text}`;

    const meta = document.createElement("div");
    meta.className = "item__meta";
    meta.textContent = t.done ? "DONE" : "TODO";

    left.appendChild(name);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "item__right";

    const btnToggle = document.createElement("button");
    btnToggle.className = "btn ghost small";
    btnToggle.textContent = t.done ? "Mark Undone" : "Mark Done";
    btnToggle.onclick = () => toggleTask(t.id);

    const btnDel = document.createElement("button");
    btnDel.className = "btn danger small";
    btnDel.textContent = "Delete";
    btnDel.onclick = () => deleteTask(t.id);

    right.appendChild(btnToggle);
    right.appendChild(btnDel);

    item.appendChild(left);
    item.appendChild(right);

    list.appendChild(item);
  }
}

// ---------- Export / Import ----------
function exportData() {
  const payload = {
    v: 1,
    // seed is included so your friends are guaranteed to be on the same world:
    seed: WORLD.seed,
    platform: WORLD.platform,
    locations: appState.locations,
    tasks: appState.tasks,
  };

  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  $("exportBox").value = b64;
  toast("Export code generated.");
}

function importData() {
  const code = $("exportBox").value.trim();
  if (!code) {
    toast("Paste an export code first.");
    return;
  }

  try {
    const json = decodeURIComponent(escape(atob(code)));
    const payload = JSON.parse(json);

    if (payload?.seed !== WORLD.seed || payload?.platform !== WORLD.platform) {
      toast("That code is for a different world/edition.");
      return;
    }

    appState.locations = Array.isArray(payload?.locations) ? payload.locations : [];
    appState.tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
    appState.selectedLocId = null;

    renderLocations();
    renderTasks();
    toast("Imported ✔");
  } catch {
    toast("Import failed. That code doesn’t look valid.");
  }
}

// ---------- Portal math ----------
function overworldToNether() {
  const x = safeNum($("owX").value);
  const z = safeNum($("owZ").value);
  $("resX").value = Math.trunc(x / 8);
  $("resZ").value = Math.trunc(z / 8);
  toast("Converted to Nether coords.");
}

function netherToOverworld() {
  const x = safeNum($("owX").value);
  const z = safeNum($("owZ").value);
  $("resX").value = Math.trunc(x * 8);
  $("resZ").value = Math.trunc(z * 8);
  toast("Converted to Overworld coords.");
}

// ---------- Init ----------
function init() {
  // lock in the seed in the UI
  $("seed").value = WORLD.seed;
  $("platformDisplay").value = WORLD.platform.toUpperCase();
  $("seedBadge").textContent = WORLD.seed;

  // Buttons
  $("btnSave").addEventListener("click", saveState);
  $("btnLoad").addEventListener("click", loadState);
  $("btnReset").addEventListener("click", resetAll);

  $("btnCopySeed").addEventListener("click", async () => {
    await copyText(WORLD.seed);
    toast("Seed copied.");
  });

  $("btnCopyCoords").addEventListener("click", async () => {
    const x = safeNum($("x").value);
    const z = safeNum($("z").value);
    await copyText(`X ${x}, Z ${z}`);
    toast("Coords copied.");
  });

  $("btnUseLoc").addEventListener("click", useSelectedLocationToCoords);

  // Structure shortcuts → Chunkbase
  document.querySelectorAll("[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => openChunkbase(btn.dataset.tool));
  });

  // Portal calculator
  $("btnToNether").addEventListener("click", overworldToNether);
  $("btnToOver").addEventListener("click", netherToOverworld);

  // Locations
  $("btnAddLoc").addEventListener("click", addLocation);
  $("btnFillFromPlayer").addEventListener("click", () => {
    $("locX").value = safeNum($("x").value);
    $("locZ").value = safeNum($("z").value);
    toast("Filled from player coords.");
  });
  $("btnClearLocs").addEventListener("click", clearLocations);

  // Tasks
  $("btnAddTask").addEventListener("click", addTask);
  $("btnClearTasks").addEventListener("click", clearTasks);

  // Export/import
  $("btnExport").addEventListener("click", exportData);
  $("btnImport").addEventListener("click", importData);
  $("btnCopyExport").addEventListener("click", async () => {
    const t = $("exportBox").value.trim();
    if (!t) return toast("Nothing to copy yet.");
    await copyText(t);
    toast("Export code copied.");
  });

  // Enter key for task input
  $("taskInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });

  // Load if present
  loadState();
  renderLocations();
  renderTasks();
}

document.addEventListener("DOMContentLoaded", init);

