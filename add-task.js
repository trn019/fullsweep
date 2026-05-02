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

  function populateTaskOptions(room) {
    if (!taskSelect) return;
    if (!room) {
      taskSelect.innerHTML = '<option value="" disabled selected>Choose Task</option>';
      return;
    }
    const tasks = TASKS_BY_ROOM[room] || TASKS_BY_ROOM.Other;
    const opts = tasks
      .map((t) => `<option value="${t.replace(/"/g, "&quot;")}">${t}</option>`)
      .join("");
    taskSelect.innerHTML = `<option value="" disabled selected>Choose Task</option>${opts}`;
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
      monthSel.innerHTML = months.map((m, i) => {
        const sel = i === d.getMonth() ? " selected" : "";
        return `<option value="${i}"${sel}>${m}</option>`;
      }).join("");
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

  function setEffort(level) {
    flow?.querySelectorAll(".onetime-effort-card").forEach((btn) => {
      const on = btn.getAttribute("data-effort") === level;
      btn.classList.toggle("onetime-effort-card--selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function showStep(n) {
    if (step1) step1.hidden = n !== 1;
    if (step2) step2.hidden = n !== 2;
  }

  function openOnetimeFlow() {
    closeFabMenu();
    if (!flow) return;
    populateDateSelects();
    if (roomSelect) roomSelect.selectedIndex = 0;
    populateTaskOptions("");
    if (notesInput) notesInput.value = "";
    setEffort("low");
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
    document.body.classList.add("onetime-flow-open");
    showStep(1);
  }

  function closeOnetimeFlow() {
    if (!flow) return;
    flow.hidden = true;
    flow.setAttribute("aria-hidden", "true");
    document.body.classList.remove("onetime-flow-open");
  }

  function syncAllDayUi() {
    const on = allDayBtn?.getAttribute("aria-checked") === "true";
    if (timeDetails) timeDetails.hidden = on;
  }

  let timeWheelsBuilt = false;

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
    const idxAtMid = (el) => {
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
    };
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

  function attachWheelGroup(which) {
    ["h", "m", "ap"].forEach((x) => {
      const el = document.getElementById(`onetime-scroll-${which}-${x}`);
      if (!el || el.dataset.snapBound) return;
      el.dataset.snapBound = "1";
      let t;
      el.addEventListener(
        "scroll",
        () => {
          clearTimeout(t);
          t = setTimeout(() => {
            snapColumnToNearest(el);
            setTimeout(() => updateTimeLabel(which), 220);
          }, 75);
        },
        { passive: true }
      );
    });
  }

  function ensureTimeWheels() {
    if (timeWheelsBuilt) return;
    timeWheelsBuilt = true;
    buildTimeWheelColumns();
    attachWheelGroup("start");
    attachWheelGroup("end");
  }

  function closeTimeWheels() {
    if (startWheel) startWheel.hidden = true;
    if (endWheel) endWheel.hidden = true;
    startBtn?.setAttribute("aria-expanded", "false");
    endBtn?.setAttribute("aria-expanded", "false");
  }

  fabBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFabMenu();
  });

  fabMenu?.addEventListener("click", (e) => e.stopPropagation());

  fabOnetime?.addEventListener("click", () => openOnetimeFlow());

  fabRecurring?.addEventListener("click", () => {
    closeFabMenu();
    toast("Recurring task — coming soon.");
  });

  document.addEventListener("click", () => closeFabMenu());

  roomSelect?.addEventListener("change", () => {
    populateTaskOptions(roomSelect.value);
  });

  flow?.querySelectorAll(".onetime-effort-card").forEach((btn) => {
    btn.addEventListener("click", () => setEffort(btn.getAttribute("data-effort") || "low"));
  });

  onetimeNext?.addEventListener("click", () => {
    if (!roomSelect?.value || !taskSelect?.value) {
      toast("Choose a room and task to continue.");
      return;
    }
    closeTimeWheels();
    showStep(2);
  });

  onetimeBack?.addEventListener("click", () => {
    closeTimeWheels();
    showStep(1);
  });

  onetimeCloseBtns?.forEach((btn) => btn.addEventListener("click", closeOnetimeFlow));

  allDayBtn?.addEventListener("click", () => {
    const on = allDayBtn.getAttribute("aria-checked") === "true";
    allDayBtn.setAttribute("aria-checked", on ? "false" : "true");
    syncAllDayUi();
  });

  notifySwitch?.addEventListener("click", () => {
    const on = notifySwitch.getAttribute("aria-checked") === "true";
    notifySwitch.setAttribute("aria-checked", on ? "false" : "true");
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (flow && !flow.hidden) closeOnetimeFlow();
      else closeFabMenu();
    }
  });
})();
