(() => {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const weekdays = ["do.", "lu.", "ma.", "mi.", "ju.", "vi.", "sá."];
  let active = null;

  const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const fromIso = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  };

  function createPicker(input, button) {
    const host = input.closest(".date-input-wrap");
    if (!host) return;
    if (host.querySelector(".agenda-calendar")) return;
    const picker = document.createElement("div");
    picker.className = "agenda-calendar";
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", "Calendario");
    picker.hidden = true;
    host.appendChild(picker);

    const initial = fromIso(input.value) || new Date();
    const state = { year: initial.getFullYear(), month: initial.getMonth() };

    const close = () => {
      picker.hidden = true;
      host.classList.remove("calendar-open");
      if (active === close) active = null;
    };

    const render = () => {
      const selected = fromIso(input.value);
      const today = new Date();
      const first = new Date(state.year, state.month, 1);
      const last = new Date(state.year, state.month + 1, 0);
      let cells = "";
      for (let i = 0; i < first.getDay(); i += 1) cells += '<span class="agenda-calendar__empty" aria-hidden="true"></span>';
      for (let day = 1; day <= last.getDate(); day += 1) {
        const date = new Date(state.year, state.month, day);
        const iso = toIso(date);
        const selectedClass = selected && iso === toIso(selected) ? " is-selected" : "";
        const todayClass = iso === toIso(today) ? " is-today" : "";
        const min = fromIso(input.min);
        const max = fromIso(input.max);
        const disabled = (min && date < min) || (max && date > max);
        cells += `<button type="button" class="agenda-calendar__day${selectedClass}${todayClass}" data-date="${iso}"${disabled ? " disabled" : ""}>${day}</button>`;
      }
      picker.innerHTML = `
        <div class="agenda-calendar__header">
          <button type="button" class="agenda-calendar__nav" data-calendar-prev aria-label="Mes anterior">‹</button>
          <strong>${months[state.month]} de ${state.year}</strong>
          <button type="button" class="agenda-calendar__nav" data-calendar-next aria-label="Mes siguiente">›</button>
        </div>
        <div class="agenda-calendar__weekdays">${weekdays.map((day) => `<span>${day}</span>`).join("")}</div>
        <div class="agenda-calendar__grid">${cells}</div>
        <div class="agenda-calendar__footer">
          <button type="button" class="agenda-calendar__text-btn" data-calendar-clear>Borrar</button>
          <button type="button" class="agenda-calendar__text-btn" data-calendar-today>Hoy</button>
        </div>`;

      picker.querySelector("[data-calendar-prev]").addEventListener("click", () => {
        state.month -= 1;
        if (state.month < 0) { state.month = 11; state.year -= 1; }
        render();
      });
      picker.querySelector("[data-calendar-next]").addEventListener("click", () => {
        state.month += 1;
        if (state.month > 11) { state.month = 0; state.year += 1; }
        render();
      });
      picker.querySelectorAll("[data-date]").forEach((dayButton) => {
        dayButton.addEventListener("click", () => {
          input.value = dayButton.dataset.date;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          close();
        });
      });
      picker.querySelector("[data-calendar-clear]").addEventListener("click", () => {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        close();
      });
      picker.querySelector("[data-calendar-today]").addEventListener("click", () => {
        const now = new Date();
        state.year = now.getFullYear();
        state.month = now.getMonth();
        input.value = toIso(now);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        close();
      });
    };

    const open = () => {
      if (active && active !== close) active();
      const current = fromIso(input.value) || new Date();
      state.year = current.getFullYear();
      state.month = current.getMonth();
      render();
      picker.hidden = false;
      host.classList.add("calendar-open");
      active = close;
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    input.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      open();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        open();
      }
      if (event.key === "Escape") close();
    });
  }

  function init() {
    document.querySelectorAll("input[type=date]").forEach((input) => {
      const button = input.closest(".date-input-wrap")?.querySelector("[data-date-target]");
      if (button) createPicker(input, button);
    });
    document.addEventListener("click", (event) => {
      if (active && !event.target.closest(".date-input-wrap")) active();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
