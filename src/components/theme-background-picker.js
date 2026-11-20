class ThemeBackgroundPicker extends HTMLElement {
  static PROFILE_STORAGE_KEY = "agenda_profile";
  static BACKGROUND_PROFILE_KEY = "backgroundColor";
  static SAVED_COLORS_PROFILE_KEY = "backgroundColors";
  static BACKGROUND_MIN_LIGHTNESS = 15;
  static PANEL_MIN_LIGHTNESS = 20;
  static PANEL_LIGHTNESS_DIFFERENCE = 15;
  static MAX_LIGHTNESS = 30;
  static NEUTRAL_SATURATION_LIMIT = 30;
  static MAX_NEUTRAL_LIGHTNESS = 93;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          display: inline-flex;
          --picker-shadow: 3px 3px 0 #171717;
          --picker-shadow-hover: 2px 2px 0 #171717;
          --picker-shadow-active: 0 0 0 #171717;
          --picker-popover-shadow: 6px 6px 0 #171717;
          --picker-control-shadow: 2px 2px 0 #171717;
          --picker-small-shadow: 0 1px 4px #0008;
          --picker-swatch-shadow: 0 0 0 2px var(--bg, #fff), 0 0 0 3px #171717;
        }
        .picker {
          display: inline-grid;
          width: 34px;
          height: 34px;
          padding: 0;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: var(--bg, hsl(0 0% 93%));
          box-shadow: var(--picker-shadow);
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease;
        }
        .picker:hover { transform: translate(1px, 1px); box-shadow: var(--picker-shadow-hover); }
        .picker:active { transform: translate(3px, 3px); box-shadow: var(--picker-shadow-active); }
        .picker:focus-visible { outline: 3px solid var(--custom-accent-text, #171717); outline-offset: 3px; }
        .swatch {
          width: 17px;
          height: 17px;
          border: 0;
          border-radius: 50%;
          background: var(--selected-color, hsl(0 0% 93%));
          box-shadow: var(--picker-swatch-shadow);
        }
        .popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 120;
          box-sizing: border-box;
          width: min(280px, calc(100vw - 32px));
          padding: 16px;
          border: 0;
          border-radius: 12px;
          background: var(--custom-panel-background, var(--bg, hsl(0 0% 93%)));
          color: var(--text, #171717);
          box-shadow: var(--picker-popover-shadow);
          font: 13px "Inter", "Segoe UI", sans-serif;
        }
        .popover[hidden], .saved-section[hidden], .color-editor[hidden] { display: none; }
        .popover-title { margin: 0 0 12px; color: var(--custom-accent-text, var(--text, #171717)); font: 700 14px "Inter", "Segoe UI", sans-serif; }
        .saved-section { margin-bottom: 14px; }
        .saved-title { margin: 0 0 9px; color: var(--text-muted, #4b5563); font: 700 10px "Inter", "Segoe UI", sans-serif; letter-spacing: .07em; text-transform: uppercase; }
        .saved-colors { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        .saved-item { position: relative; width: 32px; height: 32px; }
        .saved-option {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          box-shadow: var(--picker-control-shadow);
          cursor: pointer;
        }
        .saved-option[aria-pressed="true"] { outline: 2px solid var(--custom-accent-text, #171717); outline-offset: 2px; }
        .remove-color {
          position: absolute;
          top: -5px;
          right: -5px;
          display: grid;
          width: 16px;
          height: 16px;
          padding: 0;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: #171717;
          color: #fff;
          font: 700 12px/1 "Inter", "Segoe UI", sans-serif;
          cursor: pointer;
        }
        .custom-row { display: flex; align-items: center; gap: 9px; padding-top: 12px; }
        .custom-color { display: inline-flex; align-items: center; gap: 7px; color: var(--text, #171717); font: 600 11px "Inter", "Segoe UI", sans-serif; }
        .color-input {
          display: grid;
          width: 30px;
          height: 30px;
          padding: 3px;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: var(--custom-control-background, var(--bg, #fff));
          cursor: pointer;
        }
        .color-preview { width: 100%; height: 100%; border-radius: 50%; background: var(--selected-color, hsl(0 0% 93%)); }
        .hex-input, .hsl-input {
          box-sizing: border-box;
          border: 0;
          border-radius: 7px;
          background: var(--custom-control-background, var(--input-bg, #fff));
          color: var(--custom-control-text, var(--text, #171717));
          box-shadow: var(--picker-control-shadow);
          font: 600 11px "Inter", "Segoe UI", sans-serif;
          text-align: center;
        }
        .hex-input { width: 82px; height: 30px; padding: 0 7px; font-weight: 700; }
        .reset { margin-left: auto; padding: 5px 0; border: 0; background: transparent; color: var(--custom-accent-text, var(--text, #171717)); font: 600 11px "Inter", "Segoe UI", sans-serif; cursor: pointer; }
        .color-editor { display: grid; gap: 11px; margin-top: 12px; padding: 11px; border: 0; border-radius: 9px; background: var(--custom-panel-alt-background, var(--bg-3, var(--bg))); }
        .color-result { display: flex; align-items: center; gap: 10px; }
        .result-preview { width: 42px; height: 42px; flex: none; border-radius: 9px; box-shadow: var(--picker-shadow); }
        .result-details { display: grid; gap: 3px; }
        .result-label { color: var(--text-muted, #56636b); font: 600 10px "Inter", "Segoe UI", sans-serif; }
        .result-hex { color: var(--text, #171717); font: 700 12px "Inter", "Segoe UI", sans-serif; }
        .hsl-row { display: grid; gap: 8px; }
        .hsl-field { display: grid; grid-template-columns: 14px minmax(0, 1fr) 44px; align-items: center; gap: 7px; color: var(--text-muted, #56636b); font: 700 10px "Inter", "Segoe UI", sans-serif; }
        .hsl-slider { --slider-track: hsl(0 0% 70%); --slider-thumb-color: hsl(200 21% 20%); width: 100%; min-width: 0; height: 24px; margin: 0; padding: 0; appearance: none; border: 0; background: transparent; cursor: pointer; touch-action: pan-y; }
        .hsl-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 99px; background: var(--slider-track); }
        .hsl-slider::-webkit-slider-thumb { width: 16px; height: 16px; margin-top: -5px; appearance: none; border: 2px solid #fff; border-radius: 50%; background: var(--slider-thumb-color); box-shadow: var(--picker-small-shadow); }
        .hsl-slider::-moz-range-track { height: 6px; border: 0; border-radius: 99px; background: var(--slider-track); }
        .hsl-slider::-moz-range-thumb { width: 12px; height: 12px; border: 2px solid #fff; border-radius: 50%; background: var(--slider-thumb-color); box-shadow: var(--picker-small-shadow); }
        .hsl-input { width: 44px; height: 28px; }
        .save-color {
          width: 100%;
          margin-top: 10px;
          padding: 8px 10px;
          border: 0;
          border-radius: 7px;
          background: var(--custom-control-background, var(--bg, #fff));
          color: var(--custom-control-text, var(--text, #171717));
          box-shadow: var(--picker-shadow);
          font: 600 12px "Inter", "Segoe UI", sans-serif;
          cursor: pointer;
        }
        .save-color:disabled { cursor: default; opacity: .6; }
        .picker:focus-visible, .color-input:focus-visible, .saved-option:focus-visible,
        .remove-color:focus-visible, .reset:focus-visible, .save-color:focus-visible,
        .hex-input:focus-visible, .hsl-input:focus-visible, .hsl-slider:focus-visible {
          outline: 2px solid var(--custom-accent-text, #171717);
          outline-offset: 2px;
        }
        @media (max-width: 900px) {
          .popover {
            position: fixed;
            top: calc(72px + env(safe-area-inset-top, 0px));
            right: 12px;
            max-height: calc(100dvh - 96px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
            overflow-y: auto;
            overscroll-behavior: contain;
          }
        }
        :host([embedded]) .popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          max-height: min(65vh, 420px);
        }
        @media (prefers-reduced-motion: reduce) { .picker { transition: none; } }
      </style>
      <button class="picker" type="button" aria-label="Elegir color de fondo" title="Elegir color de fondo" aria-expanded="false" aria-controls="background-picker-panel">
        <span class="swatch" aria-hidden="true"></span>
      </button>
      <section class="popover" id="background-picker-panel" aria-label="Selector de color de fondo" hidden>
        <h2 class="popover-title">Fondo personalizado</h2>
        <section class="saved-section" aria-label="Colores guardados" hidden>
          <h3 class="saved-title">Mis colores guardados</h3>
          <div class="saved-colors"></div>
        </section>
        <div class="custom-row">
          <div class="custom-color">
            <button class="color-input" type="button" aria-label="Abrir selector HSL" aria-expanded="false" aria-controls="custom-color-editor"><span class="color-preview"></span></button>
            <span>Personalizar</span>
          </div>
          <input class="hex-input" type="text" value="#F2F2F2" maxlength="7" pattern="#[0-9a-fA-F]{6}" aria-label="Código hexadecimal del color" />
          <button class="reset" type="button">Restablecer</button>
        </div>
        <section class="color-editor" id="custom-color-editor" aria-label="Selector HSL" hidden>
          <div class="color-result">
            <span class="result-preview" role="img" aria-label="Color resultante"></span>
            <span class="result-details"><span class="result-label">Color resultante</span><strong class="result-hex">#F2F2F2</strong></span>
          </div>
          <div class="hsl-row" aria-label="Valores HSL">
            <label class="hsl-field"><span>H</span><input class="hsl-slider" type="range" min="0" max="360" step="1" aria-label="Tono HSL" /><input class="hsl-input" type="number" min="0" max="360" aria-label="Valor de tono HSL" /></label>
            <label class="hsl-field"><span>S</span><input class="hsl-slider" type="range" min="0" max="100" step="1" aria-label="Saturación HSL" /><input class="hsl-input" type="number" min="0" max="100" aria-label="Valor de saturación HSL" /></label>
            <label class="hsl-field"><span>L</span><input class="hsl-slider" type="range" min="15" max="93" step="1" aria-label="Luminosidad HSL" /><input class="hsl-input" type="number" min="15" max="93" aria-label="Valor de luminosidad HSL" /></label>
          </div>
        </section>
        <button class="save-color" type="button">Guardar este color</button>
      </section>
    `;

    this.trigger = this.shadowRoot.querySelector(".picker");
    this.panel = this.shadowRoot.querySelector(".popover");
    this.colorInput = this.shadowRoot.querySelector(".color-input");
    this.colorPreview = this.shadowRoot.querySelector(".color-preview");
    this.colorEditor = this.shadowRoot.querySelector(".color-editor");
    this.resultPreview = this.shadowRoot.querySelector(".result-preview");
    this.resultHex = this.shadowRoot.querySelector(".result-hex");
    this.hslSliders = [...this.shadowRoot.querySelectorAll(".hsl-slider")];
    this.hslInputs = [...this.shadowRoot.querySelectorAll(".hsl-input")];
    this.hexInput = this.shadowRoot.querySelector(".hex-input");
    this.swatch = this.shadowRoot.querySelector(".swatch");
    this.savedColorsSection = this.shadowRoot.querySelector(".saved-section");
    this.savedColorsContainer = this.shadowRoot.querySelector(".saved-colors");
    this.saveColorButton = this.shadowRoot.querySelector(".save-color");
    this.savedColors = this._getSavedColors();

    const savedColor = this._getSavedColor();
    this._lastAppliedColor = this._normalizeColor(savedColor || "#f2f2f2");
    this._syncColorControls(this._lastAppliedColor);
    this._renderSavedColors();
    if (savedColor) this._applyColor(this._lastAppliedColor, false);

    this.trigger.addEventListener("click", () => this._setOpen(this.panel.hidden));
    this.colorInput.addEventListener("click", () => {
      this.colorEditor.hidden = !this.colorEditor.hidden;
      this.colorInput.setAttribute("aria-expanded", String(!this.colorEditor.hidden));
    });
    this.hslSliders.forEach((slider, index) => slider.addEventListener("input", () => {
      this.hslInputs[index].value = slider.value;
      this._applyHslControls();
    }));
    this.hslInputs.forEach((input) => input.addEventListener("change", () => this._applyHslControls()));
    this.hexInput.addEventListener("input", () => {
      const color = this.hexInput.value.trim();
      const isValid = /^#[0-9a-f]{6}$/i.test(color);
      this.hexInput.setAttribute("aria-invalid", String(!isValid));
      if (isValid) this._applySelectedColor(color);
    });
    this.shadowRoot.querySelector(".reset").addEventListener("click", () => {
      const themeToggle = document.querySelector("theme-toggle");
      if (typeof themeToggle?.setTheme === "function") {
        themeToggle.setTheme("light");
      } else {
        document.body.classList.remove("dark");
        try {
          localStorage.setItem("theme", "light");
        } catch (error) {
          console.error("No se pudo guardar el tema claro al restablecer el fondo.", error);
        }
      }
      this._saveColor("");
      this._clearCustomBackground();
      this._lastAppliedColor = this._normalizeColor("#f2f2f2");
      this._syncColorControls(this._lastAppliedColor);
      this._setOpen(false);
      this.trigger.focus();
    });
    this.saveColorButton.addEventListener("click", () => {
      if (this.savedColors.includes(this._lastAppliedColor)) return;
      this.savedColors.push(this._lastAppliedColor);
      this._saveSavedColors();
      this._saveColor(this._lastAppliedColor);
      this._renderSavedColors();
    });

    this._handleDocumentPointerDown = (event) => {
      if (!event.composedPath().includes(this)) this._setOpen(false);
    };
    this._handleKeydown = (event) => {
      if (event.key === "Escape" && !this.panel.hidden) {
        this._setOpen(false);
        this.trigger.focus();
      }
    };
    this._handleThemeChange = (event) => {
      if (event.detail?.theme !== "dark") return;
      this._saveColor("");
      this._clearCustomBackground();
      this._lastAppliedColor = this._normalizeColor("#f2f2f2");
      this._syncColorControls(this._lastAppliedColor);
      this._setOpen(false);
    };
    document.addEventListener("pointerdown", this._handleDocumentPointerDown);
    document.addEventListener("keydown", this._handleKeydown);
    document.addEventListener("theme-change", this._handleThemeChange);
  }

  disconnectedCallback() {
    document.removeEventListener("pointerdown", this._handleDocumentPointerDown);
    document.removeEventListener("keydown", this._handleKeydown);
    document.removeEventListener("theme-change", this._handleThemeChange);
  }

  _setOpen(isOpen) {
    this.panel.hidden = !isOpen;
    this.trigger.setAttribute("aria-expanded", String(isOpen));
    this.toggleAttribute("palette-open", isOpen);
    if (!isOpen) {
      this.colorEditor.hidden = true;
      this.colorInput.setAttribute("aria-expanded", "false");
    }
  }

  _syncColorControls(color) {
    const hsl = this._clampHsl(this._hexToHsl(color));
    const colorCss = this._hslToCss(hsl);
    const values = [hsl.hue, hsl.saturation, hsl.lightness];
    const maxLightness = hsl.saturation <= ThemeBackgroundPicker.NEUTRAL_SATURATION_LIMIT
      ? ThemeBackgroundPicker.MAX_NEUTRAL_LIGHTNESS
      : ThemeBackgroundPicker.MAX_LIGHTNESS;
    const sliderTracks = [
      "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))",
      `linear-gradient(to right, hsl(${hsl.hue} 0% ${hsl.lightness}%), hsl(${hsl.hue} 100% ${hsl.lightness}%))`,
      `linear-gradient(to right, hsl(${hsl.hue} ${hsl.saturation}% ${ThemeBackgroundPicker.BACKGROUND_MIN_LIGHTNESS}%), hsl(${hsl.hue} ${hsl.saturation}% ${maxLightness}%))`,
    ];
    this.colorPreview.style.background = colorCss;
    this.hexInput.value = color.toUpperCase();
    this.hexInput.setAttribute("aria-invalid", "false");
    this.swatch.style.setProperty("--selected-color", colorCss);
    this.resultPreview.style.background = colorCss;
    this.resultHex.textContent = color.toUpperCase();
    this.hslInputs.forEach((input, index) => { input.value = String(Math.round(values[index])); });
    this.hslInputs[2].max = String(maxLightness);
    this.hslSliders.forEach((slider, index) => {
      if (index === 2) slider.max = String(maxLightness);
      slider.value = String(Math.round(values[index]));
      slider.style.setProperty("--slider-track", sliderTracks[index]);
      slider.style.setProperty("--slider-thumb-color", colorCss);
      slider.setAttribute("aria-valuetext", index === 0 ? `${Math.round(values[index])} grados` : `${Math.round(values[index])}%`);
    });
    this.savedColorsContainer.querySelectorAll(".saved-option").forEach((option) => {
      option.setAttribute("aria-pressed", String(option.dataset.color === color.toLowerCase()));
    });
    this.saveColorButton.disabled = this.savedColors.includes(color.toLowerCase());
  }

  _renderSavedColors() {
    this.savedColorsContainer.replaceChildren();
    this.savedColorsSection.hidden = this.savedColors.length === 0;
    this.savedColors.forEach((color, index) => {
      const item = document.createElement("div");
      item.className = "saved-item";
      const option = document.createElement("button");
      option.className = "saved-option";
      option.type = "button";
      option.dataset.color = color;
      option.style.backgroundColor = this._hslToCss(this._hexToHsl(color));
      option.setAttribute("aria-label", `Usar color guardado ${color.toUpperCase()}`);
      option.setAttribute("aria-pressed", String(color === this._lastAppliedColor));
      option.title = color.toUpperCase();
      option.addEventListener("click", () => {
        this._applySelectedColor(color);
        this._setOpen(false);
        this.trigger.focus();
      });

      const remove = document.createElement("button");
      remove.className = "remove-color";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Eliminar color guardado ${color.toUpperCase()}`);
      remove.addEventListener("click", () => {
        this.savedColors.splice(index, 1);
        this._saveSavedColors();
        if (color === this._lastAppliedColor) this._saveColor("");
        this._renderSavedColors();
      });
      item.append(option, remove);
      this.savedColorsContainer.append(item);
    });
    this._syncColorControls(this._lastAppliedColor);
  }

  _getSavedColors() {
    try {
      const profile = JSON.parse(localStorage.getItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY) || "{}");
      const colors = profile[ThemeBackgroundPicker.SAVED_COLORS_PROFILE_KEY];
      if (!Array.isArray(colors)) return [];
      const normalizedColors = [...new Set(colors
        .filter((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color))
        .map((color) => this._normalizeColor(color)))];
      if (JSON.stringify(colors) !== JSON.stringify(normalizedColors)) {
        profile[ThemeBackgroundPicker.SAVED_COLORS_PROFILE_KEY] = normalizedColors;
        localStorage.setItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY, JSON.stringify(profile));
      }
      return normalizedColors;
    } catch (error) {
      return [];
    }
  }

  _saveSavedColors() {
    try {
      const profile = JSON.parse(localStorage.getItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY) || "{}");
      profile[ThemeBackgroundPicker.SAVED_COLORS_PROFILE_KEY] = this.savedColors;
      localStorage.setItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      // Los colores guardados permanecen disponibles durante esta sesión.
    }
  }

  _applySelectedColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    const normalizedColor = this._normalizeColor(color);
    const isSavedColor = this.savedColors.includes(normalizedColor);
    if (normalizedColor === this._lastAppliedColor) {
      this._saveColor(isSavedColor ? normalizedColor : "");
      return;
    }
    this._lastAppliedColor = normalizedColor;
    this._applyColor(normalizedColor, isSavedColor);
    if (!isSavedColor) this._saveColor("");
  }

  _normalizeColor(value) {
    if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) value = "#f2f2f2";
    const hsl = this._clampHsl(this._hexToHsl(value));
    return this._hslToHex(hsl.hue, hsl.saturation, hsl.lightness);
  }

  _getSavedColor() {
    try {
      const profile = JSON.parse(localStorage.getItem(ThemeBackgroundPicker.PROFILE_STORAGE_KEY) || "{}");
      const profileColor = profile[ThemeBackgroundPicker.BACKGROUND_PROFILE_KEY];
      if (typeof profileColor === "string" && /^#[0-9a-f]{6}$/i.test(profileColor)) {
        const normalizedColor = this._normalizeColor(profileColor);
        if (this.savedColors.includes(normalizedColor)) return normalizedColor;
      }
      const legacyColor = localStorage.getItem("background-color");
      if (typeof legacyColor === "string" && /^#[0-9a-f]{6}$/i.test(legacyColor)) {
        const normalizedLegacyColor = this._normalizeColor(legacyColor);
        if (this.savedColors.includes(normalizedLegacyColor)) {
          this._saveColor(normalizedLegacyColor);
          return normalizedLegacyColor;
        }
      }
      this._saveColor("");
    } catch (error) {
      // El selector sigue funcionando aunque el almacenamiento no esté disponible.
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
      // El color sigue aplicándose visualmente aunque el almacenamiento no esté disponible.
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

  _hexToHsl(hex) {
    const { red, green, blue } = this._hexToRgb(hex);
    const r = red / 255, g = green / 255, b = blue / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    const lightness = (max + min) / 2;
    let hue = 0, saturation = 0;
    if (delta) {
      saturation = delta / (1 - Math.abs(2 * lightness - 1));
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
    }
    return { hue: (hue + 360) % 360, saturation: saturation * 100, lightness: lightness * 100 };
  }

  _rgbToHex(red, green, blue) {
    return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  }

  _hslToHex(hue, saturation, lightness) {
    const h = ((hue % 360) + 360) % 360 / 60;
    const s = saturation / 100, l = lightness / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs(h % 2 - 1));
    const m = l - chroma / 2;
    let rgb = [0, 0, 0];
    if (h < 1) rgb = [chroma, x, 0];
    else if (h < 2) rgb = [x, chroma, 0];
    else if (h < 3) rgb = [0, chroma, x];
    else if (h < 4) rgb = [0, x, chroma];
    else if (h < 5) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];
    return this._rgbToHex(...rgb.map((channel) => (channel + m) * 255));
  }

  _hslToCss(hsl) {
    return `hsl(${hsl.hue.toFixed(1)} ${hsl.saturation.toFixed(1)}% ${hsl.lightness.toFixed(1)}%)`;
  }

  _clampHsl(hsl, minimumLightness = ThemeBackgroundPicker.BACKGROUND_MIN_LIGHTNESS) {
    const hueValue = Number(hsl.hue);
    const saturationValue = Number(hsl.saturation);
    const lightnessValue = Number(hsl.lightness);
    const hue = ((Number.isFinite(hueValue) ? hueValue : 0) % 360 + 360) % 360;
    const saturation = Math.max(0, Math.min(100, Number.isFinite(saturationValue) ? saturationValue : 0));
    const maxLightness = saturation <= ThemeBackgroundPicker.NEUTRAL_SATURATION_LIMIT
      ? ThemeBackgroundPicker.MAX_NEUTRAL_LIGHTNESS
      : ThemeBackgroundPicker.MAX_LIGHTNESS;
    const lightness = Math.max(minimumLightness, Math.min(maxLightness, Number.isFinite(lightnessValue) ? lightnessValue : minimumLightness));
    return { hue, saturation, lightness };
  }

  _applyHslControls() {
    if (this.hslInputs.some((input) => input.value === "")) return;
    const values = this.hslInputs.map((input) => Number(input.value));
    const hsl = this._clampHsl({ hue: values[0], saturation: values[1], lightness: values[2] });
    const color = this._hslToHex(hsl.hue, hsl.saturation, hsl.lightness);
    this._syncColorControls(color);
    this._applySelectedColor(color);
  }

  _relativeLuminance(hex) {
    const { red, green, blue } = this._hexToRgb(hex);
    const values = [red, green, blue].map((value) => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  }

  _minimumContrast(foreground, backgrounds) {
    const foregroundLuminance = this._relativeLuminance(foreground);
    return Math.min(...backgrounds.map((background) => {
      const backgroundLuminance = this._relativeLuminance(background);
      return (Math.max(foregroundLuminance, backgroundLuminance) + .05)
        / (Math.min(foregroundLuminance, backgroundLuminance) + .05);
    }));
  }

  _highContrastText(backgrounds) {
    return this._minimumContrast("#ffffff", backgrounds) > this._minimumContrast("#000000", backgrounds)
      ? "#ffffff"
      : "#000000";
  }

  _panelSurface(baseHsl) {
    const renderHex = (hsl) => this._hslToHex(Number(hsl.hue.toFixed(1)), Number(hsl.saturation.toFixed(1)), Number(hsl.lightness.toFixed(1)));
    const preferredDirection = baseHsl.lightness >= 50 ? -1 : 1;
    const maxLightness = baseHsl.saturation <= ThemeBackgroundPicker.NEUTRAL_SATURATION_LIMIT
      ? ThemeBackgroundPicker.MAX_NEUTRAL_LIGHTNESS
      : 100;
    const hsl = {
      ...baseHsl,
      lightness: Math.max(0, Math.min(maxLightness, baseHsl.lightness + preferredDirection * ThemeBackgroundPicker.PANEL_LIGHTNESS_DIFFERENCE)),
    };
    return { hsl, textColor: this._highContrastText([renderHex(hsl)]) };
  }

  _surfaceHsl(baseHsl, lightness) {
    return this._hslToCss(this._clampHsl({ ...baseHsl, lightness }, ThemeBackgroundPicker.PANEL_MIN_LIGHTNESS));
  }

  _applyColor(color, persist) {
    const themeToggle = document.querySelector("theme-toggle");
    if (typeof themeToggle?.setTheme === "function") {
      themeToggle.setTheme("light");
    } else {
      document.body.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch (error) {
        // El fondo personalizado sigue aplicándose.
      }
    }

    const root = document.documentElement;
    const backgroundHsl = this._clampHsl(this._hexToHsl(color));
    const isNeutralBackground = backgroundHsl.saturation <= ThemeBackgroundPicker.NEUTRAL_SATURATION_LIMIT;
    const panelBaseLightness = isNeutralBackground
      ? backgroundHsl.lightness
      : backgroundHsl.lightness >= ThemeBackgroundPicker.MAX_LIGHTNESS
        ? ThemeBackgroundPicker.MAX_LIGHTNESS + 2
        : Math.max(20, backgroundHsl.lightness - 3);
    const inputSurfaceHsl = this._clampHsl({ ...backgroundHsl, lightness: panelBaseLightness - 1 }, ThemeBackgroundPicker.PANEL_MIN_LIGHTNESS);
    const renderHex = (hsl) => this._hslToHex(Number(hsl.hue.toFixed(1)), Number(hsl.saturation.toFixed(1)), Number(hsl.lightness.toFixed(1)));
    const panelSurface = this._panelSurface(backgroundHsl);
    const surface = this._hslToCss(panelSurface.hsl);
    const inputSurface = this._hslToCss(inputSurfaceHsl);
    const controlHsl = this._clampHsl({ ...backgroundHsl, lightness: isNeutralBackground ? 27 : 25 }, ThemeBackgroundPicker.PANEL_MIN_LIGHTNESS);
    const controlBackground = this._hslToCss(controlHsl);
    const controlHover = this._surfaceHsl(backgroundHsl, isNeutralBackground ? 24 : 22);
    const textColor = this._highContrastText([renderHex(backgroundHsl)]);
    const panelTextColor = panelSurface.textColor;
    const isDarkSurface = textColor === "#ffffff";
    const controlText = this._highContrastText([renderHex(controlHsl)]);

    root.style.setProperty("--page-background", this._hslToCss(backgroundHsl));
    root.style.setProperty("--custom-navbar-background", surface);
    root.style.setProperty("--custom-sidebar-background", surface);
    root.style.setProperty("--custom-panel-background", surface);
    root.style.setProperty("--custom-panel-alt-background", surface);
    root.style.setProperty("--custom-panel-text", panelTextColor);
    root.style.setProperty("--custom-control-background", controlBackground);
    root.style.setProperty("--custom-control-hover", controlHover);
    root.style.setProperty("--custom-control-text", controlText);
    root.style.setProperty("--custom-accent-text", panelTextColor);
    root.style.setProperty("--bg-2", this._hslToCss(backgroundHsl));
    root.style.setProperty("--bg", surface);
    root.style.setProperty("--bg-3", surface);
    root.style.setProperty("--text", textColor);
    root.style.setProperty("--text-muted", textColor);
    root.style.setProperty("--border", "transparent");
    root.style.setProperty("--input-bg", inputSurface);
    root.style.setProperty("--input-border", "transparent");
    root.style.setProperty("--input-text", this._highContrastText([renderHex(inputSurfaceHsl)]));
    root.style.setProperty("--shadow", "6px 6px 0 #171717");
    root.style.setProperty("--shadow-nav", "6px 6px 0 #171717");

    document.body.classList.add("custom-background");
    document.body.classList.toggle("custom-background-dark", isDarkSurface);
    document.body.classList.remove("dark");
    const contrastVars = {
      "--nb-shadow-color": "#171717",
      "--nb-shadow": "6px 6px 0 #171717",
      "--nb-shadow-hover": "4px 4px 0 #171717",
      "--nb-push-shadow": "4px 4px 0 #171717",
      "--nb-push-shadow-hover": "2px 2px 0 #171717",
      "--nb-yellow": this._hslToCss(backgroundHsl),
      "--nb-white": surface,
      "--nb-ink": textColor,
      "--nb-control": inputSurface,
      "--nb-control-hover": controlHover,
      "--nb-border": "0",
    };
    Object.entries(contrastVars).forEach(([property, value]) => root.style.setProperty(property, value));

    this._syncColorControls(this._normalizeColor(color));
    if (persist) this._saveColor(this._normalizeColor(color));
  }

  _clearCustomBackground() {
    const root = document.documentElement;
    [
      "--page-background", "--custom-navbar-background", "--custom-sidebar-background",
      "--custom-panel-background", "--custom-panel-alt-background", "--custom-panel-text", "--custom-control-background",
      "--custom-control-hover", "--custom-control-text", "--custom-accent-text", "--bg", "--bg-2",
      "--bg-3", "--text", "--text-muted", "--border", "--input-bg", "--input-border", "--input-text",
      "--shadow", "--shadow-nav", "--nb-shadow-color", "--nb-shadow", "--nb-shadow-hover",
      "--nb-push-shadow", "--nb-push-shadow-hover", "--nb-yellow", "--nb-white", "--nb-ink",
      "--nb-control", "--nb-control-hover", "--nb-border",
    ].forEach((property) => root.style.removeProperty(property));
    document.body.classList.remove("custom-background", "custom-background-dark");
  }
}

customElements.define("theme-background-picker", ThemeBackgroundPicker);
