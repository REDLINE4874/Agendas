function setupCustomSelects() {
  document.querySelectorAll('.custom-select-wrap').forEach((wrap) => {
    const button = wrap.querySelector('.custom-select');
    const input = wrap.querySelector('input[type="hidden"]');
    const menu = wrap.querySelector('.custom-select__menu');
    const options = wrap.querySelectorAll('.custom-option');
    const valueSpan = button?.querySelector('.custom-select__value');

    if (!button || !input || !menu || !valueSpan) return;

    if (!document.__customSelectGlobalBound) {
      document.__customSelectGlobalBound = true;
      document.addEventListener('click', (event) => {
        document.querySelectorAll('.custom-select-wrap.active').forEach((activeWrap) => {
          if (!activeWrap.contains(event.target)) {
            activeWrap.classList.remove('active');
            const aBtn = activeWrap.querySelector('.custom-select');
            if (aBtn) aBtn.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }

    const updateSelection = () => {
      const current = input.value || '';
      let label = button.getAttribute('data-placeholder') || '';
      options.forEach((opt) => {
        opt.classList.toggle('is-selected', opt.getAttribute('data-value') === current);
        if (opt.getAttribute('data-value') === current) label = opt.textContent;
      });
      valueSpan.textContent = label || button.getAttribute('data-placeholder') || '';
      button.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('active');
    };

    if (!wrap.dataset.selectBound) {
      wrap.dataset.selectBound = 'true';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        document.querySelectorAll('.custom-select-wrap.active').forEach((activeWrap) => {
          if (activeWrap !== wrap) {
            activeWrap.classList.remove('active');
            const aBtn = activeWrap.querySelector('.custom-select');
            if (aBtn) aBtn.setAttribute('aria-expanded', 'false');
          }
        });
        const isOpen = wrap.classList.toggle('active');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    options.forEach((opt) => {
      if (opt.dataset.bound === 'true') return;
      opt.dataset.bound = 'true';
      opt.addEventListener('click', () => {
        const value = opt.getAttribute('data-value') || '';
        input.value = value;
        updateSelection();
        if (input.id === 'filtro-estatus' || input.id === 'filtro-mes') {
          filtrar();
        }
      });
    });

    updateSelection();
  });
}

document.addEventListener('DOMContentLoaded', setupCustomSelects);


