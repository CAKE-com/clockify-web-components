import SlTag from "@shoelace-style/shoelace/dist/components/tag/tag.component";
import { unsafeCSS } from "lit";

import { toggleTheme } from "../utils";
import clockifyTagStyles from "../styles/generic/clockify-tag.css?inline";

class ClockifyTag extends SlTag {
  firstUpdated() {
    toggleTheme(this);
  }

  updated() {
    toggleTheme(this);
  }

  static styles = [SlTag.styles, unsafeCSS(clockifyTagStyles)];

  constructor() {
    super();
  }
}

customElements.define("clockify-tag", ClockifyTag);
export { ClockifyTag };
