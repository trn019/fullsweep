(function () {
  "use strict";

  const overlay = document.getElementById("add-room-overlay");
  const btnAdd = document.getElementById("btn-add-room");
  const closeBtn = document.getElementById("add-room-close");
  const createBtn = document.getElementById("add-room-create");
  const nameInput = document.getElementById("add-room-name");
  const typeSelect = document.getElementById("add-room-type");
  const customInput = document.getElementById("add-room-custom");
  const taskList = document.getElementById("add-room-task-list");

  if (!overlay || !btnAdd) return;

  function toast(msg) {
    const root = document.getElementById("tasks-toast-root");
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

  function resetForm() {
    if (nameInput) nameInput.value = "";
    if (typeSelect) {
      typeSelect.selectedIndex = 0;
    }
    if (customInput) customInput.value = "";
    taskList?.querySelectorAll(".add-room__task").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
    });
  }

  function open() {
    resetForm();
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("add-room-open");
    nameInput?.focus();
  }

  function close() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("add-room-open");
  }

  btnAdd.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  closeBtn?.addEventListener("click", () => close());

  document.addEventListener("fullsweep:closeAddRoom", () => {
    if (!overlay.hidden) close();
  });

  taskList?.addEventListener("click", (e) => {
    const taskBtn = e.target.closest(".add-room__task");
    if (!taskBtn || !taskList.contains(taskBtn)) return;
    const on = taskBtn.getAttribute("aria-pressed") === "true";
    taskBtn.setAttribute("aria-pressed", on ? "false" : "true");
  });

  createBtn?.addEventListener("click", () => {
    const name = nameInput?.value?.trim() || "";
    const type = typeSelect?.value || "";
    const selected = taskList
      ? Array.from(taskList.querySelectorAll('.add-room__task[aria-pressed="true"]'))
          .map((b) => b.getAttribute("data-task"))
          .filter(Boolean)
      : [];
    const custom = customInput?.value?.trim();
    if (custom) selected.push(custom);
    if (!name) {
      toast("Please name your room.");
      nameInput?.focus();
      return;
    }
    if (!type) {
      toast("Choose a room type.");
      typeSelect?.focus();
      return;
    }
    const n = selected.length;
    toast(`Created “${name}” with ${n} task${n === 1 ? "" : "s"} (demo).`);
    close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
})();
