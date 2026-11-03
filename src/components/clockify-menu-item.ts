import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component";

import { toggleTheme } from "../utils";

class ClockifyMenuItem extends SlMenuItem {
  firstUpdated() {
    toggleTheme(this);
  }
  updated() {
    toggleTheme(this);
  }

  static styles = [SlMenuItem.styles];

  constructor() {
    super();
  }
}

customElements.define("clockify-menu-item", ClockifyMenuItem);
export { ClockifyMenuItem };
