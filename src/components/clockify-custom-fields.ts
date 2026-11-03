import "@shoelace-style/shoelace/dist/themes/light.css";
import "@shoelace-style/shoelace/dist/themes/dark.css";
import { html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, state, queryAsync } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";

import { queryClient } from '../query/client';
import { MutationController } from "../query/controllers/mutation-controller";
import { ProjectDefaultValue } from "../services/custom-fields-service";
import { toggleTheme, t } from "../utils";
import { WorkspaceRole } from "../services/user-service";
import TimeEntryService, { EmitType } from "../services/time-entry-service";
import customFieldsStyles from "../styles/special/clockify-custom-fields.css?inline";
import NotificationService from "../services/notification-service";
import EventBus from "../services/event-bus";
import { DEFAULT_LOCALES } from "../utils/constants";
import {
  useUser,
  useWorkspace,
  useRoles,
  useLocalization,
  useCustomFields
} from "../query/hooks/app-hooks";
import { ClockifyWebComponentsApp } from "../clockify-app";

import "./clockify-input";
import "./clockify-switch";
import "./clockify-select";

enum FieldType {
  TXT = "TXT",
  NUMBER = "NUMBER",
  LINK = "LINK",
  DROPDOWN_SINGLE = "DROPDOWN_SINGLE",
  DROPDOWN_MULTIPLE = "DROPDOWN_MULTIPLE",
  CHECKBOX = "CHECKBOX",
}

interface CustomField {
  allowedValues: string[];
  description: string | null;
  entityType: "USER" | "TIMEENTRY";
  id: string;
  name: string;
  onlyAdminCanEdit: boolean;
  placeholder: string | null;
  projectDefaultValues: ProjectDefaultValue[];
  required: boolean;
  type: FieldType;
  value: string | null;
  tempValue?: string;
  status: "VISIBLE" | "HIDDEN";
  workspaceDefaultValue: string | boolean | null;
  workspaceId: string;
}

interface CustomFieldValue {
  id?: string;
  customFieldId?: string;
  timeEntryId?: string;
  value: string;
  sourceType?: string;
  name: string;
  type: FieldType;
  customFieldDto: CustomField;
}

