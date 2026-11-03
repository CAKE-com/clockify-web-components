import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component";
import {unsafeCSS} from "lit";

import clockifyMenuStyles from "../styles/generic/clockify-menu.css?inline";
import { toggleTheme } from "../utils";

class ClockifyMenu extends SlMenu {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlMenu.styles, unsafeCSS(clockifyMenuStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-menu", ClockifyMenu);
export { ClockifyMenu };
