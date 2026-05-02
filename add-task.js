(function () {
  "use strict";

  const TASKS_BY_ROOM = {
    Bathroom: ["Clean Sink", "Clean Toilet", "Wash Rugs", "Scrub shower"],
    Bedroom: ["Vacuum Floor", "Change Bed Sheets", "Organize Closet", "Dust"],
    Kitchen: ["Clean Counters", "Take Out Trash", "Mop Floor"],
    "Living Room": ["Vacuum Carpet", "Dust Surfaces", "Clean windows"],
    "Dining Room": ["Wipe Table", "Sweep Floor"],
    Other: ["General tidy", "Declutter", "Custom task"],
  };

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const UNIT_OPTIONS = [
    { key: "day", label: "days" },
    { key: "week", label: "weeks" },
    { key: "month", label: "months" },
    { key: "year", label: "years" },
  ];

  const MINUTE_OPTS = [];
  for (let m = 0; m < 60; m += 5) MINUTE_OPTS.push(m);

  const fabMenu = document.getElementById("tasks-fab-menu");
  const fabBtn = document.getElementById("tasks-fab");
  const fabOnetime = document.getElementById("fab-onetime");
  const fabRecurring = document.getElementById("fab-recurring");

  const flow = document.getElementById("onetime-flow");
  const step1 = document.getElementById("onetime-step1");
  const step2 = document.getElementById("onetime-step2");
  const onetimeCloseBtns = flow?.querySelectorAll("[data-onetime-close]");
  const onetimeBack = document.getElementById("onetime-back");
  const onetimeNext = document.getElementById("onetime-next");
  const onetimeSave = document.getElementById("onetime-save");

  const roomSelect = document.getElementById("onetime-room");
  const taskSelect = document.getElementById("onetime-task");
  const notesInput = document.getElementById("onetime-notes");
  const monthSel = document.getElementById("onetime-month");
  const daySel = document.getElementById("onetime-day");
  const yearSel = document.getElementById("onetime-year");
  const allDayBtn = document.getElementById("onetime-allday");
  const timeDetails = document.getElementById("onetime-time-details");
  const notifySwitch = document.getElementById("onetime-notify");
  const startBtn = document.getElementById("onetime-start-btn");
  const endBtn = document.getElementById("onetime-end-btn");
  const startWheel = document.getElementById("onetime-start-wheel");
  const endWheel = document.getElementById("onetime-end-wheel");

  const recurringFlow = document.getElementById("recurring-flow");
  const recurringStep1 = document.getElementById("recurring-step1");
  const recurringStep2 = document.getElementById("recurring-step2");
  const recurringCloseBtns = recurringFlow?.querySelectorAll("[data-recurring-close]");
  const recurringBack = document.getElementById("recurring-back");
  const recurringNext = document.getElementById("recurring-next");
  const recurringSave = document.getElementById("recurring-save");
  const recRoomSelect = document.getElementById("recurring-room");
  const recTaskSelect = document.getElementById("recurring-task");
  const recNotesInput = document.getElementById("recurring-notes");
  const recurringNotify = document.getElementById("recurring-notify");
  const recStartBtn = document.getElementById("rec-start-btn");
  const recEndBtn = document.getElementById("rec-end-btn");
  const recStartWheel = document.getElementById("rec-start-wheel");
  const recEndWheel = document.getElementById("rec-end-wheel");
  const recurringRepeatBtn = document.getElementById("recurring-repeat-btn");
  const recurringRepeatBack = document.getElementById("recurring-repeat-back");
  const repeatScreen = document.getElementById("recurring-repeat-screen");
  const recurringRepeatLabel = document.getElementById("recurring-repeat-label");
  const recurringComplete = document.getElementById("recurring-complete");
  const completeTaskTitle = document.getElementById("complete-task-title");
  const completeEveryLine = document.getElementById("complete-every-line");
  const recurringCelebrate = document.getElementById("recurring-celebrate");

  const toastRoot = document.getElementById("tasks-toast-root");

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

  function refreshBodyScrollLock() {
    const open = Boolean((flow && !flow.hidden) || (recurringFlow && !recurringFlow.hidden));
    document.body.classList.toggle("task-add-flow-open", open);
    document.body.classList.toggle("onetime-flow-open", open);
  }

  function closeFabMenu() {
    fabMenu?.setAttribute("hidden", "");
    fabBtn?.setAttribute("aria-expanded", "false");
  }

  function toggleFabMenu() {
    if (!fabMenu || !fabBtn) return;
    const open = fabMenu.hasAttribute("hidden");
    if (open) {
      fabMenu.removeAttribute("hidden");
      fabBtn.setAttribute("aria-expanded", "true");
    } else {
      closeFabMenu();
    }
  }

  function populateTaskOptions(selectEl, room) {
    if (!selectEl) return;
    if (!room) {
      selectEl.innerHTML = '<option value="" disabled selected>Choose Task</option>';
      return;
    }
    const tasks = TASKS_BY_ROOM[room] || TASKS_BY_ROOM.Other;
    const opts = tasks
      .map((t) => `<option value="${t.replace(/"/g, "&quot;")}">${t}</option>`)
      .join("");
    selectEl.innerHTML = `<option value="" disabled selected>Choose Task</option>${opts}`;
  }

  function populateDateSelects() {
    const d = new Date();
    if (monthSel) {
      const months = [
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
      monthSel.innerHTML = months
        .map((m, i) => {
          const sel = i === d.getMonth() ? " selected" : "";
          return `<option value="${i}"${sel}>${m}</option>`;
        })
        .join("");
    }
    if (daySel) {
      daySel.innerHTML = "";
      for (let day = 1; day <= 31; day++) {
        const sel = day === d.getDate() ? " selected" : "";
        daySel.innerHTML += `<option value="${day}"${sel}>${String(day).padStart(2, "0")}</option>`;
      }
    }
    if (yearSel) {
      const y = d.getFullYear();
      yearSel.innerHTML = "";
      for (let yr = y - 1; yr <= y + 3; yr++) {
        const sel = yr === y ? " selected" : "";
        yearSel.innerHTML += `<option value="${yr}"${sel}>${yr}</option>`;
      }
    }
  }

  function setEffort(root, attrName, level) {
    root?.querySelectorAll(`[${attrName}]`).forEach((btn) => {
      const on = btn.getAttribute(attrName) === level;
      btn.classList.toggle("onetime-effort-card--selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function showStep(n) {
    if (step1) step1.hidden = n !== 1;
    if (step2) step2.hidden = n !== 2;
  }

  function showRecurringStep(n) {
    if (recurringStep1) recurringStep1.hidden = n !== 1;
    if (recurringStep2) recurringStep2.hidden = n !== 2;
  }

  function closeRecurringFlow() {
    if (!recurringFlow) return;
    recurringFlow.hidden = true;
    recurringFlow.setAttribute("aria-hidden", "true");
    if (repeatScreen) repeatScreen.hidden = true;
    if (recurringComplete) recurringComplete.hidden = true;
    showRecurringStep(1);
    closeRecTimeWheels();
    refreshBodyScrollLock();
  }

  function openOnetimeFlow() {
    closeFabMenu();
    closeRecurringFlow();
    if (!flow) return;
    populateDateSelects();
    if (roomSelect) roomSelect.selectedIndex = 0;
    populateTaskOptions(taskSelect, "");
    if (notesInput) notesInput.value = "";
    setEffort(flow, "data-effort", "low");
    if (allDayBtn) {
      allDayBtn.setAttribute("aria-checked", "false");
      syncAllDayUi();
    }
    if (notifySwitch) notifySwitch.setAttribute("aria-checked", "false");
    ensureTimeWheels();
    closeTimeWheels();
    setWheelValues("start", 10, 0, 0);
    setWheelValues("end", 1, 0, 1);
    updateTimeLabel("start");
    updateTimeLabel("end");
    flow.hidden = false;
    flow.setAttribute("aria-hidden", "false");
    showStep(1);
    refreshBodyScrollLock();
  }

  function closeOnetimeFlow() {
    if (!flow) return;
    flow.hidden = true;
    flow.setAttribute("aria-hidden", "true");
    refreshBodyScrollLock();
  }

  function buildRepeatDayList() {
    const list = document.getElementById("repeat-day-list");
    if (!list || list.dataset.built) return;
    list.dataset.built = "1";
    list.innerHTML = DAY_NAMES.map(
      (name, i) =>
        `<label class="repeat-day-row"><span>${name}</span><input type="checkbox" name="repeat-day" value="${i}" /></label>`
    ).join("");
  }

  function resetRepeatDayChecks() {
    const list = document.getElementById("repeat-day-list");
    if (!list) return;
    list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = Number(cb.value) === 1;
    });
    updateRepeatLabel();
  }

  function updateRepeatLabel() {
    if (!recurringRepeatLabel) return;
    const list = document.getElementById("repeat-day-list");
    if (!list) return;
    const checked = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map((c) => Number(c.value));
    checked.sort((a, b) => a - b);
    if (checked.length === 0) {
      recurringRepeatLabel.textContent = "Select days";
    } else if (checked.length === 7) {
      recurringRepeatLabel.textContent = "Every day";
    } else if (checked.length === 1) {
      recurringRepeatLabel.textContent = `On ${DAY_NAMES[checked[0]]}`;
    } else {
      recurringRepeatLabel.textContent = checked.map((d) => DAY_SHORT[d]).join(", ");
    }
  }

  function formatEveryLine(n, unitKey) {
    const u = {
      day: ["day", "days"],
      week: ["week", "weeks"],
      month: ["month", "months"],
      year: ["year", "years"],
    }[unitKey];
    if (!u) return "Every week";
    const phrase = n === 1 ? u[0] : `${n} ${u[1]}`;
    return `Every ${phrase}`;
  }

  function readIndexAtMid(el) {
    if (!el) return 0;
    const mid = el.scrollTop + el.clientHeight / 2;
    const items = el.querySelectorAll(".onetime-time-wheel__item");
    let bestI = 0;
    let bestD = Infinity;
    items.forEach((node, i) => {
      const c = node.offsetTop + node.offsetHeight / 2;
      const d = Math.abs(c - mid);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    return bestI;
  }

  function readEveryState() {
    const intEl = document.getElementById("rec-scroll-interval");
    const unitEl = document.getElementById("rec-scroll-unit");
    const n = readIndexAtMid(intEl) + 1;
    const ui = readIndexAtMid(unitEl);
    const unitKey = UNIT_OPTIONS[ui]?.key ?? "week";
    return { n, unitKey };
  }

  function openRecurringFlow() {
    closeFabMenu();
    closeOnetimeFlow();
    if (!recurringFlow) return;
    buildRepeatDayList();
    resetRepeatDayChecks();
    if (repeatScreen) repeatScreen.hidden = true;
    if (recurringComplete) recurringComplete.hidden = true;
    showRecurringStep(1);
    if (recRoomSelect) recRoomSelect.selectedIndex = 0;
    populateTaskOptions(recTaskSelect, "");
    if (recNotesInput) recNotesInput.value = "";
    setEffort(recurringFlow, "data-rec-effort", "low");
    if (recurringNotify) recurringNotify.setAttribute("aria-checked", "false");
    ensureEveryWheel();
    ensureRecTimeWheels();
    closeRecTimeWheels();
    setEveryWheelValues(2, 1);
    requestAnimationFrame(() => {
      snapColumnImmediate(document.getElementById("rec-scroll-interval"));
      snapColumnImmediate(document.getElementById("rec-scroll-unit"));
    });
    setRecWheelValues("start", 10, 0, 0);
    setRecWheelValues("end", 1, 0, 1);
    updateRecTimeLabel("start");
    updateRecTimeLabel("end");
    recurringFlow.hidden = false;
    recurringFlow.setAttribute("aria-hidden", "false");
    refreshBodyScrollLock();
  }

  function syncAllDayUi() {
    const on = allDayBtn?.getAttribute("aria-checked") === "true";
    if (timeDetails) timeDetails.hidden = on;
  }

  let timeWheelsBuilt = false;
  let recTimeWheelsBuilt = false;
  let everyWheelsBuilt = false;

  function buildTimeWheelColumns() {
    const buildH = (el) => {
      if (!el) return;
      el.innerHTML = Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        return `<div class="onetime-time-wheel__item" data-value="${h}">${h}</div>`;
      }).join("");
    };
    const buildM = (el) => {
      if (!el) return;
      el.innerHTML = MINUTE_OPTS.map(
        (m) => `<div class="onetime-time-wheel__item" data-value="${m}">${String(m).padStart(2, "0")}</div>`
      ).join("");
    };
    const buildAp = (el) => {
      if (!el) return;
      el.innerHTML =
        '<div class="onetime-time-wheel__item" data-value="0">AM</div><div class="onetime-time-wheel__item" data-value="1">PM</div>';
    };
    ["start", "end"].forEach((p) => {
      buildH(document.getElementById(`onetime-scroll-${p}-h`));
      buildM(document.getElementById(`onetime-scroll-${p}-m`));
      buildAp(document.getElementById(`onetime-scroll-${p}-ap`));
    });
  }

  function buildRecTimeWheelColumns() {
    const buildH = (el) => {
      if (!el) return;
      el.innerHTML = Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        return `<div class="onetime-time-wheel__item" data-value="${h}">${h}</div>`;
      }).join("");
    };
    const buildM = (el) => {
      if (!el) return;
      el.innerHTML = MINUTE_OPTS.map(
        (m) => `<div class="onetime-time-wheel__item" data-value="${m}">${String(m).padStart(2, "0")}</div>`
      ).join("");
    };
    const buildAp = (el) => {
      if (!el) return;
      el.innerHTML =
        '<div class="onetime-time-wheel__item" data-value="0">AM</div><div class="onetime-time-wheel__item" data-value="1">PM</div>';
    };
    ["start", "end"].forEach((p) => {
      buildH(document.getElementById(`rec-scroll-${p}-h`));
      buildM(document.getElementById(`rec-scroll-${p}-m`));
      buildAp(document.getElementById(`rec-scroll-${p}-ap`));
    });
  }

  function buildEveryWheelColumns() {
    const intEl = document.getElementById("rec-scroll-interval");
    const unitEl = document.getElementById("rec-scroll-unit");
    if (!intEl || !unitEl) return;
    intEl.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const n = i + 1;
      return `<div class="onetime-time-wheel__item" data-value="${n}">${n}</div>`;
    }).join("");
    unitEl.innerHTML = UNIT_OPTIONS.map(
      (u) => `<div class="onetime-time-wheel__item" data-unit="${u.key}">${u.label}</div>`
    ).join("");
  }

  function snapColumnToNearest(el) {
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2;
    const items = el.querySelectorAll(".onetime-time-wheel__item");
    let best = null;
    let bestD = Infinity;
    items.forEach((node) => {
      const c = node.offsetTop + node.offsetHeight / 2;
      const d = Math.abs(c - mid);
      if (d < bestD) {
        bestD = d;
        best = node;
      }
    });
    if (!best) return;
    const top = best.offsetTop - el.clientHeight / 2 + best.offsetHeight / 2;
    el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function snapColumnImmediate(el) {
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 2;
    const items = el.querySelectorAll(".onetime-time-wheel__item");
    let best = null;
    let bestD = Infinity;
    items.forEach((node) => {
      const c = node.offsetTop + node.offsetHeight / 2;
      const d = Math.abs(c - mid);
      if (d < bestD) {
        bestD = d;
        best = node;
      }
    });
    if (!best) return;
    const top = best.offsetTop - el.clientHeight / 2 + best.offsetHeight / 2;
    el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }

  function readWheelValues(which) {
    const hEl = document.getElementById(`onetime-scroll-${which}-h`);
    const mEl = document.getElementById(`onetime-scroll-${which}-m`);
    const apEl = document.getElementById(`onetime-scroll-${which}-ap`);
    const idxAtMid = (el) => readIndexAtMid(el);
    return {
      hour: idxAtMid(hEl) + 1,
      minute: MINUTE_OPTS[idxAtMid(mEl)] ?? 0,
      ap: idxAtMid(apEl),
    };
  }

  function readRecWheelValues(which) {
    const hEl = document.getElementById(`rec-scroll-${which}-h`);
    const mEl = document.getElementById(`rec-scroll-${which}-m`);
    const apEl = document.getElementById(`rec-scroll-${which}-ap`);
    const idxAtMid = (el) => readIndexAtMid(el);
    return {
      hour: idxAtMid(hEl) + 1,
      minute: MINUTE_OPTS[idxAtMid(mEl)] ?? 0,
      ap: idxAtMid(apEl),
    };
  }

  function formatTimeLabel(hour, minute, ap) {
    const apm = ap === 0 ? "AM" : "PM";
    if (minute === 0) return `${hour}${apm}`;
    return `${hour}:${String(minute).padStart(2, "0")}${apm}`;
  }

  function updateTimeLabel(which) {
    const { hour, minute, ap } = readWheelValues(which);
    const el = document.getElementById(`onetime-${which}-display`);
    if (el) el.textContent = formatTimeLabel(hour, minute, ap);
  }

  function updateRecTimeLabel(which) {
    const { hour, minute, ap } = readRecWheelValues(which);
    const el = document.getElementById(`rec-${which}-display`);
    if (el) el.textContent = formatTimeLabel(hour, minute, ap);
  }

  function setWheelValues(which, hour, minute, apIndex) {
    const scrollToIndex = (el, index) => {
      if (!el) return;
      const items = el.querySelectorAll(".onetime-time-wheel__item");
      const item = items[index];
      if (!item) return;
      const top = item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    };
    scrollToIndex(document.getElementById(`onetime-scroll-${which}-h`), hour - 1);
    const mi = MINUTE_OPTS.indexOf(minute);
    scrollToIndex(document.getElementById(`onetime-scroll-${which}-m`), mi >= 0 ? mi : 0);
    scrollToIndex(document.getElementById(`onetime-scroll-${which}-ap`), apIndex);
  }

  function setRecWheelValues(which, hour, minute, apIndex) {
    const scrollToIndex = (el, index) => {
      if (!el) return;
      const items = el.querySelectorAll(".onetime-time-wheel__item");
      const item = items[index];
      if (!item) return;
      const top = item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    };
    scrollToIndex(document.getElementById(`rec-scroll-${which}-h`), hour - 1);
    const mi = MINUTE_OPTS.indexOf(minute);
    scrollToIndex(document.getElementById(`rec-scroll-${which}-m`), mi >= 0 ? mi : 0);
    scrollToIndex(document.getElementById(`rec-scroll-${which}-ap`), apIndex);
  }

  function setEveryWheelValues(n, unitIndex) {
    const intEl = document.getElementById("rec-scroll-interval");
    const unitEl = document.getElementById("rec-scroll-unit");
    const scrollToIndex = (el, index) => {
      if (!el) return;
      const items = el.querySelectorAll(".onetime-time-wheel__item");
      const item = items[index];
      if (!item) return;
      const top = item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    };
    scrollToIndex(intEl, Math.max(0, Math.min(11, n - 1)));
    scrollToIndex(unitEl, Math.max(0, Math.min(UNIT_OPTIONS.length - 1, unitIndex)));
  }

  function bindSnapScroll(el, onSettle) {
    if (!el || el.dataset.snapBound) return;
    el.dataset.snapBound = "1";
    let t;
    el.addEventListener(
      "scroll",
      () => {
        clearTimeout(t);
        t = setTimeout(() => {
          snapColumnToNearest(el);
          setTimeout(() => onSettle?.(), 220);
        }, 75);
      },
      { passive: true }
    );
  }

  function attachWheelGroup(which) {
    ["h", "m", "ap"].forEach((x) => {
      const el = document.getElementById(`onetime-scroll-${which}-${x}`);
      bindSnapScroll(el, () => updateTimeLabel(which));
    });
  }

  function attachRecWheelGroup(which) {
    ["h", "m", "ap"].forEach((x) => {
      const el = document.getElementById(`rec-scroll-${which}-${x}`);
      bindSnapScroll(el, () => updateRecTimeLabel(which));
    });
  }

  function ensureTimeWheels() {
    if (timeWheelsBuilt) return;
    timeWheelsBuilt = true;
    buildTimeWheelColumns();
    attachWheelGroup("start");
    attachWheelGroup("end");
  }

  function ensureRecTimeWheels() {
    if (recTimeWheelsBuilt) return;
    recTimeWheelsBuilt = true;
    buildRecTimeWheelColumns();
    attachRecWheelGroup("start");
    attachRecWheelGroup("end");
  }

  function ensureEveryWheel() {
    if (everyWheelsBuilt) return;
    everyWheelsBuilt = true;
    buildEveryWheelColumns();
    bindSnapScroll(document.getElementById("rec-scroll-interval"), () => {});
    bindSnapScroll(document.getElementById("rec-scroll-unit"), () => {});
  }

  function closeTimeWheels() {
    if (startWheel) startWheel.hidden = true;
    if (endWheel) endWheel.hidden = true;
    startBtn?.setAttribute("aria-expanded", "false");
    endBtn?.setAttribute("aria-expanded", "false");
  }

  function closeRecTimeWheels() {
    if (recStartWheel) recStartWheel.hidden = true;
    if (recEndWheel) recEndWheel.hidden = true;
    recStartBtn?.setAttribute("aria-expanded", "false");
    recEndBtn?.setAttribute("aria-expanded", "false");
  }

  fabBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFabMenu();
  });

  fabMenu?.addEventListener("click", (e) => e.stopPropagation());

  fabOnetime?.addEventListener("click", () => openOnetimeFlow());

  fabRecurring?.addEventListener("click", () => openRecurringFlow());

  document.addEventListener("click", () => closeFabMenu());

  roomSelect?.addEventListener("change", () => {
    populateTaskOptions(taskSelect, roomSelect.value);
  });

  recRoomSelect?.addEventListener("change", () => {
    populateTaskOptions(recTaskSelect, recRoomSelect.value);
  });

  flow?.querySelectorAll("[data-effort]").forEach((btn) => {
    btn.addEventListener("click", () => setEffort(flow, "data-effort", btn.getAttribute("data-effort") || "low"));
  });

  recurringFlow?.querySelectorAll("[data-rec-effort]").forEach((btn) => {
    btn.addEventListener("click", () =>
      setEffort(recurringFlow, "data-rec-effort", btn.getAttribute("data-rec-effort") || "low")
    );
  });

  onetimeNext?.addEventListener("click", () => {
    if (!roomSelect?.value || !taskSelect?.value) {
      toast("Choose a room and task to continue.");
      return;
    }
    closeTimeWheels();
    showStep(2);
  });

  recurringNext?.addEventListener("click", () => {
    if (!recRoomSelect?.value || !recTaskSelect?.value) {
      toast("Choose a room and task to continue.");
      return;
    }
    closeRecTimeWheels();
    ensureEveryWheel();
    ensureRecTimeWheels();
    showRecurringStep(2);
  });

  onetimeBack?.addEventListener("click", () => {
    closeTimeWheels();
    showStep(1);
  });

  recurringBack?.addEventListener("click", () => {
    closeRecTimeWheels();
    showRecurringStep(1);
  });

  recurringRepeatBtn?.addEventListener("click", () => {
    if (repeatScreen) repeatScreen.hidden = false;
  });

  recurringRepeatBack?.addEventListener("click", () => {
    if (repeatScreen) repeatScreen.hidden = true;
    updateRepeatLabel();
  });

  repeatScreen?.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) updateRepeatLabel();
  });

  onetimeCloseBtns?.forEach((btn) => btn.addEventListener("click", closeOnetimeFlow));

  recurringCloseBtns?.forEach((btn) => btn.addEventListener("click", closeRecurringFlow));

  recurringSave?.addEventListener("click", () => {
    const name = recTaskSelect?.value || "Task";
    const { n, unitKey } = readEveryState();
    if (completeTaskTitle) completeTaskTitle.textContent = name;
    if (completeEveryLine) completeEveryLine.textContent = formatEveryLine(n, unitKey);
    if (recurringStep1) recurringStep1.hidden = true;
    if (recurringStep2) recurringStep2.hidden = true;
    if (recurringComplete) recurringComplete.hidden = false;
  });

  recurringCelebrate?.addEventListener("click", () => {
    const name = recTaskSelect?.value || "Task";
    toast(`Celebrating: ${name}`);
    closeRecurringFlow();
  });

  allDayBtn?.addEventListener("click", () => {
    const on = allDayBtn.getAttribute("aria-checked") === "true";
    allDayBtn.setAttribute("aria-checked", on ? "false" : "true");
    syncAllDayUi();
  });

  notifySwitch?.addEventListener("click", () => {
    const on = notifySwitch.getAttribute("aria-checked") === "true";
    notifySwitch.setAttribute("aria-checked", on ? "false" : "true");
  });

  recurringNotify?.addEventListener("click", () => {
    const on = recurringNotify.getAttribute("aria-checked") === "true";
    recurringNotify.setAttribute("aria-checked", on ? "false" : "true");
  });

  onetimeSave?.addEventListener("click", () => {
    const name = taskSelect?.value || "Task";
    toast(`Saved: ${name}`);
    closeOnetimeFlow();
  });

  startBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    ensureTimeWheels();
    const wasOpen = startWheel && !startWheel.hidden;
    if (endWheel) endWheel.hidden = true;
    endBtn?.setAttribute("aria-expanded", "false");
    if (wasOpen) {
      startWheel.hidden = true;
      startBtn.setAttribute("aria-expanded", "false");
    } else if (startWheel) {
      startWheel.hidden = false;
      startBtn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => {
        ["h", "m", "ap"].forEach((x) => snapColumnImmediate(document.getElementById(`onetime-scroll-start-${x}`)));
        updateTimeLabel("start");
      });
    }
  });

  endBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    ensureTimeWheels();
    const wasOpen = endWheel && !endWheel.hidden;
    if (startWheel) startWheel.hidden = true;
    startBtn?.setAttribute("aria-expanded", "false");
    if (wasOpen) {
      endWheel.hidden = true;
      endBtn.setAttribute("aria-expanded", "false");
    } else if (endWheel) {
      endWheel.hidden = false;
      endBtn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => {
        ["h", "m", "ap"].forEach((x) => snapColumnImmediate(document.getElementById(`onetime-scroll-end-${x}`)));
        updateTimeLabel("end");
      });
    }
  });

  recStartBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    ensureRecTimeWheels();
    const wasOpen = recStartWheel && !recStartWheel.hidden;
    if (recEndWheel) recEndWheel.hidden = true;
    recEndBtn?.setAttribute("aria-expanded", "false");
    if (wasOpen) {
      recStartWheel.hidden = true;
      recStartBtn.setAttribute("aria-expanded", "false");
    } else if (recStartWheel) {
      recStartWheel.hidden = false;
      recStartBtn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => {
        ["h", "m", "ap"].forEach((x) => snapColumnImmediate(document.getElementById(`rec-scroll-start-${x}`)));
        updateRecTimeLabel("start");
      });
    }
  });

  recEndBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    ensureRecTimeWheels();
    const wasOpen = recEndWheel && !recEndWheel.hidden;
    if (recStartWheel) recStartWheel.hidden = true;
    recStartBtn?.setAttribute("aria-expanded", "false");
    if (wasOpen) {
      recEndWheel.hidden = true;
      recEndBtn.setAttribute("aria-expanded", "false");
    } else if (recEndWheel) {
      recEndWheel.hidden = false;
      recEndBtn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => {
        ["h", "m", "ap"].forEach((x) => snapColumnImmediate(document.getElementById(`rec-scroll-end-${x}`)));
        updateRecTimeLabel("end");
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (repeatScreen && !repeatScreen.hidden) {
      repeatScreen.hidden = true;
      updateRepeatLabel();
      return;
    }
    if (recurringComplete && !recurringComplete.hidden) {
      recurringComplete.hidden = true;
      if (recurringStep1) recurringStep1.hidden = true;
      if (recurringStep2) recurringStep2.hidden = false;
      return;
    }
    if (recurringFlow && !recurringFlow.hidden) {
      closeRecurringFlow();
      return;
    }
    if (flow && !flow.hidden) {
      closeOnetimeFlow();
      return;
    }
    closeFabMenu();
  });
})();
