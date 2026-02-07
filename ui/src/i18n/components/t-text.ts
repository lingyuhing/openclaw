import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { I18nCore } from "../types.js";

/**
 * Translation Text Component
 * Renders a translated text string based on the provided key
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <t-text key="common.save"></t-text>
 *
 * <!-- With parameters -->
 * <t-text key="common.welcome" .params=${{ name: "John" }}></t-text>
 *
 * <!-- With custom tag -->
 * <t-text key="nav.chat" tag="span" class="nav-label"></t-text>
 * ```
 */
@customElement("t-text")
export class TText extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }
  `;

  @property({ type: String })
  key = "";

  @property({ type: Object })
  params: Record<string, string | number> | undefined;

  @property({ type: String })
  tag = "span";

  @property({ type: String })
  fallback = "";

  @property({ type: Object })
  i18n: I18nCore | undefined;

  @state()
  private translatedText = "";

  private unsubscribe?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.updateTranslation();
    this.setupI18nListener();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (
      changedProperties.has("key") ||
      changedProperties.has("params") ||
      changedProperties.has("i18n")
    ) {
      this.updateTranslation();
    }

    // Re-subscribe if i18n instance changed
    if (changedProperties.has("i18n")) {
      this.setupI18nListener();
      this.updateTranslation();
    }
  }

  private setupI18nListener(): void {
    // Clean up previous subscription
    this.unsubscribe?.();

    const i18nInstance = this.i18n ?? this.getGlobalI18n?.();
    if (i18nInstance) {
      this.unsubscribe = i18nInstance.onLanguageChange(() => {
        this.updateTranslation();
      });
    }
  }

  private updateTranslation(): void {
    if (!this.key) {
      this.translatedText = this.fallback || "";
      return;
    }

    const i18nInstance = this.i18n ?? this.getGlobalI18n?.();
    if (i18nInstance) {
      this.translatedText = i18nInstance.t(this.key, this.params);
    } else {
      this.translatedText = this.fallback || this.key;
    }
  }

  /**
   * Attempt to get global i18n instance if available
   * This allows using t-text without explicitly passing i18n
   */
  private get getGlobalI18n(): (() => I18nCore | undefined) | undefined {
    // Check for global i18n instance (set by initI18n)
    if (typeof window !== "undefined") {
      const win = window as unknown as Record<string, unknown>;
      if (win.__I18N__) {
        return () => win.__I18N__ as I18nCore;
      }
    }
    return undefined;
  }

  render() {
    // Use the specified tag or default to span
    const tagName = this.tag || "span";

    // Create the element with the translated text
    // We use lit-html's unsafeStatic to allow dynamic tag names
    // But since we're returning text content only, we use a simpler approach

    switch (tagName) {
      case "div":
        return html`<div part="text">${this.translatedText}</div>`;
      case "p":
        return html`<p part="text">${this.translatedText}</p>`;
      case "button":
        return html`<button part="text">${this.translatedText}</button>`;
      case "label":
        return html`<label part="text">${this.translatedText}</label>`;
      case "h1":
        return html`<h1 part="text">${this.translatedText}</h1>`;
      case "h2":
        return html`<h2 part="text">${this.translatedText}</h2>`;
      case "h3":
        return html`<h3 part="text">${this.translatedText}</h3>`;
      case "h4":
        return html`<h4 part="text">${this.translatedText}</h4>`;
      case "h5":
        return html`<h5 part="text">${this.translatedText}</h5>`;
      case "h6":
        return html`<h6 part="text">${this.translatedText}</h6>`;
      case "strong":
        return html`<strong part="text">${this.translatedText}</strong>`;
      case "em":
        return html`<em part="text">${this.translatedText}</em>`;
      case "small":
        return html`<small part="text">${this.translatedText}</small>`;
      case "time":
        return html`<time part="text">${this.translatedText}</time>`;
      case "a":
        return html`<a part="text">${this.translatedText}</a>`;
      default:
        return html`<span part="text">${this.translatedText}</span>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "t-text": TText;
  }
  interface Window {
    __I18N__?: unknown;
  }
}
