import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.component";

import { toggleTheme } from "../utils";

class ClockifyDropdown extends SlDropdown {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlDropdown.styles];

  constructor() {
    super();
  }
}

customElements.define("clockify-dropdown", ClockifyDropdown);
export { ClockifyDropdown };
