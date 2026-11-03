import SlInput from "@shoelace-style/shoelace/dist/components/input/input.component";
import { unsafeCSS } from "lit";
import { state } from "lit/decorators.js";

import { toggleTheme } from "../utils";
import clockifyInputStyles from "../styles/generic/clockify-input.css?inline";

class ClockifyInput extends SlInput {
  @state() tempLabel?: string;

  firstUpdated() {
    this.tempLabel = this.label;
    toggleTheme(this as unknown as HTMLElement);
  }

  updated(_changedProperties: any) {
    if(this.required && !this.value) {
      this.label = this.placeholder;
    } else {
      this.label = this.tempLabel || "";
    }
    toggleTheme(this as unknown as HTMLElement);
  }

  static styles = [SlInput.styles, unsafeCSS(clockifyInputStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-input", ClockifyInput as unknown as CustomElementConstructor);
export { ClockifyInput };
