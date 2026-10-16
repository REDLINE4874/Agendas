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
        :host { display: inline-flex; }
        .picker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border: 1px solid rgba(148, 163, 184, .35);
          border-radius: 999px;
          background: var(--bg, #fff);
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(15, 23, 42, .12);
          transition: transform .2s ease, border-color .2s ease;
        }
        .picker:hover { transform: translateY(-1px); border-color: var(--accent-color, #111); }
        .picker:focus-visible {
          outline: 3px solid var(--input-focus-ring, rgba(17, 17, 17, .16));
          outline-offset: 2px;
        }
        .swatch {
          width: 16px;
          height: 16px;
          border-radius: 5px;
          background: var(--page-background, #f2f2f2);
          border: 1px solid rgba(100, 116, 139, .45);
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .7), 0 1px 3px rgba(0, 0, 0, .2);
        }
        input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      </style>
      <button class="picker" type="button" aria-label="Elegir color de fondo" title="Elegir color de fondo">
        <span class="swatch" aria-hidden="true"></span>
      </button>
      <input type="color" aria-label="Color de fondo" />
    `;

    this.button = this.shadowRoot.querySelector(".picker");
    this.input = this.shadowRoot.querySelector("input");
    this.swatch = this.shadowRoot.querySelector(".swatch");

    const savedColor = this._getSavedColor();
    this.input.value = this._normalizeColor(savedColor || "#f2f2f2");
    if (savedColor) this._applyColor(this.input.value, false);

    this.button.addEventListener("click", () => this.input.click());
    this.input.addEventListener("input", () => this._applyColor(this.input.value, true));

    document.addEventListener("theme-change", (event) => {
      if (event.detail?.theme !== "dark") return;
      this._saveColor("");
      this._clearCustomBackground();
      this.input.value = "#f2f2f2";
      this.swatch.style.background = "#f2f2f2";
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
    const isDarkSurface = this._luminance(surface) < .52;

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

    this.swatch.style.background = color;
    if (persist) this._saveColor(color);
  }

  _clearCustomBackground() {
    const root = document.documentElement;
    ["--page-background", "--bg", "--bg-2", "--bg-3", "--text", "--text-muted", "--border", "--input-bg", "--input-border", "--input-text", "--shadow"].forEach((property) => root.style.removeProperty(property));
    document.body.classList.remove("custom-background", "custom-background-dark");
  }
}

customElements.define("theme-background-picker", ThemeBackgroundPicker);
