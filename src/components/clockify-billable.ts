import { LitElement, html, unsafeCSS, nothing } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { toggleTheme } from "../utils";
import billableStyles from "../styles/special/clockify-billable.css?inline";
import TimeEntryService, { EmitType } from "../services/time-entry-service";
import { queryClient } from '../query/client';
import { MutationController } from "../query/controllers/mutation-controller";
import { useUser, useWorkspace, useRoles, useLocalization } from "../query/hooks/app-hooks";
import { WorkspaceRole } from "../services/user-service";
import EventBus from "../services/event-bus";
import { DEFAULT_LOCALES } from "../utils/constants";
import { ClockifyWebComponentsApp } from "../clockify-app";

import "./clockify-switch";
import "./clockify-tooltip";

class ClockifyBillable extends LitElement {
  @property({ type: Boolean }) loading = true;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) addon = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) billable = false;
  @property({ type: Boolean }) switch = false;
  @property({ type: String }) label = "";
  @property({ type: String }) workspaceId = "";
  @property({ type: String }) timeentryid = "";
  @property({ type: String }) token = "";
  @property({ type: String }) tokenkey = "";
  @property({ type: String }) tokensearchparam = "";
  @property({ type: String }) tokenheader = "";
  @property({ type: String }) homeurl = "";
  @property({ type: String }) homeurlkey = "";
  @property({ type: String }) endpoint = "";
  @property({ type: String }) syncPickedData = "EMIT_EVENT_ONLY";

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

  private updateBillableMutation = new MutationController(this, queryClient, {
    mutationFn: ({ billable }: { billable: boolean }) => 
      TimeEntryService.updateBillable(this.timeentryid, JSON.stringify({ billable })),
    onSuccess: (data) => {
      if (data?.id) this.dispatchChangeEvent();
    }
  });

  static styles = [unsafeCSS(billableStyles)];

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

  get canChangeBillable() {
    const roleList = this.userRoles?.map((roleData: { role: any }) => roleData.role) || [];
    return (
      (!this.workspaceSettings.onlyAdminsCanChangeBillableStatus ||
        roleList.includes(WorkspaceRole.WORKSPACE_OWN) ||
        (roleList.includes(WorkspaceRole.WORKSPACE_ADMIN) && this.workspaceSettings.onlyAdminsCanChangeBillableStatus)) &&
      !this.readonly
    );
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
    toggleTheme(this, this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    EventBus.removeEventListener("error", this._boundHandleGlobalError);
    EventBus.removeEventListener("success", this._boundHandleGlobalSuccess);
    EventBus.removeEventListener("clockify-app-init", this._boundHandleAppInit);
  }

  async handleBillableChange() {
    if (this.disabled) return;
    switch (this.syncPickedData) {
      case EmitType.EMIT_EVENT_ONLY:
        this.dispatchChangeEvent();
        break;
      case EmitType.SYNC_ON_CHANGE:
        if (this.timeentryid) await this.sendBillableValue();
        break;
      default:
        this.dispatchChangeEvent();
        break;
    }
  }

  async sendBillableValue() {
    if (this.timeentryid) {
      await this.updateBillableMutation.mutate({ billable: this.billable });
    }
  }

  dispatchChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { billable: this.billable },
        bubbles: true,
        composed: true,
      })
    );
  }

  async toggleBillable() {
    if (this.disabled) return;
    this.billable = !this.billable;
    if (this.timeentryid) {
      await this.handleBillableChange();
    } else {
      this.dispatchChangeEvent();
    }
  }

  render() {
    if (("activeBillableHours" in this.workspaceSettings && !this.workspaceSettings.activeBillableHours) || !this.canChangeBillable) {
      return nothing;
    }
    if (this.switch) {
      return html`<clockify-tooltip placement="bottom" content=${this.billable ? this.localization.BILLABLE_LABEL : this.localization.NON_BILLABLE_LABEL} distance="5">
        <clockify-switch size="small" @sl-change=${this.toggleBillable} ?checked=${this.billable} class="clockify-billable">
          <span part="label">${this.label}</span>
        </clockify-switch>
      </clockify-tooltip>`;
    }
    return html`<clockify-tooltip placement="bottom" content=${this.billable ? this.localization.BILLABLE_LABEL : this.localization.NON_BILLABLE_LABEL}
      ><button
        class=${classMap({
          "clockify-billable": true,
          "active": this.billable,
        })}
        @click=${this.toggleBillable}>
        $
      </button>
    </clockify-tooltip>`;
  }
}

customElements.define("clockify-billable", ClockifyBillable);
export { ClockifyBillable };
