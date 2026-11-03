import SlSwitch from "@shoelace-style/shoelace/dist/components/switch/switch.component";
import { unsafeCSS } from "lit";

import { toggleTheme } from "../utils";
import clockifySwitchStyles from "../styles/generic/clockify-switch.css?inline";

class ClockifySwitch extends SlSwitch {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlSwitch.styles, unsafeCSS(clockifySwitchStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-switch", ClockifySwitch);
export { ClockifySwitch };
