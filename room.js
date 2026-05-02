(function () {
  "use strict";

  const toastRoot = document.getElementById("room-toast-root");

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

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  const REPEAT_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';

  const ROOMS = {
    bedroom: {
      title: "Bedroom",
      heroPct: 58,
      heroMeter: "warn",
      tasks: [
        {
          title: "Vacuum Floor",
          meta: "cleaned 2 weeks ago",
          repeat: "Every week",
          meter: "urgent",
          width: "92%",
          label: "Uh oh...",
          dots: 1,
          cleanliness: 92,
          effort: 4,
          defaultLocation: "John's Bedroom",
          scheduleEvery: "2 weeks",
          scheduleRepeat: "On Monday",
          scheduleTime: "Time",
        },
        {
          title: "Change Bed Sheets",
          meta: "cleaned 1 week ago",
          repeat: "Every week",
          meter: "warn",
          width: "48%",
          label: "Getting dusty...",
          dots: 2,
          cleanliness: 48,
          effort: 3,
        },
        {
          title: "Organize Closet",
          meta: "cleaned 3 weeks ago",
          repeat: "Every month",
          meter: "warn",
          width: "52%",
          label: "Getting dusty...",
          dots: 3,
          cleanliness: 52,
          effort: 4,
        },
        {
          title: "Dust",
          meta: "cleaned 2 days ago",
          repeat: "Every week",
          meter: "good",
          width: "82%",
          label: "Good job!",
          dots: 1,
          cleanliness: 18,
          effort: 2,
        },
      ],
    },
    bathroom: {
      title: "Bathroom",
      heroPct: 50,
      heroMeter: "warn",
      tasks: [
        {
          title: "Clean Sink",
          meta: "cleaned 3 weeks ago",
          repeat: "Every 2 weeks",
          meter: "urgent",
          width: "88%",
          label: "Uh oh...",
          dots: 1,
          cleanliness: 88,
          effort: 3,
        },
        {
          title: "Clean Toilet",
          meta: "cleaned 1 week ago",
          repeat: "Every week",
          meter: "warn",
          width: "52%",
          label: "Getting dusty...",
          dots: 2,
          cleanliness: 52,
          effort: 2,
        },
        {
          title: "Wash Rugs",
          meta: "cleaned 2 weeks ago",
          repeat: "Every 2 weeks",
          meter: "urgent",
          width: "85%",
          label: "Uh oh...",
          dots: 2,
          cleanliness: 85,
          effort: 5,
        },
      ],
    },
    "dining-room": {
      title: "Dining Room",
      heroPct: 80,
      heroMeter: "good",
      tasks: [
        {
          title: "Wipe Table",
          meta: "cleaned 2 days ago",
          repeat: "Every week",
          meter: "good",
          width: "75%",
          label: "Good job!",
          dots: 2,
          cleanliness: 25,
          effort: 2,
        },
        {
          title: "Sweep Floor",
          meta: "cleaned 5 days ago",
          repeat: "Every week",
          meter: "warn",
          width: "45%",
          label: "Getting dusty...",
          dots: 1,
          cleanliness: 45,
          effort: 3,
        },
      ],
    },
    kitchen: {
      title: "Kitchen",
      heroPct: 87,
      heroMeter: "good",
      tasks: [
        {
          title: "Clean Counters",
          meta: "cleaned 1 day ago",
          repeat: "Daily",
          meter: "good",
          width: "88%",
          label: "Good job!",
          dots: 3,
          cleanliness: 12,
          effort: 3,
        },
        {
          title: "Take Out Trash",
          meta: "cleaned 3 days ago",
          repeat: "Every week",
          meter: "warn",
          width: "55%",
          label: "Getting dusty...",
          dots: 2,
          cleanliness: 55,
          effort: 1,
        },
      ],
    },
    "living-room": {
      title: "Living Room",
      heroPct: 16,
      heroMeter: "urgent",
      tasks: [
        {
          title: "Vacuum Carpet",
          meta: "cleaned 4 weeks ago",
          repeat: "Every week",
          meter: "urgent",
          width: "90%",
          label: "Uh oh...",
          dots: 1,
          cleanliness: 90,
          effort: 4,
        },
        {
          title: "Dust Surfaces",
          meta: "cleaned 2 weeks ago",
          repeat: "Every week",
          meter: "warn",
          width: "40%",
          label: "Getting dusty...",
          dots: 1,
          cleanliness: 40,
          effort: 2,
        },
      ],
    },
  };

  const FILL = {
    urgent: "tasks-meter__fill--urgent",
    warn: "tasks-meter__fill--warn",
    good: "tasks-meter__fill--good",
  };

  const LABEL = {
    urgent: "tasks-meter__label--urgent",
    warn: "tasks-meter__label--warn",
    good: "tasks-meter__label--good",
  };

  function renderDots(n) {
    return [1, 2, 3]
      .map((i) => `<span class="tasks-dot${i <= n ? " tasks-dot--on" : ""}"></span>`)
      .join("");
  }

  function taskCard(t, cfg) {
    const clean = typeof t.cleanliness === "number" ? t.cleanliness : 0;
    const effort = typeof t.effort === "number" ? t.effort : 3;
    const category = cfg.title;
    const loc = t.defaultLocation != null ? t.defaultLocation : category;
    const everyDisp =
      t.scheduleEvery != null
        ? t.scheduleEvery
        : String(t.repeat || "")
            .replace(/^Every\s+/i, "")
            .trim() || "week";
    const repDisp = t.scheduleRepeat != null ? t.scheduleRepeat : "On Monday";
    const timeDisp = t.scheduleTime != null ? t.scheduleTime : "Time";
    return `
      <article class="tasks-card" data-cleanliness="${clean}" data-effort="${effort}" data-task-category="${escapeAttr(category)}" data-task-location="${escapeAttr(loc)}" data-task-repeat="${escapeAttr(t.repeat)}" data-task-every="${escapeAttr(everyDisp)}" data-task-schedule-repeat="${escapeAttr(repDisp)}" data-task-time="${escapeAttr(timeDisp)}">
        <h3 class="tasks-card__title">${escapeHtml(t.title)}</h3>
        <p class="tasks-card__meta">${escapeHtml(t.meta)}</p>
        <div class="tasks-card__repeat">
          ${REPEAT_ICON}
          ${escapeHtml(t.repeat)}
        </div>
        <div class="tasks-meter">
          <div class="tasks-meter__track">
            <div class="tasks-meter__fill ${FILL[t.meter]}" style="width: ${t.width}"></div>
          </div>
          <p class="tasks-meter__label ${LABEL[t.meter]}">${escapeHtml(t.label)}</p>
        </div>
        <div class="tasks-card__dots" aria-hidden="true">
          ${renderDots(t.dots)}
        </div>
      </article>`;
  }

  function applyRoom(key) {
    const cfg = ROOMS[key];
    if (!cfg) {
      toast("Room data not found.");
      return;
    }

    const headingName = document.getElementById("room-heading-name");
    const listEl = document.getElementById("room-task-list");
    const heroFill = document.getElementById("room-hero-fill");

    if (headingName) headingName.textContent = cfg.title;
    document.title = `${cfg.title} — FullSweep`;

    if (heroFill) {
      heroFill.style.width = `${cfg.heroPct}%`;
      heroFill.className = `tasks-meter__fill ${FILL[cfg.heroMeter] || "tasks-meter__fill--warn"}`;
    }

    if (listEl) {
      listEl.innerHTML = cfg.tasks.map((t) => taskCard(t, cfg)).join("");
      applyRoomTaskSort();
    }

    const banner = document.querySelector(".room-detail-banner");
    const scene = document.querySelector(".room-detail-scene");
    if (banner) banner.setAttribute("data-room", key);

    if (scene) {
      if (key === "bedroom") {
        scene.classList.remove("room-detail-scene--placeholder");
        if (!scene.querySelector(".room-detail-bed")) {
          scene.innerHTML =
            '<div class="room-detail-bed"></div><div class="room-detail-night"></div><div class="room-detail-lamp"></div><div class="room-detail-plant"></div>';
        }
      } else {
        scene.classList.add("room-detail-scene--placeholder");
        scene.innerHTML = "";
      }
    }
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("room") || "bedroom";
  const key = raw in ROOMS ? raw : "bedroom";

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

  function sortRoomTaskCards(mode) {
    const listEl = document.getElementById("room-task-list");
    if (!listEl) return;
    const cards = Array.from(listEl.querySelectorAll(".tasks-card"));
    if (mode === "cleanliness") {
      cards.sort((a, b) => cleanlinessFromCard(b) - cleanlinessFromCard(a));
    } else {
      cards.sort(compareEffortCards);
    }
    cards.forEach((c) => listEl.appendChild(c));
  }

  const roomSortBtn = document.getElementById("room-sort");
  const roomSortMenu = document.getElementById("room-sort-menu");
  const roomSortLabel = document.getElementById("room-sort-label");
  let roomSortMode = "cleanliness";

  function setRoomSortMode(mode) {
    roomSortMode = mode === "effort" ? "effort" : "cleanliness";
    sortRoomTaskCards(roomSortMode);
    if (roomSortLabel) roomSortLabel.textContent = SORT_LABELS[roomSortMode];
    roomSortMenu?.querySelectorAll("[data-sort]").forEach((el) => {
      const on = el.getAttribute("data-sort") === roomSortMode;
      el.classList.toggle("tasks-sort-menu__item--active", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function applyRoomTaskSort() {
    sortRoomTaskCards(roomSortMode);
  }

  function closeRoomSortMenu() {
    roomSortMenu?.setAttribute("hidden", "");
    roomSortBtn?.setAttribute("aria-expanded", "false");
  }

  roomSortBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const menuHidden = roomSortMenu?.hasAttribute("hidden");
    if (menuHidden) {
      roomSortMenu?.removeAttribute("hidden");
      roomSortBtn.setAttribute("aria-expanded", "true");
    } else {
      closeRoomSortMenu();
    }
  });

  roomSortMenu?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-sort]");
    if (!item || !roomSortMenu.contains(item)) return;
    e.preventDefault();
    const mode = item.getAttribute("data-sort");
    if (mode) setRoomSortMode(mode);
    closeRoomSortMenu();
  });

  document.addEventListener("click", () => closeRoomSortMenu());

  applyRoom(key);

  document.getElementById("room-fab")?.addEventListener("click", () => {
    toast("Add task — connect your create flow.");
  });
})();
