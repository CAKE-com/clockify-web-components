import { LitElement, html, unsafeCSS, PropertyValues, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { toggleTheme } from "../utils";
import descriptionStyles from "../styles/special/clockify-description.css?inline";
import TimeEntryService from "../services/time-entry-service";
import ApiService from "../services/api-service";
import EndpointService from "../services/endpoint-service";
import { WorkspaceRole } from "../services/user-service";
import type { TimeEntry } from "../services/time-entry-service";
import { Tag } from "../services/tag-service";
import EventBus from "../services/event-bus";
import { DEFAULT_LOCALES } from "../utils/constants";

import { queryClient } from '../query/client';
import { QueryController } from "../query/controllers/query-controller";
import { useUser, useWorkspace, useRoles, useLocalization } from "../query/hooks/app-hooks";
import { ClockifyWebComponentsApp } from "../clockify-app";

class ClockifyDescription extends LitElement {
  @property({ type: Boolean }) loading = true;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) addon = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) switch = false;
  @property({ type: String }) label = "";
  @property({ type: String }) description = "";
  @property({ type: String }) placeholder = "";
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

  // @ts-ignore
  @state() private debounceTimeout: Timeout | undefined = undefined;
  @state() private dropdownOpen = false;
  @state() private value = "";
  @state() private selectedTimeEntry = {};
  @state() private debouncedSearchString = "";
  
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
  
  private getTimeEntriesQueryOptions() {
    return {
      queryKey: ['timeEntries', this.activeWorkspaceId, this.debouncedSearchString, this.endpoint],
      queryFn: async () => {
        const ep = this.endpoint || await EndpointService.getEndpoint();
        if (this.debouncedSearchString) {
          return ApiService.get({
            endpoint: `${ep}/workspaces/${this.activeWorkspaceId}/timeEntries?searchValue=${encodeURI(this.debouncedSearchString)}`,
            token: this.token
          });
        } else {
          return ApiService.get({
            endpoint: `${ep}/workspaces/${this.activeWorkspaceId}/timeEntries/recent?limit=8`,
            token: this.token
          });
        }
      },
      enabled: !!this.activeWorkspaceId && !!this.endpoint
    };
  }

  private timeEntriesQuery = new QueryController(this, queryClient, () => this.getTimeEntriesQueryOptions());

  static styles = [unsafeCSS(descriptionStyles)];

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

  get timeEntries() {
    return this.timeEntriesQuery.data || [];
  }

  get canChangeDescription() {
    const roleList = this.userRoles?.map((roleData: { role: any }) => roleData.role) || [];
    return (
      (!this.workspaceSettings.onlyAdminsCanChangeDescriptionStatus ||
        roleList.includes(WorkspaceRole.WORKSPACE_OWN) ||
        (roleList.includes(WorkspaceRole.WORKSPACE_ADMIN) && this.workspaceSettings.onlyAdminsCanChangeDescriptionStatus)) &&
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
    document.addEventListener("click", this.clickOutside.bind(this));
    toggleTheme(this, this.shadowRoot?.querySelector(".clockify-description"));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    EventBus.removeEventListener("error", this._boundHandleGlobalError);
    EventBus.removeEventListener("success", this._boundHandleGlobalSuccess);
    EventBus.removeEventListener("clockify-app-init", this._boundHandleAppInit);
  }

  async updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has("timeentryid") && this.timeentryid) {
      const timeEntry = await queryClient.fetchQuery({
        queryKey: ['timeEntry', this.timeentryid, this.workspaceId, this.endpoint],
        queryFn: () => TimeEntryService.getTimeEntry(this.timeentryid, this.workspaceId, this.endpoint, this.token),
        staleTime: Infinity
      });
      this.value = timeEntry.description;
    }

    if (_changedProperties.has("description")) {
      this.value = this.description;
    }

    if (_changedProperties.has("value")) {
      if (!this.value) {
        await queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      }
    }
  }





  clickOutside(e: Event) {
    if (!e.composedPath().includes(this) && this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  dispatchChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { description: this.description },
        bubbles: true,
        composed: true,
      }),
    );
  }

  dispatchSelectEvent() {
    this.dispatchEvent(
      new CustomEvent("select", {
        detail: { timeEntry: this.selectedTimeEntry },
        bubbles: true,
        composed: true,
      }),
    );
  }

  debounceSearchTimeEntries() {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.debouncedSearchString = this.value;
      this.dropdownOpen = true;
    }, 350);
  }

  async onInputChange(e: InputEvent) {
    // @ts-ignore
    this.value = e.target?.value ?? "";
    this.debounceSearchTimeEntries();
  }

  handleSelect(e: Event, timeEntry: TimeEntry) {
    e.stopPropagation();
    this.value = timeEntry?.description;
    this.selectedTimeEntry = timeEntry;
    this.dispatchSelectEvent();
    this.dropdownOpen = false;
  }

  render() {
    return html`<div class="clockify-description">
      <clockify-input
        slot="trigger"
        placeholder=${this.placeholder || this.localization.TRACK_PLACEHOLDER}
        @sl-change=${this.dispatchChangeEvent}
        @sl-focus=${() => (this.dropdownOpen = true)}
        @input=${this.onInputChange}
        .value=${this.value}
        required=${this.workspaceSettings.forceDescription}
        autocomplete="off"
        part="input"
        ?disabled="${!this.canChangeDescription}"
      ></clockify-input>
      ${this.timeEntries.length
        ? html`<ul
            part="suggestions"
            class=${classMap({
              dropdown: true,
              visible: this.dropdownOpen,
            })}
          >
            ${this.timeEntries.map((timeEntry: any) => {
              let projectTaskArray = [];
              if (timeEntry.projectName) {
                projectTaskArray.push(timeEntry.projectName);
              }
              if (timeEntry.taskName) {
                projectTaskArray.push(timeEntry.taskName);
              }
              return html`<li
                part="suggestion"
                @click=${(e: Event) => this.handleSelect(e, timeEntry)}
              >
                <span class="description">${timeEntry?.description}</span>
                <span
                  class="project-task"
                  style=${`color: ${timeEntry.projectColor}`}
                >
                  ${projectTaskArray.length
                    ? html`<span class="dot">·</span>`
                    : nothing}
                  <span class="name">${projectTaskArray.join(" - ")}</span>
                </span>
                <span class="tags">
                  <clockify-tag variant="primary" size="small"
                    >${timeEntry.tags
                      ?.map(({ name }: Tag) => name)
                      .join(", ")}</clockify-tag
                  >
                </span>
              </li>`;
            })}
          </ul>`
        : nothing}
    </div>`;
  }
}

customElements.define("clockify-description", ClockifyDescription);
export { ClockifyDescription };
