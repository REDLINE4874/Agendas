/**
 * <theme-toggle></theme-toggle>
 * <theme-toggle size="sm"></theme-toggle>
 * <theme-toggle size="lg"></theme-toggle>
 *
 * Componente autónomo (Web Component) para alternar modo claro/oscuro.
 * No depende de CSS ni JS externo: todo vive encapsulado en su Shadow DOM.
 *
 * USO:
 *   1) Incluye este archivo:  <script src="theme-toggle.js" defer></script>
 *   2) Coloca la etiqueta donde quieras el switch:  <theme-toggle></theme-toggle>
 *
 * TAMAÑO:
 *   Usa el atributo "size" con uno de estos valores:
 *     - sm  (pequeño,  38x20px)
 *     - md  (mediano,  52x28px) — valor por defecto si no se especifica
 *     - lg  (grande,   64x34px)
 *   O dale cualquier número (la ALTURA en px) y el resto se calcula
 *   proporcionalmente, para un tamaño 100% a tu medida:
 *     <theme-toggle size="40"></theme-toggle>
 *     <theme-toggle size="16"></theme-toggle>
 *   Ejemplo con preset:  <theme-toggle size="sm"></theme-toggle>
 *
 *   Para control aún más fino (ancho y alto de forma independiente),
 *   puedes sobrescribir las variables CSS directamente desde tu página,
 *   sin tocar este archivo:
 *     <theme-toggle style="--w:90px; --h:30px; --pad:3px; --knob:24px; --tx:57px;"></theme-toggle>
 *
 * INTEGRACIÓN CON TU CSS EXISTENTE:
 *   Por defecto, el componente activa la clase "dark-mode" en <body>:
 *         body.dark-mode { ... }
 *   Si tu CSS usa otro nombre (por ejemplo, solo "dark"), dile al
 *   componente cuál usar con el atributo "dark-class":
 *     <theme-toggle dark-class="dark"></theme-toggle>
 *
 * El componente:
 *   - Activa la clase "dark-mode" en <body> (misma convención que el CSS existente):
 *         body.dark-mode { ... }
 *   - Respeta la preferencia del sistema operativo al cargar.
 *   - Guarda la elección del usuario en localStorage (persiste entre visitas).
 *   - Emite un evento "theme-change" con el detalle { theme: "dark"|"light" }
 *     por si quieres reaccionar desde tu propio JS:
 *         document.querySelector('theme-toggle')
 *           .addEventListener('theme-change', e => console.log(e.detail.theme));
 */

