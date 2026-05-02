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
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  function bindList(root) {
    if (!root) return;
    root.addEventListener("click", (e) => {
      const card = e.target.closest(".tasks-card");
      if (!card || !root.contains(card)) return;
      openFromCard(card);
    });
  }

  bindList(document.getElementById("room-task-list"));
  bindList(document.getElementById("bathroom-body"));
})();
