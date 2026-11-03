import SlRadio from "@shoelace-style/shoelace/dist/components/radio/radio.component";
import { unsafeCSS } from "lit";

import { toggleTheme } from "../utils";
import clockifyRadioStyles from "../styles/generic/clockify-radio.css?inline";

class ClockifyRadio extends SlRadio {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlRadio.styles, unsafeCSS(clockifyRadioStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-radio", ClockifyRadio);
export { ClockifyRadio };
