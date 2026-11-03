class ThemeBackgroundPicker extends HTMLElement {
  static PROFILE_STORAGE_KEY = "agenda_profile";
  static BACKGROUND_PROFILE_KEY = "backgroundColor";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { position: relative; display: inline-flex; }
        .picker {
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          padding: 0;
          border: 3px solid var(--nb-ink, #171717);
          border-radius: 8px;
          background: var(--nb-yellow, #f5e642);
          cursor: pointer;
          box-shadow: var(--nb-component-shadow, var(--nb-push-shadow, 4px 4px 0 var(--nb-shadow-color, #171717)));
          transition: transform .16s ease, box-shadow .16s ease;
        }
        .picker:hover { transform: translate(2px, 2px); box-shadow: var(--nb-component-shadow-hover, var(--nb-push-shadow-hover, 2px 2px 0 var(--nb-shadow-color, #171717))); }
        .picker:hover { background: var(--nb-blue, #91b9ff); }
        .picker:active { transform: translate(4px, 4px); box-shadow: 0 0 0 var(--nb-shadow-color, #171717); }
        .picker:focus-visible {
          outline: 3px solid var(--input-focus-ring, rgba(17, 17, 17, .16));
          outline-offset: 6px;
        }
        .picker:focus-within {
          outline: 3px solid var(--input-focus-ring, rgba(17, 17, 17, .16));
          outline-offset: 6px;
        }
        .palette-panel {
          box-sizing: border-box;
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          z-index: 100;
          width: 240px;
          padding: 14px;
          border: 3px solid #171717;
          border-radius: 8px;
          background: #f5f0e6;
          box-shadow: 6px 6px 0 #171717;
          color: #171717;
        }
        .palette-panel[hidden] { display: none; }
        .palette-title {
          display: block;
          margin-bottom: 10px;
          font: 700 13px/1.2 "Inter", "Segoe UI", sans-serif;
        }
        .swatches {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .color-option {
          position: relative;
          width: 36px;
          height: 36px;
          padding: 0;
          border: 2px solid #171717;
          border-radius: 5px;
          background: var(--swatch-color);
          box-shadow: 2px 2px 0 #171717;
          cursor: pointer;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .color-option:hover {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 #171717;
        }
        .color-option[aria-pressed="true"]::after {
          position: absolute;
          inset: 1px;
          border-radius: 2px;
          background: rgba(255, 255, 255, .76);
          color: #171717;
          content: "\\2713";
          display: grid;
          font: 700 20px/1 "Inter", "Segoe UI", sans-serif;
          place-items: center;
          text-shadow: 0 1px #fff;
        }
        .custom-color {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 2px solid #171717;
          font: 700 12px/1.2 "Inter", "Segoe UI", sans-serif;
        }
        .custom-color input {
          box-sizing: border-box;
          position: static;
          inset: auto;
          flex: 0 0 42px;
          width: 42px;
          height: 32px;
          padding: 2px;
          border: 2px solid #171717;
          border-radius: 4px;
          background: #91b9ff;
          box-shadow: 2px 2px 0 #171717;
          opacity: 1;
          cursor: pointer;
        }
        :host([hidden]) { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .picker,
          .color-option { transition: none; }
        }
        .swatch {
          position: relative;
          display: block;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: conic-gradient(#ff91a4 0 25%, #f5e642 0 50%, #91b9ff 0 75%, #a4e5b8 0);
          border: 2px solid var(--nb-ink, #171717);
        }
        .swatch::after {
          position: absolute;
          inset: 5px;
          border: 2px solid var(--nb-ink, #171717);
          border-radius: 50%;
          background: var(--selected-color, var(--page-background, #f2f2f2));
          content: "";
        }
        input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          opacity: 0;
          cursor: pointer;
        }
      </style>
      <button class="picker" type="button" aria-label="Elegir color de fondo" title="Elegir color de fondo" aria-expanded="false" aria-controls="background-palette">
        <span class="swatch" aria-hidden="true"></span>
      </button>
      <div class="palette-panel" id="background-palette" role="group" aria-label="Paleta de colores" hidden>
        <span class="palette-title">Elige un color</span>
        <div class="swatches">
          <button class="color-option" type="button" style="--swatch-color: #f2f2f2" data-color="#f2f2f2" aria-label="Gris claro"></button>
          <button class="color-option" type="button" style="--swatch-color: #ffffff" data-color="#ffffff" aria-label="Blanco"></button>
          <button class="color-option" type="button" style="--swatch-color: #f5f0e6" data-color="#f5f0e6" aria-label="Crema"></button>
          <button class="color-option" type="button" style="--swatch-color: #f5e642" data-color="#f5e642" aria-label="Amarillo"></button>
          <button class="color-option" type="button" style="--swatch-color: #91b9ff" data-color="#91b9ff" aria-label="Azul cielo"></button>
          <button class="color-option" type="button" style="--swatch-color: #a4e5b8" data-color="#a4e5b8" aria-label="Verde"></button>
          <button class="color-option" type="button" style="--swatch-color: #ff91a4" data-color="#ff91a4" aria-label="Rosa"></button>
          <button class="color-option" type="button" style="--swatch-color: #e7d8ff" data-color="#e7d8ff" aria-label="Lavanda"></button>
        </div>
        <label class="custom-color">
          <span>Color personalizado</span>
          <input type="color" aria-label="Elegir color personalizado" />
        </label>
      </div>
    `;

    this.input = this.shadowRoot.querySelector("input");
    this.swatch = this.shadowRoot.querySelector(".swatch");
    this.pickerButton = this.shadowRoot.querySelector(".picker");
    this.palettePanel = this.shadowRoot.querySelector(".palette-panel");

    const savedColor = this._getSavedColor();
    this.input.value = this._normalizeColor(savedColor || "#f2f2f2");
    this.swatch.style.setProperty("--selected-color", this.input.value);
    if (savedColor) this._applyColor(this.input.value, false);
    this._updatePaletteSelection(this.input.value);

    this.pickerButton.addEventListener("click", () => this._setPaletteOpen(this.palettePanel.hidden));
    this.shadowRoot.querySelectorAll(".color-option").forEach((option) => {
      option.addEventListener("click", () => {
        this.input.value = option.dataset.color;
        lastAppliedColor = this.input.value;
        this._applyColor(this.input.value, true);
        this._setPaletteOpen(false);
        this.pickerButton.focus();
      });
    });
    this.palettePanel.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      this._setPaletteOpen(false);
      this.pickerButton.focus();
    });
    this._onDocumentPointerDown = (event) => {
      if (!event.composedPath().includes(this)) this._setPaletteOpen(false);
    };
    document.addEventListener("pointerdown", this._onDocumentPointerDown);

    let lastAppliedColor = this.input.value;
    const applySelectedColor = () => {
      if (this.input.value === lastAppliedColor) return;
      lastAppliedColor = this.input.value;
      this._applyColor(this.input.value, true);
    };
    this.input.addEventListener("input", applySelectedColor);
    this.input.addEventListener("change", () => {
      applySelectedColor();
      this._setPaletteOpen(false);
      this.pickerButton.focus();
    });

    document.addEventListener("theme-change", (event) => {
      if (event.detail?.theme !== "dark") return;
      this._saveColor("");
      this._clearCustomBackground();
      this.input.value = "#f2f2f2";
      this.swatch.style.setProperty("--selected-color", "#f2f2f2");
      this._updatePaletteSelection("#f2f2f2");
    });
  }

  disconnectedCallback() {
    if (this._onDocumentPointerDown) {
      document.removeEventListener("pointerdown", this._onDocumentPointerDown);
    }
  }

  _setPaletteOpen(isOpen) {
    this.palettePanel.hidden = !isOpen;
    this.pickerButton.setAttribute("aria-expanded", String(isOpen));
    this.toggleAttribute("palette-open", isOpen);
  }

  _updatePaletteSelection(color) {
    this.shadowRoot.querySelectorAll(".color-option").forEach((option) => {
      option.setAttribute("aria-pressed", String(option.dataset.color === color));
    });
  }

  _normalizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : "#f2f2f2";
  }

  _getSavedColor() {
    try {
      const profile = JSON.parse(localStorage.getItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY) || "{}");
      if (profile[ThemeBackgroundPicker.BACKGROUND_PROFILE_KEY]) {
        return profile[ThemeBackgroundPicker.BACKGROUND_PROFILE_KEY];
      }

      // Migra el valor usado por versiones anteriores.
      const legacyColor = localStorage.getItem("background-color");
      if (legacyColor) {
        this._saveColor(legacyColor);
        return legacyColor;
      }
    } catch (error) {
      // El selector sigue funcionando aunque el storage esté bloqueado.
    }
    return "";
  }

  _saveColor(color) {
    try {
      const profile = JSON.parse(localStorage.getItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY) || "{}");
      if (color) {
        profile[ThemeBackgroundPicker.BACKGROUND_PROFILE_KEY] = color;
        localStorage.setItem("background-color", color);
      } else {
        delete profile[ThemeBackgroundPicker.BACKGROUND_PROFILE_KEY];
        localStorage.removeItem("background-color");
      }
      localStorage.setItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      // El color sigue aplicándose visualmente si el storage no está disponible.
    }
  }

  _hexToRgb(hex) {
    const value = hex.slice(1);
    return {
      red: parseInt(value.slice(0, 2), 16),
      green: parseInt(value.slice(2, 4), 16),
      blue: parseInt(value.slice(4, 6), 16),
    };
  }

  _mix(hex, target, amount) {
    const sourceRgb = this._hexToRgb(hex);
    const targetRgb = this._hexToRgb(target);
    const channel = (source, destination) => Math.round(source + (destination - source) * amount);
    const toHex = (value) => value.toString(16).padStart(2, "0");
    return `#${toHex(channel(sourceRgb.red, targetRgb.red))}${toHex(channel(sourceRgb.green, targetRgb.green))}${toHex(channel(sourceRgb.blue, targetRgb.blue))}`;
  }

  _darken(hex, amount) {
    return this._mix(hex, "#000000", amount);
  }

  _luminance(hex) {
    const { red, green, blue } = this._hexToRgb(hex);
    const values = [red, green, blue].map((value) => {
      const channel = value / 255;
      return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  }

  _applyColor(color, persist) {
    const root = document.documentElement;
    // Todas las superficies conservan el tono elegido, pero son más oscuras
    // que el fondo para separar visualmente la información.
    const surface = this._darken(color, .14);
    const surfaceAlt = this._darken(color, .22);
    const inputSurface = this._darken(color, .1);
    const isDarkSurface = this._luminance(surface) < .179;

    root.style.setProperty("--page-background", color);
    root.style.setProperty("--bg-2", color);
    root.style.setProperty("--bg", surface);
    root.style.setProperty("--bg-3", surfaceAlt);
    root.style.setProperty("--text", isDarkSurface ? "#f5f7fa" : "#101828");
    root.style.setProperty("--text-muted", isDarkSurface ? "#e2e8f0" : "#3f4652");
    root.style.setProperty("--border", isDarkSurface ? "rgba(255, 255, 255, .24)" : "rgba(15, 23, 42, .2)");
    root.style.setProperty("--input-bg", inputSurface);
    root.style.setProperty("--input-border", isDarkSurface ? "rgba(255, 255, 255, .26)" : "rgba(15, 23, 42, .22)");
    root.style.setProperty("--input-text", isDarkSurface ? "#f5f7fa" : "#101828");
    root.style.setProperty("--shadow", isDarkSurface ? "0 16px 36px rgba(0, 0, 0, .42)" : "0 3px 14px rgba(15, 23, 42, .18)");
    document.body.classList.add("custom-background");
    document.body.classList.toggle("custom-background-dark", isDarkSurface);
    document.body.classList.remove("dark");

    const themeToggle = document.querySelector("theme-toggle");
    if (themeToggle?.setTheme) themeToggle.setTheme("light");

    this.swatch.style.setProperty("--selected-color", color);
    this._updatePaletteSelection(color);
    if (persist) this._saveColor(color);
  }

  _clearCustomBackground() {
    const root = document.documentElement;
    ["--page-background", "--bg", "--bg-2", "--bg-3", "--text", "--text-muted", "--border", "--input-bg", "--input-border", "--input-text", "--shadow"].forEach((property) => root.style.removeProperty(property));
    document.body.classList.remove("custom-background", "custom-background-dark");
  }
}

customElements.define("theme-background-picker", ThemeBackgroundPicker);
