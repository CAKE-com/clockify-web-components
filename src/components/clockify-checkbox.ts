import SlCheckbox from "@shoelace-style/shoelace/dist/components/checkbox/checkbox.component";
import { unsafeCSS } from "lit";
import { queryAsync } from "lit/decorators.js";

import { toggleTheme } from "../utils";
import clockifyCheckboxStyles from "../styles/generic/clockify-checkbox.css?inline";

class ClockifyCheckbox extends SlCheckbox {
  @queryAsync("sl-icon") slIcon: any;

  async firstUpdated() {
    toggleTheme(this);
    if (this.slIcon) {
      const icon = await this.slIcon;
      icon?.addEventListener('sl-load', () => {
        this.updateStrokeWidth();
      });
    }
  }

  async updated(_changedValues: any) {
    toggleTheme(this);
    await this.updateStrokeWidth();
    if(_changedValues.has("value")) {
      this.setAttribute("title", this.value);
    }
  }

  async updateStrokeWidth() {
    if(!this.checked) return;
    const icon = await this.slIcon;
    if (icon) {
      setTimeout(() => {
        const g = icon.shadowRoot?.querySelector("svg > g") as SVGGElement;
        if (g) {
          g.setAttribute("stroke-width", "3");
        }
      }, 0)
    }
  }

  static styles = [SlCheckbox.styles, unsafeCSS(clockifyCheckboxStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-checkbox", ClockifyCheckbox);
export { ClockifyCheckbox };
