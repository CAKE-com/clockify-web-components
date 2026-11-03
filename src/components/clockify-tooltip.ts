import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component";

import { toggleTheme } from "../utils";

class ClockifyTooltip extends SlTooltip {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlTooltip.styles];

  constructor() {
    super();
  }
}

customElements.define("clockify-tooltip", ClockifyTooltip);
export { ClockifyTooltip };
