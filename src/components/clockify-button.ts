import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component";
import { unsafeCSS } from "lit";

import { toggleTheme } from "../utils";
import clockifyButtonStyles from "../styles/generic/clockify-button.css?inline";

class ClockifyButton extends SlButton {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlButton.styles, unsafeCSS(clockifyButtonStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-button", ClockifyButton);
export { ClockifyButton };
