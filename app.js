(function () {
  "use strict";

  const STORAGE_KEY = "fullsweep_app_v1";
  const FOCUS_SECONDS_DEFAULT = 15 * 60;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const defaultTasks = () => [
    { id: "t1", title: "Wash the dishes", when: "Today, 10:12am", completedAt: null },
    { id: "t2", title: "Vacuum living room", when: "Today, 2:00pm", completedAt: null },
    { id: "t3", title: "Take out recycling", when: "Tomorrow, 8:00am", completedAt: null },
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function freshState() {
    return {
      tasks: defaultTasks(),
      events: [],
      bedroomDust: 72,
      carouselIndex: 0,
    };
  }

  function getState() {
    const s = loadState();
    if (s && Array.isArray(s.tasks)) {
      if (typeof s.bedroomDust !== "number") s.bedroomDust = 72;
      if (!Array.isArray(s.events)) s.events = [];
      if (typeof s.carouselIndex !== "number") s.carouselIndex = 0;
      return s;
    }
    const n = freshState();
    saveState(n);
    return n;
  }

  function now() {
    return Date.now();
  }

  function inLastWeek(ts) {
    return ts >= now() - WEEK_MS;
  }

  function eventsThisWeek(events) {
    return events.filter((e) => inLastWeek(e.at));
  }

  function completedCountWeek(tasks) {
    return tasks.filter((t) => t.completedAt && inLastWeek(t.completedAt)).length;
  }

  function focusMinutesWeek(events) {
    return eventsThisWeek(events)
      .filter((e) => e.type === "focus_session")
      .reduce((sum, e) => sum + (e.minutes || 0), 0);
  }

  function formatDurationMinutes(totalMin) {
    const m = Math.round(totalMin);
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h <= 0) return `${min} min`;
    if (min === 0) return `${h}h`;
    return `${h}h ${min}min`;
  }

  function greetingText() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning, John!";
    if (h < 17) return "Good afternoon, John!";
    return "Good evening, John!";
  }

  const els = {
    greeting: () => document.getElementById("greeting"),
    taskTitle: () => document.getElementById("task-title"),
    taskTime: () => document.getElementById("task-time"),
    taskCard: () => document.getElementById("task-card"),
    btnPrev: () => document.getElementById("carousel-prev"),
    btnNext: () => document.getElementById("carousel-next"),
    dots: () => document.getElementById("task-dots"),
    btnComplete: () => document.getElementById("btn-complete"),
    btnFocus: () => document.getElementById("btn-focus"),
    statTasks: () => document.getElementById("stat-completed"),
    statTime: () => document.getElementById("stat-time"),
    dustFill: () => document.getElementById("dust-fill"),
    dustLabel: () => document.getElementById("dust-label"),
    bedroomMeta: () => document.getElementById("bedroom-meta"),
    btnQuickClean: () => document.getElementById("btn-quick-clean"),
    toastRoot: () => document.getElementById("toast-root"),
    focusOverlay: () => document.getElementById("focus-overlay"),
    focusTitle: () => document.getElementById("focus-task-label"),
    focusTimer: () => document.getElementById("focus-timer-display"),
    focusStart: () => document.getElementById("focus-start"),
    focusDone: () => document.getElementById("focus-done"),
    focusClose: () => document.getElementById("focus-close"),
    taskList: () => document.getElementById("task-list"),
    scheduleList: () => document.getElementById("schedule-list"),
    activityList: () => document.getElementById("activity-list"),
    panels: () => document.querySelectorAll("[data-panel]"),
    tabs: () => document.querySelectorAll("[data-tab]"),
    viewAll: () => document.querySelectorAll('[data-go-tab="tasks"]'),
  };

  let state = getState();
  let focusInterval = null;
  let focusRemaining = 0;
  let focusRunning = false;

  function pendingTasks() {
    return state.tasks.filter((t) => !t.completedAt);
  }

  function pushEvent(ev) {
    state.events.push({ id: "e" + now() + Math.random().toString(36).slice(2), at: now(), ...ev });
    saveState(state);
  }

  function renderStats() {
    const c = completedCountWeek(state.tasks);
    const fm = focusMinutesWeek(state.events);
    const st = els.statTasks();
    const tm = els.statTime();
    if (st) st.textContent = `${c} task${c === 1 ? "" : "s"}`;
    if (tm) tm.textContent = formatDurationMinutes(fm);
  }

  function renderDust() {
    const pct = Math.max(0, Math.min(100, state.bedroomDust));
    const fill = els.dustFill();
    const label = els.dustLabel();
    if (fill) fill.style.width = pct + "%";
    if (label) {
      if (pct >= 60) label.textContent = "Getting dusty...";
      else if (pct >= 30) label.textContent = "Could use a tidy-up.";
      else label.textContent = "Looking fresh!";
    }
  }

  function renderCarousel() {
    const pending = pendingTasks();
    const title = els.taskTitle();
    const time = els.taskTime();
    const card = els.taskCard();
    const prev = els.btnPrev();
    const next = els.btnNext();

    if (pending.length === 0) {
      if (title) title.textContent = "You're all caught up!";
      if (time) time.textContent = "No open tasks right now.";
      if (card) card.classList.add("task-card--empty");
      if (prev) prev.disabled = true;
      if (next) next.disabled = true;
      renderDots(0, 0);
      if (els.btnComplete()) els.btnComplete().disabled = true;
      if (els.btnFocus()) els.btnFocus().disabled = true;
      return;
    }

    if (card) card.classList.remove("task-card--empty");
    if (els.btnComplete()) els.btnComplete().disabled = false;
    if (els.btnFocus()) els.btnFocus().disabled = false;
    if (prev) prev.disabled = false;
    if (next) next.disabled = false;

    if (state.carouselIndex >= pending.length) state.carouselIndex = 0;
    const t = pending[state.carouselIndex];
    if (title) title.textContent = t.title;
    if (time) time.textContent = t.when;

    renderDots(state.carouselIndex, pending.length);
    saveState(state);
  }

  function renderDots(active, total) {
    const root = els.dots();
    if (!root) return;
    root.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dots__dot" + (i === active ? " dots__dot--active" : "");
      b.setAttribute("aria-label", `Task ${i + 1} of ${total}`);
      b.addEventListener("click", () => {
        state.carouselIndex = i;
        saveState(state);
        renderCarousel();
      });
      root.appendChild(b);
    }
  }

  function completeCurrentTask() {
    const pending = pendingTasks();
    if (pending.length === 0) return;
    const t = pending[state.carouselIndex];
    if (!t) return;
    t.completedAt = now();
    pushEvent({ type: "task_complete", taskId: t.id, title: t.title });
    state.carouselIndex = 0;
    saveState(state);
    showToast(`Nice — “${t.title}” is done.`);
    renderStats();
    renderCarousel();
    renderTaskList();
    renderSchedule();
    renderActivity();
  }

  function shiftCarousel(delta) {
    const pending = pendingTasks();
    if (pending.length === 0) return;
    state.carouselIndex = (state.carouselIndex + delta + pending.length) % pending.length;
    saveState(state);
    renderCarousel();
  }

  function openFocus() {
    const pending = pendingTasks();
    if (pending.length === 0) return;
    const t = pending[state.carouselIndex];
    const overlay = els.focusOverlay();
    const lab = els.focusTitle();
    if (lab) lab.textContent = t.title;
    focusRemaining = FOCUS_SECONDS_DEFAULT;
    focusRunning = false;
    updateFocusDisplay();
    if (els.focusStart()) els.focusStart().style.display = "inline-flex";
    if (els.focusDone()) els.focusDone().style.display = "none";
    if (overlay) {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    }
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
    }
  }

  function closeFocus() {
    const overlay = els.focusOverlay();
    if (overlay) {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
    }
    focusRunning = false;
  }

  function formatClock(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateFocusDisplay() {
    const el = els.focusTimer();
    if (el) el.textContent = formatClock(focusRemaining);
  }

  function startFocusTimer() {
    if (focusRunning) return;
    focusRunning = true;
    if (els.focusStart()) els.focusStart().style.display = "none";
    if (els.focusDone()) els.focusDone().style.display = "none";
    focusInterval = setInterval(() => {
      focusRemaining -= 1;
      updateFocusDisplay();
      if (focusRemaining <= 0) {
        clearInterval(focusInterval);
        focusInterval = null;
        focusRunning = false;
        const pending = pendingTasks();
        const t = pending[state.carouselIndex];
        const minutes = Math.round(FOCUS_SECONDS_DEFAULT / 60);
        pushEvent({ type: "focus_session", minutes, taskId: t ? t.id : null });
        renderStats();
        renderActivity();
        showToast(`Focus block complete — ${minutes} min logged.`);
        if (els.focusDone()) {
          els.focusDone().style.display = "inline-flex";
        }
      }
    }, 1000);
  }

  function quickCleanBedroom() {
    state.bedroomDust = Math.max(0, state.bedroomDust - 35);
    const meta = els.bedroomMeta();
    if (meta) meta.textContent = "cleaned just now";
    pushEvent({ type: "room_clean", room: "bedroom" });
    saveState(state);
    renderDust();
    renderActivity();
    showToast("Bedroom freshened up!");
  }

  function showToast(message) {
    const root = els.toastRoot();
    if (!root) return;
    const node = document.createElement("div");
    node.className = "toast";
    node.setAttribute("role", "status");
    node.textContent = message;
    root.appendChild(node);
    requestAnimationFrame(() => node.classList.add("toast--show"));
    setTimeout(() => {
      node.classList.remove("toast--show");
      setTimeout(() => node.remove(), 220);
    }, 2600);
  }

  function renderTaskList() {
    const ul = els.taskList();
    if (!ul) return;
    ul.innerHTML = "";
    state.tasks.forEach((t) => {
      const li = document.createElement("li");
      li.className = "task-row" + (t.completedAt ? " task-row--done" : "");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "task-row__check";
      btn.setAttribute("aria-label", t.completedAt ? "Mark incomplete" : "Mark complete");
      btn.innerHTML = t.completedAt
        ? "✓"
        : '<span class="task-row__circle"></span>';
      btn.addEventListener("click", () => {
        if (t.completedAt) {
          t.completedAt = null;
          state.events = state.events.filter(
            (e) => !(e.type === "task_complete" && e.taskId === t.id)
          );
          showToast("Task reopened.");
        } else {
          t.completedAt = now();
          pushEvent({ type: "task_complete", taskId: t.id, title: t.title });
          showToast(`Done: ${t.title}`);
        }
        saveState(state);
        renderStats();
        renderCarousel();
        renderTaskList();
        renderSchedule();
        renderActivity();
      });
      const div = document.createElement("div");
      div.className = "task-row__body";
      div.innerHTML = `<span class="task-row__title">${escapeHtml(t.title)}</span><span class="task-row__when">${escapeHtml(t.when)}</span>`;
      li.appendChild(btn);
      li.appendChild(div);
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderSchedule() {
    const box = els.scheduleList();
    if (!box) return;
    const groups = {};
    state.tasks.forEach((t) => {
      const key = t.when.includes("Tomorrow") ? "Tomorrow" : "Today";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    box.innerHTML = "";
    let any = false;
    ["Today", "Tomorrow"].forEach((day) => {
      const items = groups[day];
      if (!items || !items.length) return;
      any = true;
      const sec = document.createElement("section");
      sec.className = "schedule-day";
      sec.innerHTML = `<h3 class="schedule-day__title">${day}</h3>`;
      const ul = document.createElement("ul");
      ul.className = "schedule-day__list";
      items.forEach((t) => {
        const li = document.createElement("li");
        li.className = "schedule-item" + (t.completedAt ? " schedule-item--done" : "");
        li.innerHTML = `<span>${escapeHtml(t.title)}</span><span>${t.completedAt ? "Done" : escapeHtml(t.when.replace(/^[^,]+,?\s*/, ""))}</span>`;
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    });
    if (!any) box.innerHTML = '<p class="schedule-empty">Nothing on the calendar.</p>';
  }

  function formatActivityTime(ts) {
    const d = new Date(ts);
    const nowD = new Date();
    const diff = nowD - d;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (d.toDateString() === nowD.toDateString()) return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function activityLabel(e) {
    if (e.type === "task_complete") return `Completed “${e.title || "task"}”`;
    if (e.type === "focus_session") return `Focus session · ${e.minutes || 0} min`;
    if (e.type === "room_clean") return "Quick clean · Bedroom";
    return "Activity";
  }

  function renderActivity() {
    const ul = els.activityList();
    if (!ul) return;
    const sorted = [...state.events].sort((a, b) => b.at - a.at).slice(0, 30);
    ul.innerHTML = "";
    if (sorted.length === 0) {
      ul.innerHTML = '<li class="activity-empty">No activity yet — complete a task or run focus mode.</li>';
      return;
    }
    sorted.forEach((e) => {
      const li = document.createElement("li");
      li.className = "activity-item";
      li.innerHTML = `<p class="activity-item__text">${escapeHtml(activityLabel(e))}</p><time class="activity-item__time">${formatActivityTime(e.at)}</time>`;
      ul.appendChild(li);
    });
  }

  function setTab(name) {
    els.tabs().forEach((btn) => {
      const on = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("tab-bar__item--active", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    els.panels().forEach((panel) => {
      const on = panel.getAttribute("data-panel") === name;
      panel.classList.toggle("panel--active", on);
      panel.hidden = !on;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bind() {
    const prev = els.btnPrev();
    const next = els.btnNext();
    if (prev) prev.addEventListener("click", () => shiftCarousel(-1));
    if (next) next.addEventListener("click", () => shiftCarousel(1));
    if (els.btnComplete()) els.btnComplete().addEventListener("click", completeCurrentTask);
    if (els.btnFocus()) els.btnFocus().addEventListener("click", openFocus);
    if (els.btnQuickClean()) els.btnQuickClean().addEventListener("click", quickCleanBedroom);
    if (els.focusStart()) els.focusStart().addEventListener("click", startFocusTimer);
    if (els.focusClose()) els.focusClose().addEventListener("click", closeFocus);
    if (els.focusDone()) els.focusDone().addEventListener("click", closeFocus);

    els.focusOverlay()?.addEventListener("click", (ev) => {
      if (ev.target === els.focusOverlay()) closeFocus();
    });

    els.tabs().forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.getAttribute("data-tab")));
    });
    els.viewAll().forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        window.location.href = "tasks.html";
      });
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && els.focusOverlay()?.classList.contains("is-open")) closeFocus();
    });
  }

  function init() {
    const g = els.greeting();
    if (g) g.textContent = greetingText();
    bind();
    renderStats();
    renderDust();
    renderCarousel();
    renderTaskList();
    renderSchedule();
    renderActivity();
    setTab("home");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