class ClockifyCustomFields extends LitElement {
  @property({ type: Boolean }) loading = true;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) addon = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String }) timeentryid = "";
  @property({ type: String }) token = "";
  @property({ type: String }) tokenkey = "";
  @property({ type: String }) tokensearchparam = "";
  @property({ type: String }) tokenheader = "";
  @property({ type: String }) homeurl = "";
  @property({ type: String }) homeurlkey = "";
  @property({ type: String }) endpoint = "";
  @property({ type: String }) syncPickedData: EmitType = EmitType.EMIT_EVENT_ONLY;
  @property({ type: Number }) columns: number | undefined;
  @property({ type: String }) alignment = "left";
  @property({ type: String }) projectId = "";
  @property({ type: String }) workspaceId: string = "";
  @property({ type: Array }) customFieldValues: CustomFieldValue[] = [];
  @property({
    type: Boolean,
    converter: {
      fromAttribute: (value) => value !== "false",
      toAttribute: (value) => (value ? "" : "false"),
    },
  })
  borderlessSelect: boolean = false;

  @state() private tempValues: Record<string, any> = {};
  @state() private editingCustomFieldId: string | null = null;

  private readonly _boundHandleAppInit: any;
  private readonly _boundHandleGlobalError: any;
  private readonly _boundHandleGlobalSuccess: any;

  constructor() {
    super();
    this._boundHandleAppInit = this.handleAppInit.bind(this);
    this._boundHandleGlobalError = this.handleGlobalError.bind(this);
    this._boundHandleGlobalSuccess = this.handleGlobalSuccess.bind(this);
  }

  private userQuery = useUser(this, () => ({ token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!this.endpoint }));
  private workspaceQuery = useWorkspace(this, () => ({ workspaceId: this.workspaceId || this.userQuery.data?.activeWorkspace, token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!(this.workspaceId || this.userQuery.data?.activeWorkspace) && !!this.endpoint }));
  private rolesQuery = useRoles(this, () => ({ workspaceId: this.activeWorkspaceId, userId: this.userQuery.data?.id, token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!this.activeWorkspaceId && !!this.userQuery.data?.id }));
  private localizationQuery = useLocalization(this, () => this.endpoint, () => ({ enabled: !!this.endpoint }));
  private customFieldsQuery = useCustomFields(this, () => ({ workspaceId: this.activeWorkspaceId, token: this.token, endpoint: this.endpoint, isEnabled: this.features?.includes("CUSTOM_FIELDS") }), () => ({ enabled: !!this.activeWorkspaceId && !!this.endpoint && this.features?.includes("CUSTOM_FIELDS") }));

  private updateCustomFieldMutation = new MutationController(this, queryClient, {
    mutationFn: ({ customFieldId, value }: { customFieldId: string, value: any }) => 
      TimeEntryService.updateCustomField(this.timeentryid, JSON.stringify({ customFieldId, value })),
    onSuccess: (data: any, variables: any) => {
      if (data?.id) this.dispatchChangeEvent({ id: variables.customFieldId, value: variables.value });
    }
  });

  @queryAsync("clockify-switch") slSwitch: any;

  static styles = [unsafeCSS(customFieldsStyles)];

  get workspaceSettings() {
    return this.workspaceQuery.data?.workspaceSettings || {};
  }

  get userRoles() {
    return this.rolesQuery.data || [];
  }

  get activeWorkspaceId() {
    return this.workspaceId || this.userQuery.data?.activeWorkspace;
  }

  get localization() {
    return this.localizationQuery.data || DEFAULT_LOCALES;
  }

  get features() {
    return this.workspaceQuery.data?.features || [];
  }

  get isAdmin() {
    const roleList = this.userRoles?.map((roleData: { role: any }) => roleData.role) || [];
    return roleList.includes(WorkspaceRole.WORKSPACE_OWN) || roleList.includes(WorkspaceRole.WORKSPACE_ADMIN);
  }

  handleGlobalError(event: any) {
    this.dispatchEvent(
      new CustomEvent("error", {
        detail: { error: event.detail },
        bubbles: true,
        composed: true,
      })
    );
  }

  handleGlobalSuccess(event: any) {
    this.dispatchEvent(
      new CustomEvent("success", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  async handleAppInit(event: any) {
    const config = event.detail;
    if (config.token) this.token = config.token;
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.workspaceId) this.workspaceId = config.workspaceId;
    if (config.homeUrl) this.homeurl = config.homeUrl;
    if (config.addon !== undefined) this.addon = config.addon;

    await this.updateComplete;
  }

  async connectedCallback() {
    super.connectedCallback();
    EventBus.addEventListener("error", this._boundHandleGlobalError);
    EventBus.addEventListener("success", this._boundHandleGlobalSuccess);
    EventBus.addEventListener("clockify-app-init", this._boundHandleAppInit);
    if (ClockifyWebComponentsApp.isInitialized) {
      await this.handleAppInit({ detail: ClockifyWebComponentsApp.initializationData });
    } else if (this.token) {
      await ClockifyWebComponentsApp.init({
        token: this.token,
        workspaceId: this.workspaceId,
        endpoint: this.endpoint,
        homeUrl: this.homeurl,
        addon: this.addon
      });
    }
    toggleTheme(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    EventBus.removeEventListener("error", this._boundHandleGlobalError);
    EventBus.removeEventListener("success", this._boundHandleGlobalSuccess);
    EventBus.removeEventListener("clockify-app-init", this._boundHandleAppInit);
  }

  async updated(_changedProperties: PropertyValues) {
    const switchElement = await this.slSwitch;
    if (switchElement && switchElement.shadowRoot?.querySelector(".form-control")?.style?.width) {
      switchElement.shadowRoot.querySelector(".form-control").style.width = "100%";
    }
  }

  get allCustomFields(): CustomField[] {
    if (!this.features?.includes("CUSTOM_FIELDS") || !this.customFieldsQuery.data) return [];
    return this.customFieldsQuery.data.map((cf: any) => {
      const value = this.tempValues[cf.id] ??
        this.customFieldValues?.find((c) => (c.id || c.customFieldId) === cf.id)?.value ??
        cf.value ??
        cf.projectDefaultValues?.find((p: any) => p.projectId === this.projectId)?.value ??
        cf.workspaceDefaultValue;
      return {
        ...cf,
        value,
        tempValue: value
      };
    });
  }

  getOriginalValue(id: string) {
    const cf = this.customFieldsQuery.data?.find((c: any) => c.id === id);
    if (!cf) return undefined;
    return this.customFieldValues?.find((c) => (c.id || c.customFieldId) === id)?.value ??
      cf.value ??
      cf.projectDefaultValues?.find((p: any) => p.projectId === this.projectId)?.value ??
      cf.workspaceDefaultValue;
  }

  get visibleCustomFields(): CustomField[] {
    return this.allCustomFields.filter((customField: CustomField) => {
      return (
        (customField.status === "VISIBLE" && !customField.projectDefaultValues?.find((projectDefaultValue) => projectDefaultValue.projectId === this.projectId)) ||
        customField.projectDefaultValues?.some((projectDefaultValue: ProjectDefaultValue) => {
          return projectDefaultValue.projectId === this.projectId && projectDefaultValue.status === "VISIBLE";
        })
      );
    });
  }

  async handleCustomFieldsPicked(id: string, value: string | string[] | boolean) {
    switch (this.syncPickedData) {
      case EmitType.EMIT_EVENT_ONLY:
        this.dispatchChangeEvent({ id, value });
        break;
      case EmitType.SYNC_ON_CHANGE:
        await this.sendPickedData(id, value);
        break;
      default:
        this.dispatchChangeEvent({ id, value });
        break;
    }
  }

  dispatchChangeEvent(changed: any) {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { changed, all: this.visibleCustomFields.map(({ tempValue, ...rest }: CustomField) => rest) },
        bubbles: true,
        composed: false,
      })
    );
  }

  async sendPickedData(customFieldId: string, value: string | string[] | boolean) {
    if (this.timeentryid) {
      await this.updateCustomFieldMutation.mutate({ customFieldId, value });
    }
  }

  async updateCustomFields(id: string, value: any) {
    this.tempValues = { ...this.tempValues, [id]: value };
    await this.handleCustomFieldsPicked(id, value);
  }

  updateCustomFieldsTemp(id: string, value: string) {
    this.tempValues = { ...this.tempValues, [id]: value };
  }

  isValidURL(url: string) {
    const pattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
    return pattern.test(url);
  }

  areArraysEqual(array1: Array<string>, array2: Array<string>): boolean {
    if (!array1 || !array2) return array1 === array2;
    return array1.length === array2.length && array1.every((val) => array2.includes(val));
  }

  async onSelectChange(e: any, id: string) {
    const selectedValues = e.detail.selected;
    const customField = this.allCustomFields.find((customField: CustomField) => customField.id === id);
    if (!customField) return;
    const isAllowed = (customField.required && e.detail.selected?.length) || !customField.required;
    const currentValue = Array.isArray(customField.value) ? customField.value : (customField.value ? [customField.value] : []);
    const anythingChanged = Array.isArray(selectedValues) ? !this.areArraysEqual(selectedValues, currentValue as string[]) : selectedValues !== customField.value;
    if (isAllowed && anythingChanged) {
      await this.updateCustomFields(id, e.detail.selected);
    }
  }

  async onSwitchChange(e: any, id: string) {
    const customField = this.allCustomFields.find((customField: CustomField) => customField.id === id);
    if (!customField) return;
    const isAllowed = (customField.required && e.target.value) || !customField.required;
    if (isAllowed && e.target.checked !== customField.value) {
      await this.updateCustomFields(id, e.target.checked);
    }
  }

  async onInputBlur(e: any, id: string) {
    const customField = this.allCustomFields.find((customField: CustomField) => customField.id === id);
    if (!customField) return;
    const value = e.target.value ?? "";
    const isAllowed = (customField.required && value) || !customField.required;
    const originalValue = this.getOriginalValue(id);
    if (isAllowed && value !== originalValue) {
      await this.updateCustomFields(id, value);
    }
  }

  onInputChange = (e: any, id: string) => {
    const value = e.target.value ?? "";
    this.updateCustomFieldsTemp(id, String(value));
    if (this.editingCustomFieldId !== id) {
      this.editingCustomFieldId = id;
    }
  };

  onNumberKeydown = (e: any) => {
    const value = e.target.value ?? "";
    if (["e", "E", "-", "+"].includes(e.key) || (value.length >= 24 && e.key !== "Backspace")) {
      e.preventDefault();
    }
  };

  onLinkBlur = async (e: any, id: string) => {
    let value = e.target.value ?? "";
    this.updateCustomFieldsTemp(id, value);
    const customField = this.allCustomFields.find((customField: CustomField) => customField.id === id);
    if (!customField) return;

    if (value && !value.toLowerCase().match(/^https?:\/\//)) {
      value = `https://${value}`;
    }

    const isAllowed = (customField.required && value) || !customField.required;
    const isUrlValid = this.isValidURL(value);

    if (value && !isUrlValid) {
      NotificationService.error("Website format is not valid");
      const originalValue = this.getOriginalValue(id);
      this.updateCustomFieldsTemp(id, originalValue || "");
      if (e.target) e.target.value = originalValue || "";
    } else {
      const originalValue = this.getOriginalValue(id);
      if (isAllowed && originalValue !== value) {
        await this.updateCustomFields(id, value);
      }
    }
    if (this.editingCustomFieldId === id) {
      this.editingCustomFieldId = null;
    }
  };

  render() {
    return html`<div class="clockify-custom-fields" style=${ifDefined(this.columns ? `grid-template-columns: repeat(${this.columns}, minmax(100px, 1fr))` : undefined)}>
      ${repeat(this.visibleCustomFields, (customField) => customField.id, (customField: CustomField) => {
        if (customField.type === FieldType.DROPDOWN_SINGLE) {
          const value = customField.value || "";
          return html`<clockify-select
            size="small"
            @change=${(e: any) => this.onSelectChange(e, customField.id)}
            placeholder=${customField.placeholder || ""}
            .selectedValues=${value ? [value] : []}
            ?required=${customField.required}
            ?disabled=${customField.onlyAdminCanEdit && !this.isAdmin}
            ?borderless="${this.borderlessSelect}"
            stayOpenOnSelect
            showFilterInput
            radio>
            <option data-heading="true">${t(this.localization.SELECT_LABEL, { label: customField.name })}</option>
            <option value="">None</option>
            ${customField.allowedValues.map((value: string) => {
              return html`<option value=${value}>${value}</option>`;
            })}
          </clockify-select>`;
        }
        if (customField.type === FieldType.DROPDOWN_MULTIPLE) {
          const value = Array.isArray(customField.value) ? (customField.value as unknown as string[]) : customField.value ? [customField.value] : [];
          return html`<clockify-select
            size="small"
            @change=${(e: any) => this.onSelectChange(e, customField.id)}
            placeholder=${customField.placeholder || ""}
            .selectedValues=${value}
            ?required="${customField.required}"
            ?disabled=${customField.onlyAdminCanEdit && !this.isAdmin}
            multiple
            ?borderless="${this.borderlessSelect}">
            <option data-heading="true">${t(this.localization.SELECT_LABEL, { label: customField.name })}</option>
            ${customField.allowedValues.map((value: string) => {
              return html`<option value=${value}>${value}</option>`;
            })}
          </clockify-select>`;
        }
        if (customField.type === FieldType.CHECKBOX) {
          const value = !!(customField.value || false);
          return html`<clockify-switch
            size="small"
            @sl-change=${(e: any) => this.onSwitchChange(e, customField.id)}
            title="${customField.name}"
            ?checked=${value}
            ?required="${customField.required}"
            ?disabled=${customField.onlyAdminCanEdit && !this.isAdmin}
            >${customField.name}</clockify-switch
          >`;
        }
        if (customField.type === FieldType.TXT) {
          const value = customField.value || "";
          return html`<div class="input">
            <clockify-input
              size="small"
              type="text"
              name=${customField.name}
              title="${value}"
              placeholder="${customField.placeholder || ""}"
              @sl-blur=${(e: any) => this.onInputBlur(e, customField.id)}
              @sl-input="${(e: any) => this.onInputChange(e, customField.id)}"
              .value=${value}
              ?required="${customField.required}"
              ?disabled=${customField.onlyAdminCanEdit && !this.isAdmin}>
            </clockify-input>
          </div>`;
        }
        if (customField.type === FieldType.NUMBER) {
          return html`<clockify-input
            size="small"
            type="number"
            name=${customField.name}
            placeholder=${customField.placeholder || ""}
            title=${ifDefined(customField.value ?? undefined)}
            @keydown=${this.onNumberKeydown}
            @sl-blur=${(e: any) => this.onInputBlur(e, customField.id)}
            @sl-input="${(e: any) => this.onInputChange(e, customField.id)}"
            ?required="${customField.required}"
            ?disabled=${customField.onlyAdminCanEdit && !this.isAdmin}
            .value=${customField.value ?? ""}></clockify-input>`;
        }
        if (customField.type === FieldType.LINK) {
          const value = customField.value || "";
          const disabled = customField.onlyAdminCanEdit && !this.isAdmin;
          const isEditing = this.editingCustomFieldId === customField.id;
          if ((!isEditing || disabled) && value) {
            return html`<div class="${classMap({ link: true, disabled })}" title="${value}">
              <a href=${value} target="_blank">${value}</a>
              <svg
                @click="${() => {
                  this.editingCustomFieldId = customField.id;
                  setTimeout(() => {
                    // setTimeout with a 0 value, just to wait for editingCustomFieldId to take effect
                    const input = this.shadowRoot?.querySelector(`clockify-input[data-id="${customField.id}"]`) as any;
                    input?.focus();
                  });
                }}"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M2.99998 16.7L6.39998 16.1L15.6 6.9C16 6.5 16.2 6 16.2 5.5C16.2 4.4 15.3 3.5 14.2 3.5C13.6 3.5 13.2 3.7 12.8 4.1L3.59998 13.3L2.99998 16.7ZM13.5 4.8C13.7 4.6 13.9 4.5 14.2 4.5C14.8 4.5 15.2 4.9 15.2 5.5C15.2 5.8 15.1 6 14.9 6.2L14.2 6.9L12.8 5.5L13.5 4.8ZM12.2 6.1L13.6 7.5L7.09998 14V13.2V12.5H6.39998H5.69998L12.2 6.1ZM4.6216 13.5015H6.09608V15.0509L4.29671 15.4008L4.6216 13.5015Z"
                  fill="#90A4AE" />
              </svg>
            </div>`;
          }
          return html`<clockify-input
            data-id="${customField.id}"
            size="small"
            type="url"
            name=${customField.name}
            title="${value}"
            placeholder=${customField.placeholder || ""}
            @sl-focus="${() => this.editingCustomFieldId = customField.id}"
            @sl-blur=${(e: any) => this.onLinkBlur(e, customField.id)}
            @sl-input="${(e: any) => this.onInputChange(e, customField.id)}"
            ?required="${customField.required}"
            ?disabled=${customField.onlyAdminCanEdit && !this.isAdmin}
            .value=${value}></clockify-input>`;
        }
      })}
    </div>`;
  }
}

customElements.define("clockify-custom-fields", ClockifyCustomFields);
export { ClockifyCustomFields };
