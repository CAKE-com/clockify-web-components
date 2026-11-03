import SlDrawer from "@shoelace-style/shoelace/dist/components/drawer/drawer.component";

import { toggleTheme } from "../utils";

class ClockifyDrawer extends SlDrawer {
  constructor() {
    super();
  }

  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlDrawer.styles];
}

customElements.define("clockify-drawer", ClockifyDrawer);
export { ClockifyDrawer };
