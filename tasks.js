(function () {
  "use strict";

  function initTasksPage() {
  const toastRoot = document.getElementById("tasks-toast-root");
  const phone = document.querySelector(".tasks-phone");

  function toast(msg) {
    if (!toastRoot) return;
    const el = document.createElement("div");
    el.className = "tasks-toast";
    el.setAttribute("role", "status");
    el.textContent = msg;
    toastRoot.appendChild(el);
    requestAnimationFrame(() => el.classList.add("tasks-toast--show"));
    setTimeout(() => {
      el.classList.remove("tasks-toast--show");
      setTimeout(() => el.remove(), 200);
    }, 2400);
  }

  function initRoomRings() {
    const R = 20;
    const L = 2 * Math.PI * R;
    document.querySelectorAll(".room-ring__arc[data-pct]").forEach((arc) => {
      const pct = Math.min(100, Math.max(0, parseFloat(arc.getAttribute("data-pct") || "0")));
      arc.style.strokeDasharray = String(L);
      arc.style.strokeDashoffset = String(L * (1 - pct / 100));
    });
  }

  function applyView(view) {
    const day = document.getElementById("panel-day");
    const rooms = document.getElementById("panel-rooms");
    document.querySelectorAll(".tasks-view-tabs [data-view]").forEach((tab) => {
      const on = tab.getAttribute("data-view") === view;
      tab.classList.toggle("tasks-view-tab--active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (view === "day") {
      day?.removeAttribute("hidden");
      rooms?.setAttribute("hidden", "");
      phone?.classList.remove("tasks-phone--rooms-view");
    } else {
      day?.setAttribute("hidden", "");
      rooms?.removeAttribute("hidden");
      phone?.classList.add("tasks-phone--rooms-view");
    }
  }

  document.querySelectorAll(".tasks-date-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tasks-date-chip").forEach((b) => b.classList.remove("tasks-date-chip--active"));
      btn.classList.add("tasks-date-chip--active");
    });
  });

  const viewTablist = document.querySelector(".tasks-view-tabs");
  viewTablist?.addEventListener("click", (e) => {
    const tab = e.target.closest("button[data-view]");
    if (!tab || !viewTablist.contains(tab)) return;
    e.preventDefault();
    const v = tab.getAttribute("data-view") || "day";
    applyView(v);
    try {
      if (history.replaceState) {
        const base = `${window.location.pathname}${window.location.search}`;
        history.replaceState(null, "", v === "rooms" ? `${base}#rooms` : base);
      }
    } catch (_) {
      /* file:// or restricted context */
    }
    if (v === "rooms") scrollRoomsPanelIntoView();
  });

  function scrollRoomsPanelIntoView() {
    document.getElementById("panel-rooms")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  window.addEventListener("hashchange", () => {
    const v = window.location.hash === "#rooms" ? "rooms" : "day";
    applyView(v);
    if (v === "rooms") scrollRoomsPanelIntoView();
  });

  const bathroomToggle = document.getElementById("toggle-bathroom");
  const bathroomSection = bathroomToggle?.closest(".tasks-room");
  bathroomToggle?.addEventListener("click", () => {
    const collapsed = bathroomSection.getAttribute("data-collapsed") === "true";
    bathroomSection.setAttribute("data-collapsed", collapsed ? "false" : "true");
    bathroomToggle.setAttribute("aria-expanded", collapsed ? "true" : "false");
  });

  const dayTasks = ["Clean Sink", "Clean Toilet", "Wash Rugs"];
  const roomNames = ["Bathroom", "Bedroom", "Dining Room", "Kitchen", "Living Room"];

  document.querySelectorAll(".tasks-shuffle:not(.tasks-shuffle--rooms)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pick = dayTasks[Math.floor(Math.random() * dayTasks.length)];
      toast(`Try starting with: ${pick}`);
    });
  });

  document.querySelectorAll(".tasks-shuffle--rooms").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pick = roomNames[Math.floor(Math.random() * roomNames.length)];
      toast(`How about the ${pick}?`);
    });
  });

  const SORT_LABELS = {
    cleanliness: "Sort by cleanliness",
    effort: "Sort by effort",
  };

  function cleanlinessFromCard(card) {
    const raw = card.getAttribute("data-cleanliness");
    if (raw != null && raw !== "") return parseFloat(raw) || 0;
    const fill = card.querySelector(".tasks-meter__fill");
    const w = fill?.style?.width;
    if (w) return parseFloat(w) || 0;
    return 0;
  }

  function effortDataFromCard(card) {
    const raw = card.getAttribute("data-effort");
    return raw != null && raw !== "" ? parseFloat(raw) || 0 : 0;
  }

  /** Primary effort = filled dots under .tasks-card__dots when any are lit; else data-effort. Tie-break: data-effort. */
  function effortSortKey(card) {
    const wrap = card.querySelector(".tasks-card__dots");
    const data = effortDataFromCard(card);
    if (wrap) {
      const lit = wrap.querySelectorAll(".tasks-dot--on").length;
      if (lit > 0) return { primary: lit, tie: data };
    }
    return { primary: data, tie: 0 };
  }

  function compareEffortCards(a, b) {
    const ka = effortSortKey(a);
    const kb = effortSortKey(b);
    if (ka.primary !== kb.primary) return ka.primary - kb.primary;
    return ka.tie - kb.tie;
  }

  function sortTaskCardsInContainer(container, mode) {
    if (!container) return;
    const cards = Array.from(container.querySelectorAll(".tasks-card"));
    if (mode === "cleanliness") {
      cards.sort((a, b) => cleanlinessFromCard(b) - cleanlinessFromCard(a));
    } else {
      /* Effort: ascending — fewest dots / lowest score first */
      cards.sort(compareEffortCards);
    }
    cards.forEach((c) => container.appendChild(c));
  }

  const bathroomBody = document.getElementById("bathroom-body");
  const btnSort = document.getElementById("btn-sort");
  const tasksSortMenu = document.getElementById("tasks-sort-menu");
  const tasksSortLabel = document.getElementById("tasks-sort-label");
  let tasksSortMode = "cleanliness";

  function setTasksSortMode(mode) {
    tasksSortMode = mode === "effort" ? "effort" : "cleanliness";
    sortTaskCardsInContainer(bathroomBody, tasksSortMode);
    if (tasksSortLabel) tasksSortLabel.textContent = SORT_LABELS[tasksSortMode];
    tasksSortMenu?.querySelectorAll("[data-sort]").forEach((el) => {
      const on = el.getAttribute("data-sort") === tasksSortMode;
      el.classList.toggle("tasks-sort-menu__item--active", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function closeTasksSortMenu() {
    tasksSortMenu?.setAttribute("hidden", "");
    btnSort?.setAttribute("aria-expanded", "false");
  }

  btnSort?.addEventListener("click", (e) => {
    e.stopPropagation();
    const menuHidden = tasksSortMenu?.hasAttribute("hidden");
    if (menuHidden) {
      tasksSortMenu?.removeAttribute("hidden");
      btnSort.setAttribute("aria-expanded", "true");
    } else {
      closeTasksSortMenu();
    }
  });

  tasksSortMenu?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-sort]");
    if (!item || !tasksSortMenu.contains(item)) return;
    e.preventDefault();
    const mode = item.getAttribute("data-sort");
    if (mode) setTasksSortMode(mode);
    closeTasksSortMenu();
  });

  document.addEventListener("click", () => closeTasksSortMenu());

  setTasksSortMode("cleanliness");

  document.getElementById("expand-cal")?.addEventListener("click", () => {
    toast("Full calendar — connect your date picker.");
  });

  document.getElementById("btn-add-room")?.addEventListener("click", () => {
    toast("Add room — connect your create flow.");
  });

  initRoomRings();

  if (window.location.hash === "#rooms") {
    applyView("rooms");
    requestAnimationFrame(scrollRoomsPanelIntoView);
  } else {
    applyView("day");
  }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTasksPage, { once: true });
  } else {
    initTasksPage();
  }
})();
