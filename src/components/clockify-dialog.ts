import SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.component';
import { unsafeCSS, PropertyValueMap } from 'lit';
import { setDefaultAnimation } from '@shoelace-style/shoelace/dist/utilities/animation-registry.js';

import { toggleTheme } from '../utils';
import clockifyDialogStyles from '../styles/generic/clockify-dialog.css?inline';

setDefaultAnimation('dialog.show', {
  keyframes: [
    { transform: 'translateY(-20px)', opacity: '0' },
    { transform: 'translateY(0px)', opacity: '1' }
  ],
  options: {
    duration: 200
  }
});

setDefaultAnimation('dialog.hide', {
  keyframes: [
    { transform: 'translateY(0px)', opacity: '1' },
    { transform: 'translateY(-20px)', opacity: '0' }
  ],
  options: {
    duration: 200
  }
});

class ClockifyDialog extends SlDialog {
  firstUpdated() {
    super.firstUpdated();
    toggleTheme(this);
  }

  updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    super.updated(changedProperties);
    toggleTheme(this);
  }

  static styles = [SlDialog.styles, unsafeCSS(clockifyDialogStyles)];
}

customElements.define('clockify-dialog', ClockifyDialog);
export { ClockifyDialog };
