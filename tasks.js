(function () {
  "use strict";

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

  document.querySelectorAll(".tasks-date-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tasks-date-chip").forEach((b) => b.classList.remove("tasks-date-chip--active"));
      btn.classList.add("tasks-date-chip--active");
    });
  });

  document.querySelectorAll('[data-view]').forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.getAttribute("data-view");
      document.querySelectorAll(".tasks-view-tab").forEach((t) => {
        t.classList.toggle("tasks-view-tab--active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      const day = document.getElementById("panel-day");
      const rooms = document.getElementById("panel-rooms");
      if (view === "day") {
        day.hidden = false;
        rooms.hidden = true;
      } else {
        day.hidden = true;
        rooms.hidden = false;
      }
    });
  });

  const bathroomToggle = document.getElementById("toggle-bathroom");
  const bathroomSection = bathroomToggle?.closest(".tasks-room");
  bathroomToggle?.addEventListener("click", () => {
    const collapsed = bathroomSection.getAttribute("data-collapsed") === "true";
    bathroomSection.setAttribute("data-collapsed", collapsed ? "false" : "true");
    bathroomToggle.setAttribute("aria-expanded", collapsed ? "true" : "false");
  });

  document.getElementById("btn-shuffle")?.addEventListener("click", () => {
    const picks = ["Clean Sink", "Clean Toilet", "Wash Rugs"];
    const pick = picks[Math.floor(Math.random() * picks.length)];
    toast(`Try starting with: ${pick}`);
  });

  document.getElementById("btn-sort")?.addEventListener("click", () => {
    toast("Sort options — hook up your ordering here.");
  });

  document.getElementById("expand-cal")?.addEventListener("click", () => {
    toast("Full calendar — connect your date picker.");
  });

  document.querySelector(".tasks-fab")?.addEventListener("click", () => {
    toast("Add task — connect your create flow.");
  });
})();
