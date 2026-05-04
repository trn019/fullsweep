(function () {
  "use strict";

  const overlay = document.getElementById("task-settings-overlay");
  if (!overlay) return;

  const titleEl = document.getElementById("task-settings-title");
  const locationInput = document.getElementById("task-settings-location");
  const categorySelect = document.getElementById("task-settings-category");
  const notesInput = document.getElementById("task-settings-notes");
  const everyBtn = document.getElementById("task-settings-every");
  const repeatBtn = document.getElementById("task-settings-repeat");
  const timeBtn = document.getElementById("task-settings-time");
  const notifySwitch = document.getElementById("task-settings-notify");
  const closeBtn = document.getElementById("task-settings-close");
  const saveBtn = document.getElementById("task-settings-save");

  const ROOM_OPTIONS = ["Bedroom", "Bathroom", "Kitchen", "Living Room", "Dining Room", "Other"];

  /** Action bar replaces card body until Back / action / outside tap */
  let activeBar = null;
  let activeCard = null;

  function toast(msg) {
    const root = document.getElementById("tasks-toast-root") || document.getElementById("room-toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "tasks-toast";
    el.setAttribute("role", "status");
    el.textContent = msg;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("tasks-toast--show"));
    setTimeout(() => {
      el.classList.remove("tasks-toast--show");
      setTimeout(() => el.remove(), 200);
    }, 2400);
  }

  function removeActionBar() {
    if (!activeCard) {
      activeBar = null;
      return;
    }
    const card = activeCard;
    const bar = card.querySelector(":scope > .tasks-task-action-bar");
    const swap = card.querySelector(":scope > .tasks-card__content-swap");
    if (bar) bar.remove();
    if (swap) {
      while (swap.firstChild) card.appendChild(swap.firstChild);
      swap.remove();
    }
    card.classList.remove("tasks-card--actions");
    card.style.removeProperty("min-height");
    activeBar = null;
    activeCard = null;
  }

  function actionBarHtml() {
    return `
<div class="tasks-task-action-bar" role="toolbar" aria-label="Task actions">
  <button type="button" class="tasks-task-action tasks-task-action--back" data-action="back" aria-label="Close actions">
    <svg class="tasks-task-action__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>
  <button type="button" class="tasks-task-action tasks-task-action--done" data-action="done">
    <svg class="tasks-task-action__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    <span class="tasks-task-action__label">Mark Done!</span>
  </button>
  <button type="button" class="tasks-task-action tasks-task-action--focus" data-action="focus">
    <svg class="tasks-task-action__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 3h10v3l-4 6 4 6v3H7v-3l4-6-4-6V3z" />
    </svg>
    <span class="tasks-task-action__label">Focus</span>
  </button>
  <button type="button" class="tasks-task-action tasks-task-action--edit" data-action="edit">
    <svg class="tasks-task-action__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
    <span class="tasks-task-action__label">Edit</span>
  </button>
</div>`;
  }

  function showActionsInCard(card) {
    removeActionBar();
    if (card.querySelector(":scope > .tasks-task-action-bar")) return;

    const h = Math.round(card.getBoundingClientRect().height);

    const swap = document.createElement("div");
    swap.className = "tasks-card__content-swap";
    while (card.firstChild) swap.appendChild(card.firstChild);
    card.appendChild(swap);
    swap.setAttribute("hidden", "");
    swap.setAttribute("aria-hidden", "true");

    const temp = document.createElement("div");
    temp.innerHTML = actionBarHtml().trim();
    const bar = temp.firstElementChild;
    card.insertBefore(bar, swap);

    card.classList.add("tasks-card--actions");
    const minH = Math.max(h, 108);
    card.style.minHeight = `${minH}px`;
    activeCard = card;
    activeBar = bar;
  }

  function handleToolbarAction(action, card) {
    const title = card.querySelector(".tasks-card__title")?.textContent?.trim() || "Task";
    if (action === "back") {
      removeActionBar();
      return;
    }
    if (action === "done") {
      removeActionBar();
      card.classList.add("tasks-card--marked-done");
      card.setAttribute("data-task-marked-done", "true");
      toast(`Marked done — ${title}`);
      return;
    }
    if (action === "focus") {
      removeActionBar();
      toast(`Focus mode — ${title} (timer coming soon)`);
      return;
    }
    if (action === "edit") {
      removeActionBar();
      openFromCard(card);
    }
  }

  function effortLevelFromCard(card) {
    const n = card.querySelectorAll(".tasks-card__dots .tasks-dot--on").length;
    if (n <= 1) return "low";
    if (n === 2) return "moderate";
    return "high";
  }

  function setEffortLevel(level) {
    overlay.querySelectorAll(".task-settings-effort-btn").forEach((btn) => {
      const on = btn.getAttribute("data-effort-level") === level;
      btn.classList.toggle("task-settings-effort--selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function openFromCard(card) {
    if (!card) return;
    const title = card.querySelector(".tasks-card__title")?.textContent?.trim() || "Task";
    const category = card.getAttribute("data-task-category") || "";
    const location = card.getAttribute("data-task-location") || category || "";
    const every = card.getAttribute("data-task-every") || "2 weeks";
    const schedRepeat = card.getAttribute("data-task-schedule-repeat") || "On Monday";
    const schedTime = card.getAttribute("data-task-time") || "Time";

    if (titleEl) titleEl.textContent = title;
    if (locationInput) locationInput.value = location;
    if (notesInput) notesInput.value = "";

    if (categorySelect) {
      categorySelect.innerHTML = ROOM_OPTIONS.map((r) => {
        const sel = r === category ? " selected" : "";
        return `<option value="${r.replace(/"/g, "&quot;")}"${sel}>${r}</option>`;
      }).join("");
    }

    if (everyBtn) everyBtn.textContent = `${every} ›`;
    if (repeatBtn) repeatBtn.textContent = `${schedRepeat} ›`;
    if (timeBtn) timeBtn.textContent = `${schedTime} ›`;
    if (notifySwitch) notifySwitch.setAttribute("aria-checked", "false");

    setEffortLevel(effortLevelFromCard(card));

    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("task-settings-open");
    locationInput?.focus();
  }

  function close() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("task-settings-open");
  }

  overlay.addEventListener("click", (e) => {
    if (e.target.classList.contains("task-settings-backdrop")) close();
  });

  closeBtn?.addEventListener("click", close);
  saveBtn?.addEventListener("click", close);

  overlay.querySelectorAll(".task-settings-effort-btn").forEach((btn) => {
    btn.addEventListener("click", () => setEffortLevel(btn.getAttribute("data-effort-level") || "low"));
  });

  notifySwitch?.addEventListener("click", () => {
    const on = notifySwitch.getAttribute("aria-checked") === "true";
    notifySwitch.setAttribute("aria-checked", on ? "false" : "true");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (activeBar) {
      removeActionBar();
      return;
    }
    if (!overlay.hidden) close();
  });

  document.addEventListener("click", (e) => {
    if (!activeBar || !activeCard) return;
    if (activeBar.contains(e.target) || activeCard.contains(e.target)) return;
    removeActionBar();
  });

  function bindList(root) {
    if (!root) return;
    root.addEventListener("click", (e) => {
      const toolbarBtn = e.target.closest(".tasks-task-action-bar [data-action]");
      if (toolbarBtn) {
        const card = toolbarBtn.closest(".tasks-card");
        if (!card || !root.contains(card)) return;
        e.stopPropagation();
        handleToolbarAction(toolbarBtn.getAttribute("data-action") || "", card);
        return;
      }

      const card = e.target.closest(".tasks-card");
      if (!card || !root.contains(card)) return;

      if (card.classList.contains("tasks-card--actions")) {
        removeActionBar();
        return;
      }

      showActionsInCard(card);
    });
  }

  bindList(document.getElementById("room-task-list"));
  bindList(document.getElementById("bathroom-body"));
  bindList(document.getElementById("bedroom-body"));

  document.addEventListener("fullsweep:closeTaskActions", removeActionBar);
})();
