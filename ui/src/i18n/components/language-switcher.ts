import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { I18nCore } from "../types.js";

/**
 * Language option type
 */
interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
}

/**
 * Language Switcher Component
 * A dropdown button to switch between supported languages
 *
 * @example
 * ```html
 * <language-switcher .i18n=${i18nInstance}></language-switcher>
 * ```
 */
@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--oc-bg-secondary, #f5f5f5);
      border: 1px solid var(--oc-border-color, #ddd);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      color: var(--oc-text-primary, #333);
      transition: all 0.2s ease;
    }

    .trigger:hover {
      background: var(--oc-bg-hover, #e9e9e9);
      border-color: var(--oc-border-hover, #bbb);
    }

    .trigger:active {
      background: var(--oc-bg-active, #ddd);
    }

    .trigger:focus-visible {
      outline: 2px solid var(--oc-focus-color, #4a90d9);
      outline-offset: 2px;
    }

    .lang-label {
      font-weight: 500;
    }

    .chevron {
      font-size: 10px;
      opacity: 0.6;
      transition: transform 0.2s ease;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 140px;
      background: var(--oc-bg-primary, white);
      border: 1px solid var(--oc-border-color, #ddd);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.2s ease;
    }

    .dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 14px;
      color: var(--oc-text-primary, #333);
      transition: background 0.15s ease;
      border-bottom: 1px solid var(--oc-border-light, #f0f0f0);
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:first-child {
      border-radius: 8px 8px 0 0;
    }

    .dropdown-item:last-child {
      border-radius: 0 0 8px 8px;
    }

    .dropdown-item:hover {
      background: var(--oc-bg-hover, #f5f5f5);
    }

    .dropdown-item.active {
      background: var(--oc-bg-selected, #e3f2fd);
      color: var(--oc-text-primary, #1976d2);
      font-weight: 500;
    }

    .check-icon {
      font-size: 12px;
      opacity: 0;
    }

    .dropdown-item.active .check-icon {
      opacity: 1;
    }

    .wrapper {
      position: relative;
      display: inline-block;
    }
  `;

  @property({ type: Object })
  i18n: I18nCore | undefined;

  @property({ type: Array })
  languages: LanguageOption[] = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "zh", label: "Chinese", nativeLabel: "中文" },
  ];

  @state()
  private isOpen = false;

  @state()
  private currentLang = "en";

  private unsubscribe?: () => void;
  private documentClickHandler?: (e: MouseEvent) => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.setupI18nListener();
    this.setupDocumentClickHandler();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    if (this.documentClickHandler) {
      document.removeEventListener("click", this.documentClickHandler);
    }
  }

  private setupI18nListener(): void {
    if (this.i18n) {
      this.currentLang = this.i18n.currentLang;
      this.unsubscribe = this.i18n.onLanguageChange((lang) => {
        this.currentLang = lang;
      });
    }
  }

  private setupDocumentClickHandler(): void {
    this.documentClickHandler = (e: MouseEvent) => {
      if (this.isOpen && !this.contains(e.target as Node)) {
        this.isOpen = false;
      }
    };
    document.addEventListener("click", this.documentClickHandler);
  }

  private toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  private async selectLanguage(code: string): Promise<void> {
    if (code === this.currentLang) {
      this.isOpen = false;
      return;
    }

    if (this.i18n) {
      await this.i18n.setLanguage(code);
    }

    this.isOpen = false;
  }

  private getCurrentLanguage(): LanguageOption | undefined {
    return this.languages.find((lang) => lang.code === this.currentLang);
  }

  render() {
    const current = this.getCurrentLanguage();

    return html`
      <div class="wrapper">
        <button
          class="trigger"
          @click=${this.toggleDropdown}
          aria-haspopup="listbox"
          aria-expanded=${this.isOpen}
        >
          <span class="lang-label">${current?.nativeLabel ?? current?.label ?? this.currentLang}</span>
          <span class="chevron ${this.isOpen ? "open" : ""}">▼</span>
        </button>

        <div
          class="dropdown ${this.isOpen ? "open" : ""}"
          role="listbox"
          aria-label="Select language"
        >
          ${this.languages.map(
            (lang) => html`
              <div
                class="dropdown-item ${lang.code === this.currentLang ? "active" : ""}"
                role="option"
                aria-selected=${lang.code === this.currentLang}
                @click=${() => this.selectLanguage(lang.code)}
              >
                <span>${lang.nativeLabel}</span>
                <span class="check-icon">✓</span>
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "language-switcher": LanguageSwitcher;
  }
}
