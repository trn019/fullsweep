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
    document.dispatchEvent(new CustomEvent("fullsweep:closeAutoSanitize"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeSelectTime"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeReschedule"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeFocusMenu"));
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
    "Vacuum Floor",
    "Deep clean grout",
    "Dust blinds",
    "Restock supplies",
    "Sort dresser",
    "Mop bathroom floor",
    "Air out pillows",
    "Wash duvet cover",
  ];
  const roomNames = ["Bathroom", "Bedroom", "Dining Room", "Kitchen", "Living Room"];

  let autoSanitizeTargetCard = null;

  const CLOCK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/></svg>`;

  function closeAutoSanitize() {
    const panel = document.getElementById("panel-auto-sanitize");
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-auto-sanitize-active");
    phone?.classList.remove("tasks-phone--auto-sanitize");
    autoSanitizeTargetCard = null;
  }

  function renderEffortClocks(level) {
    const el = document.getElementById("auto-sanitize-clocks");
    if (!el) return;
    const n = Math.min(3, Math.max(1, level));
    el.innerHTML = [1, 2, 3]
      .map((i) => `<span class="auto-sanitize-clock${i <= n ? " auto-sanitize-clock--on" : ""}">${CLOCK_SVG}</span>`)
      .join("");
  }

  function effortLevelFromCardForSanitize(card) {
    const wrap = card.querySelector(".tasks-card__dots");
    if (wrap) {
      const lit = wrap.querySelectorAll(".tasks-dot--on").length;
      if (lit > 0) return Math.min(3, Math.max(1, lit));
    }
    const d = parseInt(card.getAttribute("data-effort") || "2", 10);
    return Math.min(3, Math.max(1, d || 2));
  }

  function getVisibleDayTaskCards() {
    if (!panelDay) return [];
    return Array.from(panelDay.querySelectorAll(".tasks-room__body .tasks-card")).filter((c) => !c.hidden);
  }

  function openAutoSanitize() {
    closeFocusMenu();
    document.dispatchEvent(new CustomEvent("fullsweep:openAutoSanitize"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeAddRoom"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeTaskActions"));
    const titleEl = document.getElementById("auto-sanitize-task-title");
    const panel = document.getElementById("panel-auto-sanitize");
    if (!titleEl || !panel) return;
    autoSanitizeTargetCard = null;
    const cards = getVisibleDayTaskCards();
    if (cards.length) {
      autoSanitizeTargetCard = cards[Math.floor(Math.random() * cards.length)];
      titleEl.textContent =
        autoSanitizeTargetCard.querySelector(".tasks-card__title")?.textContent?.trim() || "Task";
      renderEffortClocks(effortLevelFromCardForSanitize(autoSanitizeTargetCard));
    } else {
      titleEl.textContent = dayTasks[Math.floor(Math.random() * dayTasks.length)];
      renderEffortClocks(2);
    }
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-auto-sanitize-active");
    phone?.classList.add("tasks-phone--auto-sanitize");
    document.getElementById("auto-sanitize-close")?.focus({ preventScroll: true });
  }

  const FOCUS_EDIT_STEP = 44;
  const FOCUS_MIN_SECONDS = 60;
  const FOCUS_MAX_SECONDS = 180 * 60;
  let focusMenuTotalSeconds = 30 * 60;
  let focusMenuRunInterval = null;
  let focusMenuRunSeconds = 0;
  let focusSessionInitialSeconds = 0;
  let focusSessionPaused = false;
  const FOCUS_SESSION_RING_LEN = 2 * Math.PI * 92;
  const FOCUS_BREAK_DURATION_SEC = 300;
  let focusBreakRemainingSec = 0;
  let focusBreakInitialSec = FOCUS_BREAK_DURATION_SEC;
  let focusBreakInterval = null;
  let focusBreakPaused = false;

  function stopFocusTimer() {
    if (focusMenuRunInterval) {
      window.clearInterval(focusMenuRunInterval);
      focusMenuRunInterval = null;
    }
  }

  function resetFocusMenuViews() {
    const panel = document.getElementById("panel-focus-menu");
    panel?.classList.remove("tasks-focus-menu--running");
    stopFocusTimer();
  }

  function closeFocusEditTimer() {
    const ov = document.getElementById("focus-edit-timer-overlay");
    if (!ov || ov.hidden) return;
    ov.hidden = true;
  }

  function stopFocusBreakTimer() {
    if (focusBreakInterval) {
      window.clearInterval(focusBreakInterval);
      focusBreakInterval = null;
    }
  }

  function setFocusBreakPaused(on) {
    focusBreakPaused = on;
    const br = document.getElementById("panel-focus-break");
    const pauseBtn = document.getElementById("focus-break-pause");
    br?.classList.toggle("tasks-focus-break--paused", on);
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", on ? "true" : "false");
      pauseBtn.setAttribute("aria-label", on ? "Resume break timer" : "Pause break timer");
    }
    const bars = pauseBtn?.querySelector(".tasks-focus-break__pause-icon--bars");
    const play = pauseBtn?.querySelector(".tasks-focus-break__pause-icon--play");
    if (on) {
      bars?.classList.add("tasks-focus-break__pause-icon--hidden");
      play?.classList.remove("tasks-focus-break__pause-icon--hidden");
    } else {
      bars?.classList.remove("tasks-focus-break__pause-icon--hidden");
      play?.classList.add("tasks-focus-break__pause-icon--hidden");
    }
  }

  function updateFocusBreakRing() {
    const arc = document.getElementById("focus-break-ring-arc");
    if (!arc || focusBreakInitialSec <= 0) return;
    const L = FOCUS_SESSION_RING_LEN;
    const elapsed = 1 - Math.max(0, focusBreakRemainingSec) / focusBreakInitialSec;
    arc.style.strokeDasharray = String(L);
    arc.style.strokeDashoffset = String(L * (1 - Math.min(1, Math.max(0, elapsed))));
  }

  function updateFocusBreakDisplay() {
    const timeEl = document.getElementById("focus-break-time");
    if (timeEl) timeEl.textContent = formatFocusSessionClock(focusBreakRemainingSec);
    updateFocusBreakRing();
  }

  function closeFocusBreak() {
    const br = document.getElementById("panel-focus-break");
    const wasOpen = br?.classList.contains("tasks-focus-break--open");
    stopFocusBreakTimer();
    focusBreakPaused = false;
    if (wasOpen) {
      setFocusBreakPaused(false);
      br.classList.remove("tasks-focus-break--open", "tasks-focus-break--paused");
      br.setAttribute("aria-hidden", "true");
      document.body.classList.remove("tasks-focus-break-active");
      phone?.classList.remove("tasks-phone--focus-break");
      if (document.getElementById("panel-focus-session")?.classList.contains("tasks-focus-session--open")) {
        setFocusSessionPaused(false);
      }
    }
  }

  function openFocusBreak() {
    const sep = document.getElementById("panel-focus-session");
    if (!sep?.classList.contains("tasks-focus-session--open")) return;
    closeFocusBreak();
    setFocusSessionPaused(true);
    focusBreakInitialSec = FOCUS_BREAK_DURATION_SEC;
    focusBreakRemainingSec = focusBreakInitialSec;
    focusBreakPaused = false;
    const br = document.getElementById("panel-focus-break");
    if (!br) return;
    setFocusBreakPaused(false);
    updateFocusBreakDisplay();
    br.classList.add("tasks-focus-break--open");
    br.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-focus-break-active");
    phone?.classList.add("tasks-phone--focus-break");
    focusBreakInterval = window.setInterval(() => {
      if (focusBreakPaused) return;
      focusBreakRemainingSec -= 1;
      updateFocusBreakDisplay();
      if (focusBreakRemainingSec <= 0) {
        stopFocusBreakTimer();
        toast("Back to your task!");
        closeFocusBreak();
      }
    }, 1000);
    requestAnimationFrame(() => {
      document.getElementById("focus-break-pause")?.focus({ preventScroll: true });
    });
  }

  function closeFocusSession() {
    closeFocusBreak();
    const sep = document.getElementById("panel-focus-session");
    if (!sep?.classList.contains("tasks-focus-session--open")) return;
    stopFocusTimer();
    focusSessionPaused = false;
    setFocusSessionPaused(false);
    sep.classList.remove("tasks-focus-session--open", "tasks-focus-session--paused");
    sep.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-focus-session-active");
    phone?.classList.remove("tasks-phone--focus-session");
  }

  function closeFocusCelebrate() {
    const cel = document.getElementById("panel-focus-celebrate");
    if (!cel?.classList.contains("tasks-focus-celebrate--open")) return;
    cel.classList.remove("tasks-focus-celebrate--open");
    cel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-focus-celebrate-active");
    phone?.classList.remove("tasks-phone--focus-celebrate");
  }

  function openFocusCelebrate() {
    const cel = document.getElementById("panel-focus-celebrate");
    if (!cel) return;
    closeFocusCelebrate();
    cel.classList.add("tasks-focus-celebrate--open");
    cel.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-focus-celebrate-active");
    phone?.classList.add("tasks-phone--focus-celebrate");
    requestAnimationFrame(() => {
      document.getElementById("focus-celebrate-btn")?.focus({ preventScroll: true });
    });
  }

  function closeFocusMenu() {
    closeFocusEditTimer();
    closeFocusCelebrate();
    closeFocusSession();
    const panel = document.getElementById("panel-focus-menu");
    if (!panel || !panel.classList.contains("tasks-focus-menu--open")) return;
    resetFocusMenuViews();
    panel.classList.remove("tasks-focus-menu--open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-focus-menu-active");
    phone?.classList.remove("tasks-phone--focus-menu");
  }

  function formatFocusDurationPill(total) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h === 0 && s === 0) return `${m} Minutes`;
    if (h === 0) return `${m}m ${s}s`;
    if (m === 0 && s === 0) return `${h} hour${h === 1 ? "" : "s"}`;
    return `${h}h ${m}m`;
  }

  function updateFocusMenuDurationDisplay() {
    const el = document.getElementById("focus-menu-duration-display");
    if (el) el.textContent = formatFocusDurationPill(focusMenuTotalSeconds);
  }

  function readFocusEditWheel(scrollEl, maxIndex) {
    if (!scrollEl) return 0;
    const i = Math.round(scrollEl.scrollTop / FOCUS_EDIT_STEP);
    return Math.min(maxIndex, Math.max(0, i));
  }

  function setFocusEditWheelScroll(scrollEl, index) {
    if (!scrollEl) return;
    scrollEl.style.scrollBehavior = "auto";
    scrollEl.scrollTop = index * FOCUS_EDIT_STEP;
    requestAnimationFrame(() => {
      scrollEl.style.scrollBehavior = "";
    });
  }

  function secondsToHMS(total) {
    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = total % 60;
    if (h >= 3) {
      h = 3;
      m = 0;
      s = 0;
    }
    return { h, m, s };
  }

  function syncFocusEditWheelsFromSeconds(total) {
    const { h, m, s } = secondsToHMS(Math.min(FOCUS_MAX_SECONDS, Math.max(FOCUS_MIN_SECONDS, total)));
    setFocusEditWheelScroll(document.getElementById("focus-edit-scroll-hour"), h);
    setFocusEditWheelScroll(document.getElementById("focus-edit-scroll-min"), m);
    setFocusEditWheelScroll(document.getElementById("focus-edit-scroll-sec"), s);
  }

  function readFocusEditSecondsFromWheels() {
    const hourEl = document.getElementById("focus-edit-scroll-hour");
    const minEl = document.getElementById("focus-edit-scroll-min");
    const secEl = document.getElementById("focus-edit-scroll-sec");
    let h = readFocusEditWheel(hourEl, 3);
    let m = readFocusEditWheel(minEl, 59);
    let s = readFocusEditWheel(secEl, 59);
    let ts = h * 3600 + m * 60 + s;
    if (ts > FOCUS_MAX_SECONDS) {
      h = 3;
      m = 0;
      s = 0;
      ts = FOCUS_MAX_SECONDS;
    }
    if (ts < FOCUS_MIN_SECONDS) ts = FOCUS_MIN_SECONDS;
    return ts;
  }

  function openFocusEditTimer() {
    const ov = document.getElementById("focus-edit-timer-overlay");
    if (!ov) return;
    syncFocusEditWheelsFromSeconds(focusMenuTotalSeconds);
    ov.hidden = false;
    requestAnimationFrame(() => {
      document.getElementById("focus-edit-timer-close")?.focus({ preventScroll: true });
    });
  }

  function applyFocusEditTimerSave() {
    focusMenuTotalSeconds = readFocusEditSecondsFromWheels();
    updateFocusMenuDurationDisplay();
    closeFocusEditTimer();
  }

  let focusEditWheelsInited = false;
  function populateFocusEditWheels() {
    if (focusEditWheelsInited) return;
    const hourEl = document.getElementById("focus-edit-scroll-hour");
    const minEl = document.getElementById("focus-edit-scroll-min");
    const secEl = document.getElementById("focus-edit-scroll-sec");
    if (!hourEl || !minEl || !secEl) return;
    focusEditWheelsInited = true;
    hourEl.innerHTML = "";
    for (let i = 0; i <= 3; i += 1) {
      const div = document.createElement("div");
      div.className = "tasks-focus-edit-timer__item";
      div.textContent = String(i);
      hourEl.appendChild(div);
    }
    for (const el of [minEl, secEl]) {
      el.innerHTML = "";
      for (let i = 0; i < 60; i += 1) {
        const div = document.createElement("div");
        div.className = "tasks-focus-edit-timer__item";
        div.textContent = String(i);
        el.appendChild(div);
      }
    }
    [
      { el: hourEl, max: 3 },
      { el: minEl, max: 59 },
      { el: secEl, max: 59 },
    ].forEach(({ el, max }) => {
      const snap = () => {
        const i = readFocusEditWheel(el, max);
        setFocusEditWheelScroll(el, i);
      };
      el.addEventListener("scrollend", snap);
      let st;
      el.addEventListener("scroll", () => {
        window.clearTimeout(st);
        st = window.setTimeout(snap, 120);
      });
    });
  }

  function formatFocusSessionClock(sec) {
    const n = Math.max(0, sec);
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateFocusSessionRing() {
    const arc = document.getElementById("focus-session-ring-arc");
    if (!arc || focusSessionInitialSeconds <= 0) return;
    const L = FOCUS_SESSION_RING_LEN;
    const elapsed = 1 - Math.max(0, focusMenuRunSeconds) / focusSessionInitialSeconds;
    arc.style.strokeDasharray = String(L);
    arc.style.strokeDashoffset = String(L * (1 - Math.min(1, Math.max(0, elapsed))));
  }

  function updateFocusSessionDisplay() {
    const timeEl = document.getElementById("focus-session-time");
    if (timeEl) timeEl.textContent = formatFocusSessionClock(focusMenuRunSeconds);
    updateFocusSessionRing();
  }

  function setFocusSessionPaused(on) {
    focusSessionPaused = on;
    const sep = document.getElementById("panel-focus-session");
    const pauseBtn = document.getElementById("focus-session-pause");
    sep?.classList.toggle("tasks-focus-session--paused", on);
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", on ? "true" : "false");
      pauseBtn.setAttribute("aria-label", on ? "Resume timer" : "Pause timer");
    }
    const bars = pauseBtn?.querySelector(".tasks-focus-session__pause-icon--bars");
    const play = pauseBtn?.querySelector(".tasks-focus-session__pause-icon--play");
    if (on) {
      bars?.classList.add("tasks-focus-session__pause-icon--hidden");
      play?.classList.remove("tasks-focus-session__pause-icon--hidden");
    } else {
      bars?.classList.remove("tasks-focus-session__pause-icon--hidden");
      play?.classList.add("tasks-focus-session__pause-icon--hidden");
    }
  }

  function startFocusSession() {
    closeFocusEditTimer();
    stopFocusTimer();
    const menu = document.getElementById("panel-focus-menu");
    menu?.classList.remove("tasks-focus-menu--open");
    menu?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-focus-menu-active");
    phone?.classList.remove("tasks-phone--focus-menu");

    focusSessionInitialSeconds = Math.max(1, focusMenuTotalSeconds);
    focusMenuRunSeconds = focusSessionInitialSeconds;
    focusSessionPaused = false;

    const sep = document.getElementById("panel-focus-session");
    if (!sep) return;
    setFocusSessionPaused(false);
    updateFocusSessionDisplay();
    sep.classList.add("tasks-focus-session--open");
    sep.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-focus-session-active");
    phone?.classList.add("tasks-phone--focus-session");

    focusMenuRunInterval = window.setInterval(() => {
      if (focusSessionPaused) return;
      focusMenuRunSeconds -= 1;
      updateFocusSessionDisplay();
      if (focusMenuRunSeconds <= 0) {
        stopFocusTimer();
        closeFocusSession();
        openFocusCelebrate();
      }
    }, 1000);
    requestAnimationFrame(() => {
      document.getElementById("focus-session-pause")?.focus({ preventScroll: true });
    });
  }

  function openFocusMenu(taskTitle, minutes, opts) {
    document.dispatchEvent(new CustomEvent("fullsweep:closeTaskActions"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeAddRoom"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeSelectTime"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeReschedule"));
    document.dispatchEvent(new CustomEvent("fullsweep:openAutoSanitize"));
    const panel = document.getElementById("panel-focus-menu");
    if (!panel) return;
    resetFocusMenuViews();
    const preserveDuration = opts && opts.preserveDuration === true;
    if (!preserveDuration) {
      const mins = typeof minutes === "number" && minutes > 0 ? Math.min(180, Math.floor(minutes)) : 30;
      focusMenuTotalSeconds = Math.min(FOCUS_MAX_SECONDS, Math.max(FOCUS_MIN_SECONDS, mins * 60));
    }
    const t = document.getElementById("focus-menu-task-title");
    if (t && typeof taskTitle === "string" && taskTitle.length > 0) t.textContent = taskTitle;
    updateFocusMenuDurationDisplay();
    panel.classList.add("tasks-focus-menu--open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-focus-menu-active");
    phone?.classList.add("tasks-phone--focus-menu");
    requestAnimationFrame(() => {
      document.getElementById("focus-menu-close")?.focus({ preventScroll: true });
    });
  }

  document.addEventListener("fullsweep:closeFocusMenu", closeFocusMenu);
  document.addEventListener("fullsweep:closeFocusSession", closeFocusSession);
  document.addEventListener("fullsweep:closeFocusBreak", closeFocusBreak);
  document.addEventListener("fullsweep:closeFocusCelebrate", closeFocusCelebrate);
  populateFocusEditWheels();

  document.addEventListener("fullsweep:closeAutoSanitize", closeAutoSanitize);

  document.getElementById("auto-sanitize-close")?.addEventListener("click", closeAutoSanitize);
  document.getElementById("auto-sanitize-dismiss")?.addEventListener("click", () => {
    closeAutoSanitize();
    openRescheduleScreen();
  });
  document.getElementById("auto-sanitize-begin")?.addEventListener("click", () => {
    const title = document.getElementById("auto-sanitize-task-title")?.textContent?.trim() || "";
    closeAutoSanitize();
    openFocusMenu(title, 30);
  });

  const RESCHEDULE_ITEMS = [
    { id: "rs1", title: "Change Bedsheets", room: "Bedroom", kind: "overdue", label: "2 days overdue" },
    { id: "rs2", title: "Wipe countertops", room: "Kitchen", kind: "upcoming", label: "Due in 3 days" },
    { id: "rs3", title: "Vacuum rug", room: "Living Room", kind: "upcoming", label: "Due in 5 days" },
    { id: "rs4", title: "Clean toilet", room: "Bathroom", kind: "overdue", label: "1 day overdue" },
    { id: "rs5", title: "Wash table linens", room: "Dining Room", kind: "upcoming", label: "Due in 1 day" },
    { id: "rs6", title: "Dust blinds", room: "Bedroom", kind: "upcoming", label: "Due in 4 days" },
  ];

  const RESCHEDULE_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const RESCHEDULE_MONTH_OPTIONS = RESCHEDULE_MONTHS.map(
    (m, i) => `<option value="${i + 1}">${m}</option>`
  ).join("");

  const RESCHEDULE_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    return `<option value="${d}">${String(d).padStart(2, "0")}</option>`;
  }).join("");

  const RESCHEDULE_YEAR_OPTIONS = [2025, 2026, 2027, 2028]
    .map((y) => `<option value="${y}">${y}</option>`)
    .join("");

  const RESCHEDULE_TIME_CHEVRON = `<svg class="tasks-reschedule-time-row__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>`;

  const rescheduleChosen = new Set();

  function escapeHtmlReschedule(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function closeSelectTimePanel() {
    const panel = document.getElementById("panel-select-time");
    if (!panel || !panel.classList.contains("tasks-select-time--open")) return;
    panel.classList.remove("tasks-select-time--open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-select-time-active");
    phone?.classList.remove("tasks-phone--select-time");
    document.getElementById("select-time-free-wrap")?.classList.remove("tasks-select-time__free-wrap--open");
    document.getElementById("select-time-free-toggle")?.setAttribute("aria-expanded", "false");
  }

  function syncSelectTimeFreeDateFromCard(li) {
    const el = document.getElementById("select-time-free-date");
    if (!el) return;
    if (!li) {
      el.textContent = "January 20, 2025";
      return;
    }
    const selects = li.querySelectorAll(".tasks-reschedule-date-row .tasks-reschedule-select");
    const mo = selects[0]?.selectedOptions[0]?.textContent?.trim();
    const dayNum = selects[1]?.value;
    const yr = selects[2]?.value;
    if (mo && dayNum && yr) {
      const d = parseInt(dayNum, 10);
      el.textContent = `${mo} ${d}, ${yr}`;
    } else {
      el.textContent = "January 20, 2025";
    }
  }

  function resetSelectTimePanelState() {
    document.querySelectorAll(".tasks-select-time__chip").forEach((c, i) => {
      c.classList.toggle("tasks-select-time__chip--selected", i === 0);
    });
    const sv = document.getElementById("select-time-start-val");
    const ev = document.getElementById("select-time-end-val");
    if (sv) sv.textContent = "10AM";
    if (ev) ev.textContent = "1PM";
    const ad = document.getElementById("select-time-all-day");
    if (ad) {
      ad.checked = false;
    }
    document.getElementById("panel-select-time")?.classList.remove("tasks-select-time--all-day");
    document.getElementById("select-time-free-wrap")?.classList.remove("tasks-select-time__free-wrap--open");
    document.getElementById("select-time-free-toggle")?.setAttribute("aria-expanded", "false");
  }

  function openSelectTimePanel(sourceLi) {
    document.dispatchEvent(new CustomEvent("fullsweep:openAutoSanitize"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeTaskActions"));
    const panel = document.getElementById("panel-select-time");
    if (!panel) return;
    resetSelectTimePanelState();
    syncSelectTimeFreeDateFromCard(sourceLi);
    panel.classList.add("tasks-select-time--open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-select-time-active");
    phone?.classList.add("tasks-phone--select-time");
    requestAnimationFrame(() => {
      document.getElementById("select-time-back")?.focus({ preventScroll: true });
    });
  }

  function closeRescheduleScreen() {
    closeFocusMenu();
    closeSelectTimePanel();
    const panel = document.getElementById("panel-reschedule");
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tasks-reschedule-active");
    phone?.classList.remove("tasks-phone--reschedule");
    rescheduleChosen.clear();
  }

  function renderRescheduleList() {
    const ul = document.getElementById("reschedule-list");
    if (!ul) return;
    ul.innerHTML = "";
    RESCHEDULE_ITEMS.forEach((item) => {
      const li = document.createElement("li");
      li.className = "tasks-reschedule-card";
      li.dataset.id = item.id;
      const badgeMod =
        item.kind === "overdue" ? "tasks-reschedule-card__badge--overdue" : "tasks-reschedule-card__badge--soon";
      const t = escapeHtmlReschedule(item.title);
      const r = escapeHtmlReschedule(item.room);
      const lab = escapeHtmlReschedule(item.label);
      const mid = `rs-${item.id}`;
      li.innerHTML = `
        <div class="tasks-reschedule-card__head">
          <button type="button" class="tasks-reschedule-card__text" aria-expanded="false" aria-controls="${mid}-panel" id="${mid}-label">
            <div class="tasks-reschedule-card__topline">
              <span class="tasks-reschedule-card__title">${t}</span>
              <span class="tasks-reschedule-card__badge ${badgeMod}">${lab}</span>
            </div>
            <span class="tasks-reschedule-card__room">${r}</span>
          </button>
          <button type="button" class="tasks-reschedule-card__pick" aria-pressed="false">
            <span class="tasks-reschedule-card__ring" aria-hidden="true"></span>
          </button>
        </div>
        <div class="tasks-reschedule-card__expand" id="${mid}-panel" role="region" aria-labelledby="${mid}-label">
          <div class="tasks-reschedule-card__expand-inner">
            <h3 class="tasks-reschedule-card__do-label">Do Date:</h3>
            <div class="tasks-reschedule-date-row">
              <select class="tasks-reschedule-select" id="${mid}-m" aria-label="Month">${RESCHEDULE_MONTH_OPTIONS}</select>
              <select class="tasks-reschedule-select" id="${mid}-d" aria-label="Day">${RESCHEDULE_DAY_OPTIONS}</select>
              <select class="tasks-reschedule-select" id="${mid}-y" aria-label="Year">${RESCHEDULE_YEAR_OPTIONS}</select>
            </div>
            <button type="button" class="tasks-reschedule-time-row">
              <span>Select Time</span>
              ${RESCHEDULE_TIME_CHEVRON}
            </button>
            <button type="button" class="tasks-reschedule-expand-save">Save</button>
          </div>
        </div>`;
      ul.appendChild(li);
      const pick = li.querySelector(".tasks-reschedule-card__pick");
      if (pick) pick.setAttribute("aria-label", `Select ${item.title}`);
      const monthSel = li.querySelector(`#${mid}-m`);
      const daySel = li.querySelector(`#${mid}-d`);
      const yearSel = li.querySelector(`#${mid}-y`);
      if (monthSel) monthSel.value = "1";
      if (daySel) daySel.value = "1";
      if (yearSel) yearSel.value = "2025";
    });
  }

  function openRescheduleScreen() {
    closeFocusMenu();
    document.dispatchEvent(new CustomEvent("fullsweep:openAutoSanitize"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeAddRoom"));
    document.dispatchEvent(new CustomEvent("fullsweep:closeTaskActions"));
    const panel = document.getElementById("panel-reschedule");
    if (!panel) return;
    rescheduleChosen.clear();
    renderRescheduleList();
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("tasks-reschedule-active");
    phone?.classList.add("tasks-phone--reschedule");
    document.getElementById("reschedule-close")?.focus({ preventScroll: true });
  }

  document.addEventListener("fullsweep:closeReschedule", closeRescheduleScreen);
  document.addEventListener("fullsweep:closeSelectTime", closeSelectTimePanel);

  document.getElementById("reschedule-close")?.addEventListener("click", closeRescheduleScreen);

  document.getElementById("select-time-all-day")?.addEventListener("change", (e) => {
    const t = e.target;
    const panel = document.getElementById("panel-select-time");
    if (t && t.id === "select-time-all-day" && panel) {
      panel.classList.toggle("tasks-select-time--all-day", t.checked);
    }
  });

  document.getElementById("panel-select-time")?.addEventListener("click", (e) => {
    if (e.target.closest("#select-time-back")) {
      closeSelectTimePanel();
      return;
    }
    const freeTog = e.target.closest("#select-time-free-toggle");
    if (freeTog) {
      const wrap = document.getElementById("select-time-free-wrap");
      const expanded = freeTog.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      freeTog.setAttribute("aria-expanded", next ? "true" : "false");
      wrap?.classList.toggle("tasks-select-time__free-wrap--open", next);
      return;
    }
    const chip = e.target.closest(".tasks-select-time__chip");
    if (chip) {
      document.querySelectorAll(".tasks-select-time__chip").forEach((c) => c.classList.remove("tasks-select-time__chip--selected"));
      chip.classList.add("tasks-select-time__chip--selected");
      const s = chip.getAttribute("data-start");
      const en = chip.getAttribute("data-end");
      const sv = document.getElementById("select-time-start-val");
      const ev = document.getElementById("select-time-end-val");
      if (s && sv) sv.textContent = s;
      if (en && ev) ev.textContent = en;
      return;
    }
    if (e.target.closest("#select-time-start-row") || e.target.closest("#select-time-end-row")) {
      toast("Custom time (demo).");
    }
  });

  document.getElementById("reschedule-list")?.addEventListener("click", (e) => {
    const ul = document.getElementById("reschedule-list");
    const pick = e.target.closest(".tasks-reschedule-card__pick");
    if (pick) {
      const li = pick.closest(".tasks-reschedule-card");
      const id = li?.dataset.id;
      if (!id) return;
      const wasSelected = pick.getAttribute("aria-pressed") === "true";
      pick.setAttribute("aria-pressed", wasSelected ? "false" : "true");
      if (wasSelected) rescheduleChosen.delete(id);
      else rescheduleChosen.add(id);
      return;
    }

    const saveBtn = e.target.closest(".tasks-reschedule-expand-save");
    if (saveBtn) {
      const li = saveBtn.closest(".tasks-reschedule-card");
      const title = li?.querySelector(".tasks-reschedule-card__title")?.textContent?.trim() || "task";
      const selects = li?.querySelectorAll(".tasks-reschedule-date-row .tasks-reschedule-select");
      const monthName = selects?.[0]?.selectedOptions[0]?.textContent?.trim();
      const dayNum = selects?.[1]?.value;
      const yearNum = selects?.[2]?.value;
      const dayPadded = dayNum ? String(dayNum).padStart(2, "0") : "";
      const dateBits = [monthName, dayPadded, yearNum].filter(Boolean).join(" ");
      toast(dateBits ? `Saved — ${title} · ${dateBits}` : `Saved — ${title}`);
      li?.classList.remove("tasks-reschedule-card--expand");
      li?.querySelector(".tasks-reschedule-card__text")?.setAttribute("aria-expanded", "false");
      return;
    }

    const timeBtn = e.target.closest(".tasks-reschedule-time-row");
    if (timeBtn) {
      const li = timeBtn.closest(".tasks-reschedule-card");
      openSelectTimePanel(li || null);
      return;
    }

    const textBtn = e.target.closest(".tasks-reschedule-card__text");
    if (!textBtn || !ul) return;
    const li = textBtn.closest(".tasks-reschedule-card");
    if (!li) return;
    ul.querySelectorAll(".tasks-reschedule-card").forEach((card) => {
      if (card !== li) {
        card.classList.remove("tasks-reschedule-card--expand");
        card.querySelector(".tasks-reschedule-card__text")?.setAttribute("aria-expanded", "false");
      }
    });
    li.classList.toggle("tasks-reschedule-card--expand");
    const open = li.classList.contains("tasks-reschedule-card--expand");
    textBtn.setAttribute("aria-expanded", open ? "true" : "false");

    const ringBtn = li.querySelector(".tasks-reschedule-card__pick");
    const cid = li.dataset.id;
    if (ringBtn && cid) {
      ringBtn.setAttribute("aria-pressed", "true");
      rescheduleChosen.add(cid);
    }
  });

  document.getElementById("reschedule-done")?.addEventListener("click", () => {
    const n = rescheduleChosen.size;
    if (n === 0) {
      toast("Select at least one task to reschedule.");
      return;
    }
    toast(`Got it — we’ll help reschedule ${n} task${n === 1 ? "" : "s"}.`);
    closeRescheduleScreen();
  });

  document.querySelectorAll(".tasks-shuffle:not(.tasks-shuffle--rooms)").forEach((btn) => {
    btn.addEventListener("click", () => {
      openAutoSanitize();
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

  document.addEventListener("fullsweep:openAutoSanitize", () => {
    if (calendarExpandedOpen) setCalendarExpanded(false);
  });

  expandCalBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setCalendarExpanded(!calendarExpandedOpen);
  });

  document.getElementById("focus-menu-close")?.addEventListener("click", closeFocusMenu);
  document.getElementById("focus-menu-begin-circle")?.addEventListener("click", startFocusSession);
  document.getElementById("focus-session-back")?.addEventListener("click", () => {
    closeFocusSession();
    openFocusMenu(null, null, { preserveDuration: true });
  });
  document.getElementById("focus-session-pause")?.addEventListener("click", () => {
    setFocusSessionPaused(!focusSessionPaused);
  });
  document.getElementById("focus-session-break")?.addEventListener("click", openFocusBreak);
  document.getElementById("focus-break-back")?.addEventListener("click", closeFocusBreak);
  document.getElementById("focus-break-ready")?.addEventListener("click", closeFocusBreak);
  document.getElementById("focus-break-pause")?.addEventListener("click", () => {
    setFocusBreakPaused(!focusBreakPaused);
  });
  document.getElementById("focus-session-finish")?.addEventListener("click", () => {
    closeFocusSession();
    openFocusCelebrate();
  });
  document.getElementById("focus-celebrate-btn")?.addEventListener("click", () => {
    closeFocusCelebrate();
    closeFocusMenu();
  });
  document.getElementById("focus-menu-edit-timer")?.addEventListener("click", openFocusEditTimer);
  document.getElementById("focus-edit-timer-save")?.addEventListener("click", applyFocusEditTimerSave);
  document.getElementById("focus-edit-timer-close")?.addEventListener("click", closeFocusEditTimer);
  document.getElementById("focus-edit-timer-shade")?.addEventListener("click", closeFocusEditTimer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const celPanel = document.getElementById("panel-focus-celebrate");
      if (celPanel?.classList.contains("tasks-focus-celebrate--open")) {
        closeFocusCelebrate();
        closeFocusMenu();
        return;
      }
      const fbPanel = document.getElementById("panel-focus-break");
      if (fbPanel?.classList.contains("tasks-focus-break--open")) {
        closeFocusBreak();
        return;
      }
      const fsPanel = document.getElementById("panel-focus-session");
      if (fsPanel?.classList.contains("tasks-focus-session--open")) {
        closeFocusSession();
        openFocusMenu(null, null, { preserveDuration: true });
        return;
      }
      const fmPanel = document.getElementById("panel-focus-menu");
      const editOv = document.getElementById("focus-edit-timer-overlay");
      if (fmPanel?.classList.contains("tasks-focus-menu--open") && editOv && !editOv.hidden) {
        closeFocusEditTimer();
        return;
      }
      if (fmPanel?.classList.contains("tasks-focus-menu--open")) {
        closeFocusMenu();
        return;
      }
      const stPanel = document.getElementById("panel-select-time");
      if (stPanel?.classList.contains("tasks-select-time--open")) {
        closeSelectTimePanel();
        return;
      }
      const rsPanel = document.getElementById("panel-reschedule");
      if (rsPanel && !rsPanel.hidden) {
        closeRescheduleScreen();
        return;
      }
      const asPanel = document.getElementById("panel-auto-sanitize");
      if (asPanel && !asPanel.hidden) {
        closeAutoSanitize();
        return;
      }
      if (calendarExpandedOpen) {
        setCalendarExpanded(false);
      }
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