class ThemeToggle extends HTMLElement {
  static get observedAttributes() {
    return ['size', 'dark-class'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          vertical-align: middle;
          --w: 52px;
          --h: 28px;
          --pad: 3px;
          --knob: 22px;
          --tx: 24px;
        }

        :host([size="sm"]) {
          --w: 38px;
          --h: 20px;
          --pad: 2px;
          --knob: 16px;
          --tx: 18px;
        }

        :host([size="lg"]) {
          --w: 64px;
          --h: 34px;
          --pad: 4px;
          --knob: 26px;
          --tx: 30px;
        }

        .switch {
          box-sizing: border-box;
          position: relative;
          display: block;
          width: var(--w);
          height: var(--h);
          padding: 0;
          overflow: hidden;
          border: 2px solid #34445c;
          border-radius: 999px;
          background: #dce8f8;
          cursor: pointer;
          transition: background-color .25s ease, border-color .25s ease, transform .2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .switch.dark {
          border-color: #c5d0e7;
          background: #27344e;
        }

        .switch:hover {
          transform: scale(1.05);
        }

        .switch:active {
          transform: scale(.96);
        }

        .switch:focus-visible {
          outline: 3px solid #3975d5;
          outline-offset: 3px;
        }

        .knob {
          position: absolute;
          top: 50%;
          left: var(--pad);
          display: grid;
          width: var(--knob);
          height: var(--knob);
          place-items: center;
          border: 1.5px solid #34445c;
          border-radius: 50%;
          background: #f5e642;
          color: #29364a;
          transform: translateY(-50%);
          transition: transform .32s cubic-bezier(.2, .8, .2, 1), background-color .25s ease, color .25s ease;
        }

        .switch.dark .knob {
          border-color: #f5dce7;
          background: #ff91a4;
          color: #342238;
          transform: translateX(calc(var(--tx) - 4px)) translateY(-50%);
        }

        .knob svg {
          position: absolute;
          width: 62%;
          height: 62%;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 1.8;
          transition: opacity .16s ease, transform .25s ease;
        }

        .icon-moon {
          opacity: 0;
          transform: rotate(-35deg) scale(.7);
        }

        .switch.dark .icon-sun {
          opacity: 0;
          transform: rotate(35deg) scale(.7);
        }

        .switch.dark .icon-moon {
          opacity: 1;
          transform: rotate(0) scale(1);
        }

        @media (prefers-reduced-motion: reduce) {
          .switch,
          .knob,
          .knob svg {
            transition: none;
          }
        }
      </style>

      <button class="switch" part="switch" role="switch" aria-checked="false" aria-label="Cambiar entre modo claro y oscuro">
        <span class="knob" aria-hidden="true">
          <svg class="icon-sun" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>
          </svg>
          <svg class="icon-moon" viewBox="0 0 24 24">
            <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"></path>
          </svg>
        </span>
      </button>
    `;

    this.$btn = this.shadowRoot.querySelector('.switch');
    this.$btn.addEventListener('click', () => this.toggle());

    this._applySize(this.getAttribute('size'));

    // Estado inicial: localStorage > preferencia del sistema
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : prefersDark;

    this._setTheme(initialDark, { persist: false });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'size' && this.$btn) {
      this._applySize(newValue);
    }
  }

  // Si "size" es sm/md/lg, deja que las reglas :host([size="..."]) del CSS
  // hagan el trabajo. Si es un número, calcula --w/--h/--pad/--knob/--tx
  // proporcionalmente a partir de las proporciones del tamaño "md" y las
  // aplica como estilo inline (con más prioridad que los presets).
  _applySize(value) {
    const props = ['--w', '--h', '--pad', '--knob', '--tx'];

    if (value === 'sm' || value === 'lg' || !value) {
      props.forEach(p => this.style.removeProperty(p));
      return;
    }

    const h = parseFloat(value);
    if (isNaN(h) || h <= 0) {
      props.forEach(p => this.style.removeProperty(p));
      return;
    }

    // Proporciones tomadas del tamaño "md" (52 x 28)
    const w = h * (52 / 28);
    const pad = h * (3 / 28);
    const knob = h * (22 / 28);
    const tx = w - knob - pad * 2;

    this.style.setProperty('--h', `${h}px`);
    this.style.setProperty('--w', `${w.toFixed(1)}px`);
    this.style.setProperty('--pad', `${pad.toFixed(1)}px`);
    this.style.setProperty('--knob', `${knob.toFixed(1)}px`);
    this.style.setProperty('--tx', `${tx.toFixed(1)}px`);
  }

  toggle() {
    const isDark = this.$btn.classList.contains('dark');
    this._setTheme(!isDark, { persist: true });
  }

  setTheme(theme) {
    this._setTheme(theme === 'dark', { persist: true });
  }

  _setTheme(isDark, { persist }) {
    this.$btn.classList.toggle('dark', isDark);
    this.$btn.setAttribute('aria-checked', String(isDark));

    // Activa el modo oscuro con la clase que tu CSS espera.
    // Por defecto "dark-mode"; cámbiala con el atributo dark-class="dark"
    // si tu página usa otro nombre.
    const darkClass = this.getAttribute('dark-class') || 'dark-mode';
    document.body.classList.toggle(darkClass, isDark);

    if (persist) {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    this.dispatchEvent(new CustomEvent('theme-change', {
      detail: { theme: isDark ? 'dark' : 'light' },
      bubbles: true
    }));
  }
}

customElements.define('theme-toggle', ThemeToggle);
