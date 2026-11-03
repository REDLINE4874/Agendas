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
          overflow: visible;
          border: 3px solid #171717;
          border-radius: 8px;
          background: #91b9ff;
          box-shadow: 4px 4px 0 #171717;
          cursor: pointer;
          transition: background-color .2s ease, box-shadow .2s ease, transform .2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .switch.dark {
          background: #26324b;
        }

        .switch:hover {
          box-shadow: 5px 5px 0 #171717;
          transform: translate(-1px, -1px);
        }

        .switch:active {
          box-shadow: 1px 1px 0 #171717;
          transform: translate(3px, 3px);
        }

        .switch:focus-visible {
          outline: 3px solid #171717;
          outline-offset: 6px;
        }

        .switch.dark:focus-visible {
          outline-color: #f5e642;
        }

        .switch::before {
          position: absolute;
          top: 7px;
          right: 9px;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #f5e642;
          box-shadow: -7px 5px 0 -1px #fff, 5px -5px 0 -1px #fff;
          content: "";
          opacity: 0;
          transition: opacity .2s ease;
        }

        .switch.dark::before {
          opacity: 1;
        }

        .knob {
          position: absolute;
          top: 50%;
          left: var(--pad);
          display: grid;
          z-index: 1;
          width: var(--knob);
          height: var(--knob);
          place-items: center;
          border: 2px solid #171717;
          border-radius: 6px;
          background: #f5e642;
          color: #171717;
          transform: translateY(-50%);
          transition: transform .28s cubic-bezier(.2, .8, .2, 1), background-color .2s ease, color .2s ease;
        }

        .switch.dark .knob {
          background: #e7d8ff;
          color: #26324b;
          transform: translateX(calc(var(--tx) - 4px)) translateY(-50%);
        }

        .knob svg {
          position: absolute;
          width: 62%;
          height: 62%;
          fill: currentColor;
          stroke: none;
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
          .switch::before,
          .knob,
          .knob svg {
            transition: none;
          }
        }
      </style>

      <button class="switch" part="switch" role="switch" aria-checked="false" aria-label="Cambiar entre modo claro y oscuro">
        <span class="knob" aria-hidden="true">
          <svg class="icon-sun" viewBox="0 0 24 24">
            <path d="M11 1h2v4h-2zm0 18h2v4h-2zM1 11h4v2H1zm18 0h4v2h-4zM4.22 5.64l1.42-1.42 2.83 2.83-1.42 1.42zm11.31 11.31 1.42-1.42 2.83 2.83-1.42 1.42zM18.36 4.22l1.42 1.42-2.83 2.83-1.42-1.42zM7.05 15.54l1.42 1.42-2.83 2.83-1.42-1.42z"></path>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
          <svg class="icon-moon" viewBox="0 0 24 24">
            <path d="M20.8 15.1A8.9 8.9 0 0 1 8.9 3.2a9.3 9.3 0 1 0 11.9 11.9Z"></path>
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
