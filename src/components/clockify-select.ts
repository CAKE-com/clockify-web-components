import { LitElement, html, unsafeCSS, nothing, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import "../styles/sl-overrides.css";
import clockifySelectStyles from "../styles/generic/clockify-select.css?inline";

import "./clockify-input";
import "./clockify-button";
import "./clockify-checkbox";
import "./clockify-menu";
import "./clockify-menu-item";
import "./clockify-menu-label";
import "./clockify-radio";

class ClockifySelect extends LitElement {
  @property({ type: String }) placeholder = "";
  @property({ type: String }) filterInputPlaceholder = "Search options";
  @property({ type: String }) name = "";
  @property({ type: String }) size: "small" | "medium" | "large" = "medium";
  @property({ type: Boolean }) multiple = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) showSelectAll = false;
  @property({ type: Boolean }) showFilterInput: boolean | null = null;
  @property({ type: Boolean }) disableInternalFilter = false;
  @property({ type: Boolean }) borderless = false;
  @property({ type: Boolean }) stayOpenOnSelect = false;
  @property({ type: Boolean }) radio = false;
  @property({ type: Boolean }) required = false;
  @property({ type: String }) theme: "DEFAULT" | "DARK" = "DEFAULT";
  @property({ type: String }) title = "";
  @property({ type: String }) highlightedOption = "";
  @property({ type: Array }) selectedValues: string[] = [];
  @property({ type: Array }) options: HTMLOptionElement[] = [];
  @property({ type: Array }) filteredOptions: HTMLOptionElement[] = [];
  @property({ type: Function }) onchange: (e: Event) => void = () => {};
  @property() filterString = "";
  @state() tempSelectedValues: string[] = [];

  static styles = [unsafeCSS(clockifySelectStyles)];

  firstUpdated() {
    const slot = this.shadowRoot?.querySelector("slot");
    slot?.style.setProperty("display", "none");
    this.updateSlot();

    slot?.addEventListener("slotchange", () => {
      this.updateSlot();
    });

    this.tempSelectedValues = this.selectedValues;
  }

  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    if (_changedProperties.has("selectedValues")) {
      this.tempSelectedValues = this.selectedValues;
    }
  }

  updateSlot() {
    const slot = this.shadowRoot?.querySelector("slot");
    slot?.style.setProperty("display", "none");
    this.options = slot?.assignedElements({ flatten: true })?.filter((el: Element) => el.tagName === "OPTION" || el.tagName === "DIV") as HTMLOptionElement[];
    this.updateOptions();
  }

  dispatchChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          selected: this.multiple ? this.selectedValues : this.selectedValues[0],
        },
        bubbles: true,
        composed: false,
      })
    );
  }

  dispatchOpenEvent(open: boolean) {
    this.open = open;
    this.dispatchEvent(
      new CustomEvent("open", {
        detail: { open },
        bubbles: true,
        composed: false,
      })
    );
    if (!open) {
      this.selectedValues = this.tempSelectedValues;
      this.dispatchChangeEvent();
    }
  }

  handleFilterChange(e: InputEvent) {
    const filter = (e.target as HTMLInputElement).value;
    if (!this.disableInternalFilter) {
      this.filterString = filter;
    }
    this.dispatchEvent(
      new CustomEvent("filter-change", {
        detail: { filter },
        bubbles: true,
        composed: true,
      })
    );
    this.updateOptions();
  }

  updateOptions() {
    if (this.disableInternalFilter) {
      this.filteredOptions = this.options;
    } else {
      this.filteredOptions = this.options.filter((o) => {
        return o.childElementCount || o.dataset.heading === "true" || o.textContent?.toLowerCase().includes(this.filterString.toLowerCase());
      });
    }
  }

  getOptionContent(option: HTMLOptionElement) {
    return option.childElementCount ? option.children || option.childNodes : html`<span>${option.textContent}</span>`;
  }

  handleCheckboxChange(e: KeyboardEvent) {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      const optionContainer = target.parentElement as HTMLElement;
      const value = optionContainer.dataset.value as string;
      if (this.tempSelectedValues.includes(value)) {
        this.tempSelectedValues = this.tempSelectedValues.filter((v) => v !== value);
      } else {
        this.tempSelectedValues = [...this.tempSelectedValues, value];
      }
    }
  }

  handleSelectOption(event: MouseEvent) {
    const target = event.currentTarget as HTMLOptionElement;
    if (!target.disabled) {
      const value = target.dataset.value as string;
      if (this.multiple) {
        if (this.tempSelectedValues.includes(value)) {
          this.tempSelectedValues = this.tempSelectedValues.filter((v) => v !== value);
        } else {
          this.tempSelectedValues = [...this.tempSelectedValues, value];
        }
      } else {
        this.tempSelectedValues = value !== undefined ? [value] : [];
        this.open = false;
        this.highlightedOption = "";
      }
    }
  }

  handleSelectAll() {
    const isFiltered = this.options.length !== this.filteredOptions.length;
    if (isFiltered) {
      const allFilteredSelected = this.filteredOptions.map((o) => o.value).join(",") === this.tempSelectedValues.join(",");
      if (allFilteredSelected) {
        this.tempSelectedValues = [];
      } else {
        this.tempSelectedValues = this.filteredOptions.map((o) => o.value);
      }
    } else {
      if (this.tempSelectedValues.length !== this.options.length) {
        this.tempSelectedValues = this.options.map((o) => o.value);
      } else {
        this.tempSelectedValues = [];
      }
    }
    this.dispatchChangeEvent();
  }

  handleHeaderClick(e: MouseEvent) {
    e.stopPropagation();
    if (!this.disabled) {
      this.open = !this.open;
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    const key = e.key;
    if (key === "Escape") {
      this.open = false;
      this.highlightedOption = "";
    }
    if (key === "Enter") {
      if (!this.disabled) {
        if (!this.highlightedOption) {
          this.open = !this.open;
          if (this.open) {
            this.highlightedOption = "";
          }
        } else {
          const optionContainer: HTMLDivElement = this.shadowRoot?.querySelector(`[data-value="${this.highlightedOption}"]`) as HTMLDivElement;
          optionContainer?.click();
        }
      }
    }
    if (this.open) {
      if (key === "ArrowDown") {
        if (this.highlightedOption) {
          const index = this.filteredOptions.findIndex((o) => o.value === this.highlightedOption);
          if (index < this.filteredOptions.length - 1) {
            this.highlightedOption = this.filteredOptions[index + 1].value;
          }
          if (index === this.filteredOptions.length - 1) {
            this.highlightedOption = "";
          }
        } else {
          if (this.multiple) {
            this.highlightedOption = "select-all";
          } else {
            this.highlightedOption = this.filteredOptions[0].value;
          }
        }
      }
      if (key === "ArrowUp") {
        if (this.highlightedOption) {
          if (this.highlightedOption === "select-all") {
            this.highlightedOption = "";
            return;
          }
          const index = this.filteredOptions.findIndex((o) => o.value === this.highlightedOption);
          if (index > 0) {
            this.highlightedOption = this.filteredOptions[index - 1].value;
          } else {
            this.highlightedOption = "select-all";
          }
        } else {
          this.highlightedOption = this.filteredOptions[this.filteredOptions.length - 1].value;
        }
      }
    }
  }

  render() {
    const placeholder = this.placeholder || "Choose Item";
    let selectedOptions = this.options
      .filter((o) => this.selectedValues.includes(o.value))
      .map((o) => o.label)
      .join(", ");
    const allFilteredSelected = this.filteredOptions.map((o) => o.value).join(",") === this.selectedValues?.join(",") && this.options.length > 0;
    const hasValue = !!this.selectedValues.filter(Boolean).length;
    const headings = this.filteredOptions.filter((o) => o.dataset.heading === "true");
    const realOptions = this.filteredOptions.filter((o) => o.dataset.heading !== "true");
    const orderedOptions = this.multiple ? [...realOptions.filter((o) => this.selectedValues.includes(o.value)), ...realOptions.filter((o) => !this.selectedValues.includes(o.value))] : realOptions;
    return html`
      <clockify-dropdown
        ?stay-open-on-select=${this.stayOpenOnSelect || this.multiple}
        class=${classMap({
          "clockify-select": true,
          [this.size]: true,
          "multiple": this.multiple,
          "required": this.required && !hasValue,
          "sl-theme-dark": this.theme === "DARK",
        })}
        ?disabled=${this.disabled}
        @sl-show=${() => this.dispatchOpenEvent(true)}
        @sl-hide=${() => this.dispatchOpenEvent(false)}
        ?open=${this.open}
        title="${selectedOptions}">
        <clockify-button
          class=${classMap({
            "open": this.open,
            "borderless": this.borderless,
            "disabled": this.disabled,
            "sl-theme-dark": this.theme === "DARK",
          })}
          tabindex="0"
          @keyup="${this.handleKeyUp}"
          @click="${this.handleHeaderClick}"
          slot="trigger"
          size=${this.size}
          theme=${this.theme}
          title="${this.title || selectedOptions}">
          <div class="title">${hasValue ? selectedOptions : placeholder}</div>
        </clockify-button>
        <clockify-menu theme=${this.theme} part="overlay">
          ${(this.multiple && this.showFilterInput === null) || this.showFilterInput
            ? html`<clockify-menu-item class="search-box" disabled>
              <clockify-input
                type="text"
                name="filter"
                placeholder=${this.filterInputPlaceholder}
                theme=${this.theme}
                @sl-input=${(e: InputEvent) => {
                  e.stopPropagation();
                  this.handleFilterChange(e);
                }}
                @keydown=${(e: any) => e.stopPropagation()}
                @sl-clear=${() => {
                  this.dispatchEvent(
                    new CustomEvent("filter-change", {
                      detail: { filter: "" },
                      bubbles: true,
                      composed: true,
                    })
                  );
                  this.updateOptions();
                }}
                clearable
                autofocus
              >
                <svg class="search" width="20" height="20" slot="prefix" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M19.975 19.275L14.675 13.975C17.575 10.675 17.475 5.575 14.375 2.475C11.075 -0.825 5.775 -0.825 2.475 2.475C-0.825 5.775 -0.825 11.075 2.475 14.375C5.675 17.575 10.675 17.675 13.975 14.675L19.275 19.975L19.975 19.275ZM3.175 13.575C0.275 10.675 0.275 5.975 3.175 3.075C6.075 0.175 10.775 0.175 13.675 3.075C16.575 5.975 16.575 10.675 13.675 13.575C10.775 16.475 6.075 16.475 3.175 13.575Z" fill="#90A4AE"/>
                </svg>
                ${
                  this.filterString
                    ? html`<svg class="close" slot="clear-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 0.7L11.3 0L6 5.3L0.7 0L0 0.7L5.3 6L0 11.3L0.7 12L6 6.7L11.3 12L12 11.3L6.7 6L12 0.7Z" fill="#999999" />
                      </svg>`
                    : nothing
                }
              </clockify-input>
            </clockify-menu-item>
          </div>`
            : nothing}
          <slot></slot>

          ${this.multiple && this.showSelectAll
            ? html`<clockify-menu-item
                class=${classMap({
                  "option-container": true,
                  "select-all": true,
                  "highlighted": this.highlightedOption === "select-all",
                })}
                theme=${this.theme}
                data-value="select-all"
                @click=${this.handleSelectAll}>
                <clockify-checkbox
                  @keyup="${(e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                      this.handleSelectAll();
                    }
                  }}"
                  @sl-change=${this.handleSelectAll}
                  .checked=${(this.selectedValues.length === this.options.length || allFilteredSelected) && this.options.length > 0}
                  >${this.filteredOptions.length === this.options.length ? "Select all" : "Select filtered"}
                </clockify-checkbox>
              </clockify-menu-item>`
            : nothing}
          ${headings.map((option) => html`<clockify-menu-label class=${classMap({ single: !this.multiple })}>${this.getOptionContent(option)}</clockify-menu-label>`)}
          <div class="list">
            ${orderedOptions.map((option) => {
              return html`
                <clockify-menu-item data-value=${option.value} ?disabled=${option.disabled} @click=${this.handleSelectOption} class=${classMap({ single: !this.multiple })} style=${option.style} theme=${this.theme}>
                  ${this.multiple
                    ? html`<clockify-checkbox @keyup=${this.handleCheckboxChange} data-value=${option.value} .value=${option.textContent} @sl-change=${this.handleSelectOption} .checked=${this.tempSelectedValues.includes(option.value)}
                        >${this.getOptionContent(option)}</clockify-checkbox
                      >`
                    : this.radio
                      ? html`<clockify-radio .checked=${option.value !== undefined ? this.tempSelectedValues.includes(option.value) : this.tempSelectedValues.length === 0}>${this.getOptionContent(option)}</clockify-radio>`
                      : html`${this.getOptionContent(option)}`}
                </clockify-menu-item>
              `;
            })}
          </div>
        </clockify-menu>
      </clockify-dropdown>
    `;
  }
}

customElements.define("clockify-select", ClockifySelect);
export { ClockifySelect };
