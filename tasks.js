(function () {
  "use strict";

  function initTasksPage() {
  const toastRoot = document.getElementById("tasks-toast-root");
  const phone = document.querySelector(".tasks-phone");
  let calendarExpandedOpen = false;

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
      document.dispatchEvent(new CustomEvent("fullsweep:closeAddRoom"));
    } else {
      day?.setAttribute("hidden", "");
      rooms?.removeAttribute("hidden");
      phone?.classList.add("tasks-phone--rooms-view");
      if (calendarExpandedOpen) {
        calendarExpandedOpen = false;
        document.getElementById("calendar-expanded")?.setAttribute("hidden", "");
        document.getElementById("tasks-calendar-card")?.classList.remove("tasks-calendar-card--expanded");
        const exBtn = document.getElementById("expand-cal");
        exBtn?.setAttribute("aria-expanded", "false");
        if (exBtn && ICON_EXPAND) exBtn.innerHTML = ICON_EXPAND;
      }
    }
  }

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

  const panelDay = document.getElementById("panel-day");
  panelDay?.addEventListener("click", (e) => {
    const hdr = e.target.closest("button.tasks-room__header");
    if (!hdr || !panelDay.contains(hdr)) return;
    const section = hdr.closest(".tasks-room");
    if (!section) return;
    const collapsed = section.getAttribute("data-collapsed") === "true";
    section.setAttribute("data-collapsed", collapsed ? "false" : "true");
    hdr.setAttribute("aria-expanded", collapsed ? "true" : "false");
  });

  const dayTasks = [
    "Clean Sink",
    "Clean Toilet",
    "Wash Rugs",
    "Change Bed Sheets",
    "Scrub shower tiles",
    "Flip mattress",
    "Polish fixtures",
    "Vacuum bedroom",
    "Deep clean grout",
    "Dust blinds",
    "Restock supplies",
    "Sort dresser",
    "Mop bathroom floor",
    "Air out pillows",
    "Wash duvet cover",
  ];
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
    document.dispatchEvent(new CustomEvent("fullsweep:closeTaskActions"));
    const cards = Array.from(container.querySelectorAll(".tasks-card"));
    if (mode === "cleanliness") {
      cards.sort((a, b) => cleanlinessFromCard(b) - cleanlinessFromCard(a));
    } else {
      /* Effort: ascending — fewest dots / lowest score first */
      cards.sort(compareEffortCards);
    }
    cards.forEach((c) => container.appendChild(c));
  }

  const tasksEmptyDay = document.getElementById("tasks-empty-day");

  function getDayRoomBodies() {
    return Array.from(document.querySelectorAll("#panel-day .tasks-room__body"));
  }

  const CUSTOM_ROOMS_KEY = "fullsweep_custom_rooms";

  function readCustomRooms() {
    try {
      const raw = localStorage.getItem(CUSTOM_ROOMS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  /** Remove previously injected custom room UI (By Rooms + By Day) */
  function removeInjectedCustomRooms() {
    document.querySelectorAll("[data-custom-room]").forEach((el) => el.remove());
  }

  function injectCustomRoomsFromStorage() {
    removeInjectedCustomRooms();
    const grid = document.querySelector(".rooms-dash__grid");
    const dayMain = document.querySelector("#panel-day main.tasks-scroll");
    if (!grid || !dayMain) return;

    readCustomRooms().forEach((entry) => {
      if (!entry || !entry.name || !entry.slug) return;
      const slug = String(entry.slug).replace(/[^a-z0-9-]/gi, "");
      if (!slug) return;

      const tile = document.createElement("a");
      tile.href = `room.html?room=${encodeURIComponent(slug)}`;
      tile.className = "room-tile";
      tile.setAttribute("data-custom-room", slug);
      tile.innerHTML = `
        <h3 class="room-tile__name"></h3>
        <p class="room-tile__meta">New room</p>
        <div class="room-tile__bottom">
          <span class="room-tile__tasks">0 tasks</span>
          <div class="room-ring" role="img" aria-label="0% complete">
            <svg class="room-ring__svg" viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">
              <circle class="room-ring__track" cx="26" cy="26" r="20" fill="none" stroke="#e8e8e8" stroke-width="4" />
              <circle class="room-ring__arc room-ring__arc--yellow" cx="26" cy="26" r="20" fill="none" stroke="#e8c832" stroke-width="4" stroke-linecap="round" transform="rotate(-90 26 26)" data-pct="0" />
            </svg>
            <span class="room-ring__label">0%</span>
          </div>
        </div>`;
      tile.querySelector(".room-tile__name").textContent = entry.name;
      const n = Array.isArray(entry.tasks) ? entry.tasks.length : 0;
      const taskSpan = tile.querySelector(".room-tile__tasks");
      if (taskSpan) taskSpan.textContent = `${n} task${n === 1 ? "" : "s"}`;
      grid.appendChild(tile);

      const titles = Array.isArray(entry.tasks) ? entry.tasks : [];
      const cardsHtml = titles
        .map((title, i) => {
          const d = new Date(2027, 0, 14 + (i % 7));
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const pct = 30 + (i * 7) % 50;
          const fill = pct > 65 ? "tasks-meter__fill--urgent" : pct > 45 ? "tasks-meter__fill--warn" : "tasks-meter__fill--good";
          const lab = pct > 65 ? "tasks-meter__label--urgent" : pct > 45 ? "tasks-meter__label--warn" : "tasks-meter__label--good";
          const labText = pct > 65 ? "Uh oh..." : pct > 45 ? "Getting dusty..." : "Looking good";
          const esc = String(title).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
          return `<article class="tasks-card" data-due-iso="${iso}" data-cleanliness="${pct}" data-effort="2" data-task-category="${esc}" data-task-location="${esc}" data-task-repeat="As needed" data-task-every="as needed" data-task-schedule-repeat="Flexible" data-task-time="Time">
            <h3 class="tasks-card__title">${esc}</h3>
            <p class="tasks-card__meta">new task</p>
            <div class="tasks-card__repeat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              As needed
            </div>
            <div class="tasks-meter">
              <div class="tasks-meter__track"><div class="tasks-meter__fill ${fill}" style="width:${pct}%"></div></div>
              <p class="tasks-meter__label ${lab}">${labText}</p>
            </div>
            <div class="tasks-card__dots" aria-hidden="true">
              <span class="tasks-dot tasks-dot--on"></span><span class="tasks-dot"></span><span class="tasks-dot"></span>
            </div>
          </article>`;
        })
        .join("");

      const sec = document.createElement("section");
      sec.className = "tasks-room";
      sec.setAttribute("data-collapsed", "false");
      sec.setAttribute("data-custom-room", slug);
      sec.innerHTML = `
        <button type="button" class="tasks-room__header" aria-expanded="true" id="toggle-custom-${slug}">
          <span class="tasks-room__title-text"></span>
          <span class="tasks-room__chev" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15" /></svg>
          </span>
        </button>
        <div class="tasks-room__body" id="room-body-${slug}">${cardsHtml || ""}</div>`;
      sec.querySelector(".tasks-room__title-text").textContent = entry.name;
      dayMain.appendChild(sec);
    });

    initRoomRings();
  }

  const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  /* Demo dots for expanded grid (weeks Thu–Wed, matches By Day mockups) */
  const TASK_DOTS_BY_ISO = {
    "2027-01-14": ["urgent", "warn", "good"],
    "2027-01-15": ["urgent", "good"],
    "2027-01-16": ["warn", "good"],
    "2027-01-17": ["good", "warn"],
    "2027-01-18": ["urgent", "warn"],
    "2027-01-19": ["warn", "good"],
    "2027-01-20": ["urgent", "good", "warn"],
    "2027-01-21": ["good"],
    "2027-01-22": ["urgent"],
    "2027-01-25": ["good", "good", "good"],
    "2027-01-28": ["warn"],
    "2027-02-03": ["good"],
  };

  const ICON_COLLAPSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <line x1="4" y1="4" x2="9" y2="9" /><line x1="20" y1="4" x2="15" y2="9" />
    <line x1="4" y1="20" x2="9" y2="15" /><line x1="20" y1="20" x2="15" y2="15" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>`;

  function formatISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function parseISO(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }

  function thursdayOfWeekContaining(d) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = t.getDay();
    const delta = (dow - 4 + 7) % 7;
    t.setDate(t.getDate() - delta);
    return t;
  }

  const calendarCard = document.getElementById("tasks-calendar-card");
  const dateScroll = document.getElementById("date-scroll");
  const calendarExpanded = document.getElementById("calendar-expanded");
  const expandCalBtn = document.getElementById("expand-cal");
  const ICON_EXPAND =
    expandCalBtn?.querySelector("svg")?.outerHTML ||
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5V2M12 22v-3M5 12H2M22 12h-3"/><path d="M15.5 8.5 18 6M8.5 15.5 6 18M15.5 15.5 18 18M8.5 8.5 6 6"/></svg>`;

  let selectedIso = "2027-01-14";

  dateScroll?.addEventListener("click", (e) => {
    const chip = e.target.closest(".tasks-date-chip[data-iso]");
    if (!chip || !dateScroll.contains(chip)) return;
    const iso = chip.getAttribute("data-iso");
    if (iso) setSelectedIso(iso);
  });

  function dotsHtmlFor(iso) {
    const dots = TASK_DOTS_BY_ISO[iso];
    if (!dots || !dots.length) return '<div class="tasks-cal-cell__dots" aria-hidden="true"></div>';
    const max = dots.slice(0, 3);
    const inner = max.map((k) => `<span class="tasks-cal-dot tasks-cal-dot--${k}"></span>`).join("");
    return `<div class="tasks-cal-cell__dots" aria-hidden="true">${inner}</div>`;
  }

  function applyTaskDayFilter() {
    let visible = 0;
    getDayRoomBodies().forEach((container) => {
      container.querySelectorAll(".tasks-card").forEach((card) => {
        const due = card.getAttribute("data-due-iso");
        const show = due === selectedIso;
        card.hidden = !show;
        if (show) visible += 1;
      });
    });
    if (tasksEmptyDay) {
      tasksEmptyDay.hidden = visible !== 0;
    }
  }

  function setSelectedIso(iso) {
    selectedIso = iso;
    renderStrip();
    if (calendarExpandedOpen) renderExpandedGrid();
    applyTaskDayFilter();
  }

  function renderStrip() {
    if (!dateScroll) return;
    const thu = thursdayOfWeekContaining(parseISO(selectedIso));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 7; i++) {
      const d = addDays(thu, i);
      const iso = formatISO(d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tasks-date-chip" + (iso === selectedIso ? " tasks-date-chip--active" : "");
      btn.setAttribute("data-iso", iso);
      btn.innerHTML = `<span>${DAY_NAMES[d.getDay()]}</span><span>${d.getDate()}</span>`;
      frag.appendChild(btn);
    }
    dateScroll.innerHTML = "";
    dateScroll.appendChild(frag);
  }

  function renderExpandedGrid() {
    if (!calendarExpanded) return;
    const thu = thursdayOfWeekContaining(parseISO(selectedIso));
    calendarExpanded.innerHTML = "";
    for (let row = 0; row < 3; row++) {
      const rowEl = document.createElement("div");
      rowEl.className = "tasks-cal-expanded__row";
      const cells = document.createElement("div");
      cells.className = "tasks-cal-expanded__cells";
      for (let i = 0; i < 7; i++) {
        const d = addDays(thu, row * 7 + i);
        const iso = formatISO(d);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tasks-cal-cell" + (iso === selectedIso ? " tasks-cal-cell--active" : "");
        btn.setAttribute("data-iso", iso);
        btn.setAttribute(
          "aria-label",
          `${DAY_NAMES[d.getDay()]} ${d.getDate()}, ${d.toLocaleString(undefined, { month: "long" })}`
        );
        btn.innerHTML = `<span class="tasks-cal-cell__day">${DAY_NAMES[d.getDay()]}</span><span class="tasks-cal-cell__num">${d.getDate()}</span>${dotsHtmlFor(iso)}`;
        cells.appendChild(btn);
      }
      rowEl.appendChild(cells);
      if (row === 0) {
        const collapseBtn = document.createElement("button");
        collapseBtn.type = "button";
        collapseBtn.className = "tasks-expand-btn tasks-expand-btn--collapse";
        collapseBtn.setAttribute("aria-label", "Collapse calendar");
        collapseBtn.innerHTML = ICON_COLLAPSE;
        collapseBtn.addEventListener("click", () => setCalendarExpanded(false));
        rowEl.appendChild(collapseBtn);
      }
      calendarExpanded.appendChild(rowEl);
    }
  }

  function setCalendarExpanded(open) {
    calendarExpandedOpen = open;
    if (!calendarCard || !calendarExpanded || !expandCalBtn) return;
    calendarCard.classList.toggle("tasks-calendar-card--expanded", open);
    if (open) {
      calendarExpanded.removeAttribute("hidden");
      expandCalBtn.setAttribute("aria-expanded", "true");
      renderExpandedGrid();
    } else {
      calendarExpanded.setAttribute("hidden", "");
      expandCalBtn.setAttribute("aria-expanded", "false");
      expandCalBtn.innerHTML = ICON_EXPAND;
    }
  }

  expandCalBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setCalendarExpanded(!calendarExpandedOpen);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && calendarExpandedOpen) {
      setCalendarExpanded(false);
    }
  });

  calendarExpanded?.addEventListener("click", (e) => {
    const cell = e.target.closest(".tasks-cal-cell[data-iso]");
    if (!cell || !calendarExpanded.contains(cell)) return;
    const iso = cell.getAttribute("data-iso");
    if (iso) setSelectedIso(iso);
  });

  const btnSort = document.getElementById("btn-sort");
  const tasksSortMenu = document.getElementById("tasks-sort-menu");
  const tasksSortLabel = document.getElementById("tasks-sort-label");
  let tasksSortMode = "cleanliness";

  function setTasksSortMode(mode) {
    tasksSortMode = mode === "effort" ? "effort" : "cleanliness";
    getDayRoomBodies().forEach((body) => sortTaskCardsInContainer(body, tasksSortMode));
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

  injectCustomRoomsFromStorage();

  document.addEventListener("fullsweep:customRoomsChanged", () => {
    injectCustomRoomsFromStorage();
    applyTaskDayFilter();
    setTasksSortMode(tasksSortMode);
  });

  setTasksSortMode("cleanliness");

  initRoomRings();

  if (window.location.hash === "#rooms") {
    applyView("rooms");
    requestAnimationFrame(scrollRoomsPanelIntoView);
  } else {
    applyView("day");
  }

  renderStrip();
  applyTaskDayFilter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTasksPage, { once: true });
  } else {
    initTasksPage();
  }
})();
