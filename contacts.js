(function () {
  "use strict";

  const rowsContainer = document.getElementById("contacts-rows");
  const searchInput = document.getElementById("contact-search");
  const chips = document.querySelectorAll(".filter-chips .chip");
  const sortSelect = document.getElementById("sort-select");
  const visibleEl = document.getElementById("visible-count");
  const totalEl = document.getElementById("total-count");
  const emptyEl = document.getElementById("contacts-empty");
  const addBtn = document.getElementById("btn-add-contact");

  let activeFilter = "all";

  function rowLinks() {
    return rowsContainer ? rowsContainer.querySelectorAll(".contact-row") : [];
  }

  function parentLi(el) {
    return el.closest("li");
  }

  function matchesFilter(row) {
    const st = row.getAttribute("data-status") || "";
    if (activeFilter === "all") return true;
    return st === activeFilter;
  }

  function matchesSearch(row, q) {
    if (!q.trim()) return true;
    const hay = (
      row.getAttribute("data-name") +
      " " +
      row.getAttribute("data-email") +
      " " +
      row.getAttribute("data-company")
    ).toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }

  function applyFilters() {
    const q = searchInput ? searchInput.value : "";
    let n = 0;
    rowLinks().forEach((row) => {
      const li = parentLi(row);
      const ok = matchesFilter(row) && matchesSearch(row, q);
      if (li) {
        li.hidden = !ok;
        if (ok) n += 1;
      }
    });
    if (visibleEl) visibleEl.textContent = String(n);
    if (emptyEl) emptyEl.hidden = n !== 0;
  }

  function setChip(filter, btn) {
    activeFilter = filter;
    chips.forEach((c) => {
      const on = c === btn;
      c.classList.toggle("chip--active", on);
      c.setAttribute("aria-selected", on ? "true" : "false");
    });
    applyFilters();
  }

  function sortRows() {
    if (!rowsContainer || !sortSelect) return;
    const mode = sortSelect.value;
    const items = Array.from(rowsContainer.querySelectorAll(":scope > li"));

    const getRow = (li) => li.querySelector(".contact-row");

    items.sort((a, b) => {
      const ra = getRow(a);
      const rb = getRow(b);
      if (!ra || !rb) return 0;
      if (mode === "name") {
        return (ra.getAttribute("data-name") || "").localeCompare(rb.getAttribute("data-name") || "");
      }
      if (mode === "company") {
        return (ra.getAttribute("data-company") || "").localeCompare(rb.getAttribute("data-company") || "");
      }
      if (mode === "recent") {
        const ta = new Date(ra.getAttribute("data-updated") || 0).getTime();
        const tb = new Date(rb.getAttribute("data-updated") || 0).getTime();
        return tb - ta;
      }
      return 0;
    });

    items.forEach((li) => rowsContainer.appendChild(li));
    applyFilters();
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => setChip(chip.getAttribute("data-filter") || "all", chip));
  });

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", sortRows);
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addBtn.disabled = true;
      window.setTimeout(() => {
        addBtn.disabled = false;
      }, 400);
    });
    addBtn.title = "Wire to your create-contact flow";
  }

  if (totalEl) totalEl.textContent = String(rowLinks().length);
  sortRows();
})();
