import { classMap } from "lit/directives/class-map.js";
import { LitElement, html, unsafeCSS, nothing, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";
import hotkeys from "hotkeys-js";

import { queryClient } from '../query/client';
import { toggleTheme, uniqueBy, t, getEntityLabel } from "../utils";
import clockifyTagsStyles from "../styles/special/clockify-tags.css?inline";
import TagService from "../services/tag-service";
import { InfiniteQueryController } from "../query/controllers/infinite-query-controller";
import { MutationController } from "../query/controllers/mutation-controller";
import { useUser, useWorkspace, useRoles } from "../query/hooks/app-hooks";
import { WorkspaceRole } from "../services/user-service";
import TimeEntryService, { EmitType } from "../services/time-entry-service";
import { PermissionEntity } from "../models/project-task.interface";
import { DEFAULT_LOCALES, LocalizationData } from "../utils/constants";
import EventBus from "../services/event-bus";
import { ClockifyWebComponentsApp } from "../clockify-app";

import "./clockify-input";
import "./clockify-button";
import "./clockify-checkbox";
import "./clockify-tooltip";
import "./clockify-tag";

class ClockifyTags extends LitElement {
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) addon = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String }) workspaceId = "";
  @property({ type: String }) timeentryid = "";
  @property({ type: String }) token = "";
  @property({ type: String }) tokenkey = "";
  @property({ type: String }) tokensearchparam = "";
  @property({ type: String }) tokenheader = "";
  @property({ type: String }) homeurl = "";
  @property({ type: String }) homeurlkey = "";
  @property({ type: String }) endpoint = "";
  @property({ type: String }) syncPickedData = EmitType.EMIT_EVENT_ONLY;
  @property({ type: String }) alignment = "left";
  @property({ type: String }) taskId: string = "";
  @property({ type: String }) height = "300px";
  @property({ type: String }) width = "310px";
  @property() tagIds: string = "";

  @state() private tempSelectedTagIds: string[] = [];
  @state() private selectedTagIds: string[] = [];
  @state() private required = false;
  @state() private missingTags: any[] = [];
  @state() private searchString = "";
  @state() private debouncedSearchString = "";
  @state() private localization: LocalizationData = DEFAULT_LOCALES;

  private debounceTimeout: any;

  private userQuery = useUser(this, () => ({ token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!this.endpoint }));
  private workspaceQuery = useWorkspace(this, () => ({ workspaceId: this.workspaceId || this.userQuery.data?.activeWorkspace, token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!(this.workspaceId || this.userQuery.data?.activeWorkspace) && !!this.endpoint }));
  private rolesQuery = useRoles(this, () => ({ workspaceId: this.activeWorkspaceId, userId: this.userQuery.data?.id, token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!this.activeWorkspaceId && !!this.userQuery.data?.id }));

  private getTagsQueryOptions(searchString: string) {
    return {
      queryKey: ['tags', searchString, this.endpoint, this.activeWorkspaceId],
      queryFn: async ({ pageParam = 1 }) => {
        return TagService.getTags(pageParam, searchString, this.token, this.endpoint, this.activeWorkspaceId);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: any, allPages: any) => {
        const loadedCount = allPages.flatMap((p: any) => p.data).length;
        if (loadedCount < lastPage.totalCount) {
          return allPages.length + 1;
        }
        return undefined;
      },
      enabled: !!this.activeWorkspaceId && !!this.endpoint,
    };
  }

  private tagsQuery = new InfiniteQueryController<any, Error, any, readonly unknown[], number>(this, queryClient, () => this.getTagsQueryOptions(this.debouncedSearchString));

  private createTagMutation = new MutationController(this, queryClient, {
    mutationFn: (body: string) => TagService.createTag(body, this.token, this.endpoint, this.activeWorkspaceId),
    onSuccess: async (tag) => {
      if (tag?.id) {
        this.tempSelectedTagIds = [...this.tempSelectedTagIds, tag.id];
        this.missingTags = uniqueBy([...this.missingTags, tag], "id");
      }
      await this.clearSearch();
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
    }
  });

  private updateTagsMutation = new MutationController(this, queryClient, {
    mutationFn: ({ tagIds }: { tagIds: string[] }) => 
      TimeEntryService.updateTags(this.timeentryid, JSON.stringify({ tagIds })),
    onSuccess: (data) => {
      if (data?.id) this.dispatchChangeEvent();
    }
  });

  static styles = [unsafeCSS(clockifyTagsStyles)];

  get workspaceSettings() {
    return this.workspaceQuery.data?.workspaceSettings || {};
  }

  get userRoles() {
    return this.rolesQuery.data || [];
  }

  get activeWorkspaceId() {
    return this.workspaceId || this.userQuery.data?.activeWorkspace;
  }

  get isCreatingTagsAllowed() {
    const roleList = this.userRoles?.map((roleData: { role: WorkspaceRole }) => roleData.role) || [];

    const { whoCanCreateTags } = this.workspaceSettings?.entityCreationPermissions || {
      whoCanCreateTags: this.workspaceSettings?.onlyAdminsCreateTag ? PermissionEntity.ADMINS_AND_PROJECT_MANAGERS : PermissionEntity.EVERYONE,
    };

    return (
      whoCanCreateTags === PermissionEntity.EVERYONE ||
      ((roleList.includes(WorkspaceRole.WORKSPACE_OWN) || ((whoCanCreateTags === PermissionEntity.ADMINS || whoCanCreateTags === PermissionEntity.ADMINS_AND_PROJECT_MANAGERS) && roleList.includes(WorkspaceRole.WORKSPACE_ADMIN))) &&
        !this.readonly)
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

  intersectionController = new IntersectionController<Set<string>>(this, {
    target: null,
    config: {
      threshold: 0.2,
      root: document.querySelector(".clockify-tags"),
      rootMargin: `0px 0px 0px 0px`,
    },
    callback(this: IntersectionController<Set<string>>, entries) {
      const intersectingSet = this.value ?? new Set();
      for (const { isIntersecting, target } of entries) {
        const idx = target.getAttribute("data-idx") ?? "no-idx";
        if (isIntersecting) {
          if (idx !== "no-idx") {
            intersectingSet.add(idx);
          }
        } else {
          if (idx !== "no-idx") {
            intersectingSet.delete(idx);
          }
        }
      }
      return intersectingSet;
    },
  });

  private readonly _boundHandleAppInit: any;
  private readonly _boundHandleGlobalError: any;
  private readonly _boundHandleGlobalSuccess: any;

  constructor() {
    super();
    this._boundHandleAppInit = this.handleAppInit.bind(this);
    this._boundHandleGlobalError = this.handleGlobalError.bind(this);
    this._boundHandleGlobalSuccess = this.handleGlobalSuccess.bind(this);
  }

  async handleAppInit(event: any) {
    const config = event.detail;
    this.loading = true;

    if (config.token) this.token = config.token;
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.workspaceId) this.workspaceId = config.workspaceId;
    if (config.homeUrl) this.homeurl = config.homeUrl;
    if (config.addon !== undefined) this.addon = config.addon;

    this.selectedTagIds = [];
    this.tempSelectedTagIds = [];
    this.missingTags = [];
    
    await this.updateComplete;

    this.loading = false;
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
    hotkeys("esc", () => {
      if (this.open) {
        this.selectTagIds();
      }
      this.closeOverlay();
    });
    hotkeys("ctrl+enter", (e) => {
      if (!this.open || !this.isCreatingTagsAllowed || this.readonly) return;
      const name = (this.searchString || this.debouncedSearchString).trim();
      if (!name) return;
      e.preventDefault();
      this.searchString = name;
      this.createTag(e);
    });
    document.addEventListener("click", this.clickOutside.bind(this));
    toggleTheme(this);
    toggleTheme(this, this.shadowRoot?.querySelector(".tags-overlay"));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    EventBus.removeEventListener("error", this._boundHandleGlobalError);
    EventBus.removeEventListener("success", this._boundHandleGlobalSuccess);
    EventBus.removeEventListener("clockify-app-init", this._boundHandleAppInit);
    hotkeys.unbind("esc");
    hotkeys.unbind("ctrl+enter");
    document.removeEventListener("click", this.clickOutside.bind(this));
  }

  async updated(_changedProperties: PropertyValues) {
    const loadMoreToggle = this.shadowRoot?.querySelector(".load-more-tags") as HTMLElement;
    if (loadMoreToggle) {
      this.intersectionController.observe(loadMoreToggle);
      await this.handleLoadMore();
    }

    if (_changedProperties.has("tagIds")) {
      if (this.tagIds) {
        this.tempSelectedTagIds = this.tagIds.split(",").filter(Boolean);
        this.selectedTagIds = [...this.tempSelectedTagIds];
        await this.populateMissingTags();
      } else {
        this.selectedTagIds = [];
        this.tempSelectedTagIds = [];
      }
    }
  }



  async handleLoadMore() {
    const loadMoreClientIds = this.intersectionController.value;
    if (!loadMoreClientIds?.size) return;
    if (this.tagsQuery.hasNextPage && !this.tagsQuery.isFetchingNextPage) {
      await this.tagsQuery.fetchNextPage();
    }
  }

  async populateMissingTags() {
    const currentTags = this.tagsQuery.data?.pages.flatMap((p: any) => p.data) || [];
    const currentTagIds = currentTags.map((t: any) => t.id);

    for (const tagId of this.selectedTagIds) {
      if (!currentTagIds.includes(tagId) && !this.missingTags.find((t: any) => t.id === tagId)) {
        const tag = await queryClient.fetchQuery({
          queryKey: ['tag', tagId, this.endpoint, this.workspaceId],
          queryFn: () => TagService.getTag(tagId, this.token, this.endpoint, this.workspaceId),
          staleTime: Infinity
        });
        if (tag) {
          this.missingTags = [...this.missingTags, tag];
        }
      }
    }
  }

  handleSearch = async (e: any) => {
    this.searchString = (e.target as HTMLInputElement).value;
    clearTimeout(this.debounceTimeout);

    const currentTags = this.tagsQuery.data?.pages.flatMap((p: any) => p.data) || [];
    const selectedInCurrent = currentTags.filter((t: any) => this.selectedTagIds.includes(t.id));
    if (selectedInCurrent.length) {
      this.missingTags = uniqueBy([...this.missingTags, ...selectedInCurrent], "id");
    }

    this.debounceTimeout = setTimeout(async () => {
      this.debouncedSearchString = this.searchString;
    }, 200);
  }

  async handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || (e as any).metaKey)) {
      if (!this.open || !this.isCreatingTagsAllowed || this.readonly) return;
      const name = (this.searchString || this.debouncedSearchString).trim();
      if (!name) return;
      e.preventDefault();
      e.stopPropagation();
      this.searchString = name;
      await this.createTag(e);
    }
  }

  async closeOverlay() {
    this.open = false;
    const hasMultiplePages = (this.tagsQuery.data?.pages.length || 0) > 1;
    if(this.debouncedSearchString || this.searchString || hasMultiplePages) {
      this.searchString = "";
      this.debouncedSearchString = "";
    }
  }

  async toggleOverlay(e: any) {
    e.stopPropagation();
    if (!this.disabled) {
      if (this.open) {
        await this.selectTagIds();
      }
      this.open = !this.open;
    }
  }

  async clickOutside(e: Event) {
    if (!e.composedPath().includes(this) && this.open) {
      await this.selectTagIds();
      await this.closeOverlay();
    }
  }

  async sendPickedData() {
    if (this.timeentryid) {
      await this.updateTagsMutation.mutate({ tagIds: this.selectedTagIds });
    }
  }

  async handleTagsPicked() {
    switch (this.syncPickedData) {
      case EmitType.EMIT_EVENT_ONLY:
        this.dispatchChangeEvent();
        break;
      case EmitType.SYNC_ON_CHANGE:
        await this.sendPickedData();
        break;
      default:
        this.dispatchChangeEvent();
        break;
    }
  }

  selectTag(tagId: string) {
    if (this.tempSelectedTagIds.includes(tagId)) {
      this.tempSelectedTagIds = this.tempSelectedTagIds.filter((id) => id !== tagId);
    } else {
      this.tempSelectedTagIds = [...this.tempSelectedTagIds, tagId];
    }
  }

  async clearSearch(e?: any) {
    e?.stopPropagation();

    const currentTags = this.tagsQuery.data?.pages.flatMap((p: any) => p.data) || [];
    const selectedTagsToPromote = currentTags.filter((t: any) => this.tempSelectedTagIds.includes(t.id));
    if (selectedTagsToPromote.length) {
      this.missingTags = uniqueBy([...this.missingTags, ...selectedTagsToPromote], "id");
    }

    this.searchString = "";
    this.debouncedSearchString = "";
    await this.populateMissingTags();
  }

  dispatchChangeEvent() {
    const queryTags = this.tagsQuery.data?.pages.flatMap((page: any) => page.data) || [];
    const allTags = uniqueBy([...this.missingTags, ...queryTags], "id");
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { tags: allTags.filter((tag: any) => this.selectedTagIds.includes(tag.id)) },
        bubbles: true,
        composed: true,
      })
    );
  }

  async selectTagIds() {
    const temp = this.tempSelectedTagIds.filter(Boolean);
    const isSame = temp.length === this.selectedTagIds.length && temp.every(id => this.selectedTagIds.includes(id));

    if (!isSame) {
      this.selectedTagIds = temp;
      await this.handleTagsPicked();
    }
  }

  async createTag(e: any) {
    e.stopPropagation();
    const body = JSON.stringify({ name: this.searchString });
    await this.createTagMutation.mutate(body);
  }

  render() {
    const queryTags = this.tagsQuery.data?.pages.flatMap((page: any) => page.data) || [];
    const allKnownTags = uniqueBy([...this.missingTags, ...queryTags], "id");
    
    let displayedTags = this.debouncedSearchString ? queryTags : allKnownTags;

    displayedTags = displayedTags.sort((a: any, b: any) => {
      const aCommitted = this.selectedTagIds.includes(a.id);
      const bCommitted = this.selectedTagIds.includes(b.id);
      if (aCommitted && !bCommitted) return -1;
      if (!aCommitted && bCommitted) return 1;

      const aTop = this.tempSelectedTagIds.includes(a.id) && this.missingTags.some((t: any) => t.id === a.id);
      const bTop = this.tempSelectedTagIds.includes(b.id) && this.missingTags.some((t: any) => t.id === b.id);
      if (aTop && !bTop) return -1;
      if (!aTop && bTop) return 1;

      return 0;
    });
    const isLoading = this.tagsQuery.isLoading;

    const tagsString = this.selectedTagIds
      .map((id) => allKnownTags.find((t: any) => t.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return html`<div class="clockify-tags" @click="${this.toggleOverlay}">
      <clockify-tooltip content=${tagsString} ?disabled=${!this.selectedTagIds.length || this.open} placement="bottom" style="max-width: 80px; text-align: center;">
        <div
          part="header"
          class="tags-header"
          @click="${this.toggleOverlay}"
          @keydown="${async (e: KeyboardEvent) => {
            if (e.key === "Enter") {
              await this.toggleOverlay(e);
            }
          }}"
          tabindex="0">
          ${tagsString
            ? html`<clockify-tag size="small" variant="primary"> ${tagsString} </clockify-tag>`
            : html`<div
                class="${classMap({
                  "svg-wrapper": true,
                  "required": this.required || (this.workspaceSettings?.forceTags && !this.selectedTagIds.length),
                })}">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0)">
                    <path
                      d="M19.7753 11.0553L9.08864 0.301508C8.98877 0.201005 8.78901 0.100503 8.68914 0.100503L0.599251 0C0.299625 0 0 0.301508 0 0.603015L0.0998752 8.24121C0.0998752 8.44221 0.19975 8.54271 0.299625 8.74372L11.2859 19.799C11.3858 19.8995 11.5855 20 11.6854 20C11.8851 20 11.985 19.8995 12.0849 19.799L19.7753 12.0603C20.0749 11.7588 20.0749 11.3568 19.7753 11.0553ZM11.6854 18.794L1.09863 8.0402L0.998752 1.00503L8.48939 1.10553L18.8764 11.5578L11.6854 18.794ZM4.39451 4.52261C3.79526 5.12563 3.79526 6.13065 4.39451 6.73367C4.99376 7.33668 5.99251 7.33668 6.59176 6.73367C7.19101 6.13065 7.19101 5.12563 6.59176 4.52261C6.09238 3.9196 5.09363 3.9196 4.39451 4.52261Z"
                      fill="#90A4AE" />
                  </g>
                  <defs>
                    <clipPath id="clip0">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </div>`}
        </div>
      </clockify-tooltip>
      ${this.open
        ? html`<div
            class="${classMap({
              "tags-overlay": true,
              "alignment-left": this.alignment === "left",
              "alignment-right": this.alignment === "right",
            })}"
            @click="${(e: any) => {
              e.stopPropagation();
            }}"
            style="width: ${this.width}; max-height: ${this.height};">
            <div
              class="search-box"
              @keyup="${(e: KeyboardEvent) => {
                e.stopPropagation();
              }}">
              <clockify-input
                @click="${(e: any) => {
                  e.stopPropagation();
                }}"
                type="text"
                autocomplete="off"
                placeholder="${this.isCreatingTagsAllowed
                  ? t(this.localization.ADD_SEARCH_PLACEHOLDER_LABEL, { entity: getEntityLabel("tag", true) })
                  : this.localization.SEARCH_TAGS_PLACEHOLDER_LABEL}"
                .value="${this.searchString}"
                @input=${this.handleSearch}
                @keydown=${this.handleSearchKeydown}>
                <svg class="search" width="20" height="20" slot="prefix" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M19.975 19.275L14.675 13.975C17.575 10.675 17.475 5.575 14.375 2.475C11.075 -0.825 5.775 -0.825 2.475 2.475C-0.825 5.775 -0.825 11.075 2.475 14.375C5.675 17.575 10.675 17.675 13.975 14.675L19.275 19.975L19.975 19.275ZM3.175 13.575C0.275 10.675 0.275 5.975 3.175 3.075C6.075 0.175 10.775 0.175 13.675 3.075C16.575 5.975 16.575 10.675 13.675 13.575C10.775 16.475 6.075 16.475 3.175 13.575Z"
                    fill="#90A4AE" />
                </svg>
                ${this.searchString
                  ? html`<svg
                      class="close"
                      slot="suffix"
                      @click="${this.clearSearch}"
                      @keyup="${async (e: KeyboardEvent) => {
                        if (e.key === "Enter") {
                          await this.clearSearch(e);
                        }
                      }}"
                      tabindex="0"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 0.7L11.3 0L6 5.3L0.7 0L0 0.7L5.3 6L0 11.3L0.7 12L6 6.7L11.3 12L12 11.3L6.7 6L12 0.7Z" fill="#999999" />
                    </svg>`
                  : nothing}
              </clockify-input>
            </div>
            ${displayedTags.length > 0
              ? html`<ul class="tags-list">
                  ${displayedTags.map(
                    (tag: any) =>
                      html`<li
                        class="tag"
                        @click="${() => {
                          this.selectTag(tag.id);
                        }}"
                        @keyup="${(e: any) => {
                          if (e.key === "Enter") {
                            this.selectTag(tag.id);
                          }
                        }}"
                        tabindex="0">
                        <clockify-checkbox
                          id="${tag.id}"
                          name="${tag.name}"
                          value="${tag.id}"
                          @sl-change="${() => {
                            this.selectTag(tag.id);
                          }}"
                          tabindex="-1"
                          ?checked="${this.tempSelectedTagIds.includes(tag.id)}"></clockify-checkbox>
                        ${tag.name}
                      </li>`
                  )}
                  ${this.tagsQuery.hasNextPage && !isLoading ? html`<li class="load-more-tags" data-idx="one"></li>` : nothing}
                </ul>`
              : nothing}
            ${displayedTags.length === 0 && !this.debouncedSearchString && !this.readonly && !isLoading
              ? html`<div class="no-tags">
                  <span>${t(this.localization.NO_ENTITIES_YET_LABEL, { entityInPlural: getEntityLabel("tag", true) })}</span>
                  <span>${this.localization.START_TYPING_LABEL}</span>
                </div>`
              : nothing}
            ${this.debouncedSearchString && !this.readonly && !isLoading && !displayedTags.find(({ name }: any) => name === this.debouncedSearchString) && displayedTags.length === 0
              ? html`<div class="quick-create-tag">
                  <span class="no-tag">${t(this.localization.NO_MATCHING_ENTITIES_LABEL, { entityInPlural: getEntityLabel("tag", true) })}</span>
                  ${this.isCreatingTagsAllowed
                    ? html`<span class="quickly"
                        >${this.localization.CREATE_ENTITY_LABEL}
                        <a class="link" @click="${this.createTag}"> ${t(this.localization.CREATE_ENTITY_LABEL_2, {
                          nameFilter: this.debouncedSearchString,
                          entity: getEntityLabel('tag'),
                        })}</a>
                      </span>`
                    : nothing}
                </div>`
              : nothing}
          </div>`
        : nothing}
    </div>`;
  }
}

customElements.define("clockify-tags", ClockifyTags);
export { ClockifyTags };
