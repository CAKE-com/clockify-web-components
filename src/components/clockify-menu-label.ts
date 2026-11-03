import SlMenuLabel from "@shoelace-style/shoelace/dist/components/menu-label/menu-label.component";

import { toggleTheme } from "../utils";

class ClockifyMenuLabel extends SlMenuLabel {
  firstUpdated() {
    toggleTheme(this);
  }
  updated() {
    toggleTheme(this);
  }

  static styles = [SlMenuLabel.styles];

  constructor() {
    super();
  }
}

customElements.define("clockify-menu-label", ClockifyMenuLabel);
export { ClockifyMenuLabel };
