import { html, LitElement, nothing, PropertyValues, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { IntersectionController } from "@lit-labs/observers/intersection-controller.js";

import { MutationController } from "../../query/controllers/mutation-controller";
import { queryClient } from "../../query/client";
import TaskService from "../../services/task-service";
import ProjectClientService from "../../services/project-client-service";
import clientProjectsStyles from "../../styles/special/clockify-project-picker/client-projects.css?inline";
import { toggleTheme, getEntityLabel, t } from "../../utils";
import { DEFAULT_ENTITY_NAMES, DEFAULT_LOCALES, type LocalizationData } from "../../utils/constants";

import "../clockify-button";
import "../clockify-tooltip";

class ClientProjects extends LitElement {
  static styles = [unsafeCSS(clientProjectsStyles)];
  @property({ type: Object }) clientObject: {
    client: any;
    projects: any[];
    projectsCount: number;
  } = { client: {}, projects: [], projectsCount: 0 };
  @property({ type: Object }) entityNames = DEFAULT_ENTITY_NAMES;
  @property({ type: Boolean }) isSingleClientDialogOpen = false;
  @property({ type: Object }) selectedProject: any = {};
  @property({ type: Object }) selectedTask: any = {};
  @property({ type: Object }) workspaceSettings: any = {};
  @property({ type: Object }) userSettings: any = {};

  @property({ type: Boolean }) isCreatingProjectsAllowed: boolean = false;
  @property({ type: Boolean }) isCreatingTasksAllowed: boolean = false;
  @property({ type: Boolean }) isCreatingTasksAllowedForPMs: boolean = false;
  @property({ type: Array }) projectIdListWhereUserIsProjectManager: string[] = [];
  @property({ type: Array }) favoriteProjects: any[] = [];
  @property({ type: String }) loadingProjectsForClientId: string | null = null;
  @property({ type: String }) loadingTasksForProjectId: string | null = null;
  @property({ type: Boolean }) showBullet: boolean = true;
  @property({ type: Boolean }) showFavorites: boolean = true;
  @property({ type: Object }) localization: LocalizationData = DEFAULT_LOCALES;
  @property({ type: String }) token = "";
  @property({ type: String }) endpoint = "";
  @property({ type: String }) workspaceId = "";
  @property({ type: String }) userId = "";

  @state() private truncatedProjectIds = new Set<string>();

  private setFavoriteProjectMutation = new MutationController(this, queryClient, {
    mutationFn: (projectId: string) => ProjectClientService.setFavoriteProject(projectId, this.token, this.endpoint, this.workspaceId, this.userId),
    onMutate: async (projectId: string) => {
      const project = this.clientObject.projects.find((p: any) => p.id === projectId);
      const previousFavorite = !!(project?.favorite || this.favoriteProjects.some((p: any) => p.id === projectId));
      const previousTasks = (project?.tasks || []).map((t: any) => ({ ...t }));

      this.dispatchEvent(
        new CustomEvent("update-project-tasks", {
          detail: {
            projectId,
            tasks: project?.tasks || [],
            projectUpdates: { favorite: true },
          },
          bubbles: true,
          composed: true,
        })
      );

      return { projectId, previousFavorite, previousTasks };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
      this.dispatchEvent(
        new CustomEvent("update-favorite-projects", {
          bubbles: true,
          composed: true,
        })
      );
    },
    onError: async (_error, _variables, context: any) => {
      if (!context?.projectId) return;
      this.dispatchEvent(
        new CustomEvent("update-project-tasks", {
          detail: {
            projectId: context.projectId,
            tasks: context.previousTasks || [],
            projectUpdates: { favorite: context.previousFavorite },
          },
          bubbles: true,
          composed: true,
        })
      );
    },
  });

  private deleteFavoriteProjectMutation = new MutationController(this, queryClient, {
    mutationFn: (projectId: string) => ProjectClientService.deleteFavoriteProject(projectId, this.token, this.endpoint, this.workspaceId, this.userId),
    onMutate: async (projectId: string) => {
      const project = this.clientObject.projects.find((p: any) => p.id === projectId);
      const previousFavorite = !!(project?.favorite || this.favoriteProjects.some((p: any) => p.id === projectId));
      const previousTasks = (project?.tasks || []).map((t: any) => ({ ...t }));

      this.dispatchEvent(
        new CustomEvent("update-project-tasks", {
          detail: {
            projectId,
            tasks: project?.tasks || [],
            projectUpdates: { favorite: false },
          },
          bubbles: true,
          composed: true,
        })
      );

      return { projectId, previousFavorite, previousTasks };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
      this.dispatchEvent(
        new CustomEvent("update-favorite-projects", {
          bubbles: true,
          composed: true,
        })
      );
    },
    onError: async (_error, _variables, context: any) => {
      if (!context?.projectId) return;
      this.dispatchEvent(
        new CustomEvent("update-project-tasks", {
          detail: {
            projectId: context.projectId,
            tasks: context.previousTasks || [],
            projectUpdates: { favorite: context.previousFavorite },
          },
          bubbles: true,
          composed: true,
        })
      );
    },
  });

  private setFavoriteTaskMutation = new MutationController(this, queryClient, {
    mutationFn: ({ projectId, taskId }: { projectId: string; taskId: string }) => TaskService.setFavoriteTask(projectId, taskId, this.token, this.endpoint, this.workspaceId, this.userId),
    onMutate: async ({ projectId, taskId }) => {
      const project = this.clientObject.projects.find((p: any) => p.id === projectId);
      if (project) {
        const updatedTasks = project.tasks.map((t: any) => (t.id === taskId ? { ...t, favorite: true } : t));
        const projectUpdates = !project.favorite ? { favorite: true } : undefined;
        this.dispatchEvent(
          new CustomEvent("update-project-tasks", {
            detail: {
              projectId,
              tasks: updatedTasks,
              projectUpdates
            },
            bubbles: true,
            composed: true,
          })
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
    }
  });

  private deleteFavoriteTaskMutation = new MutationController(this, queryClient, {
    mutationFn: ({ projectId, taskId }: { projectId: string; taskId: string }) => TaskService.deleteFavoriteTask(projectId, taskId, this.token, this.endpoint, this.workspaceId, this.userId),
    onMutate: async ({ projectId, taskId }) => {
      const project = this.clientObject.projects.find((p: any) => p.id === projectId);
      if (project) {
        const updatedTasks = project.tasks.map((t: any) => (t.id === taskId ? { ...t, favorite: false } : t));
        this.dispatchEvent(
          new CustomEvent("update-project-tasks", {
            detail: {
              projectId,
              tasks: updatedTasks,
            },
            bubbles: true,
            composed: true,
          })
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
    }
  });

  connectedCallback() {
    super.connectedCallback();
    toggleTheme(this);
  }

  intersectionController = new IntersectionController<Set<string>>(this, {
    target: null,
    config: {
      threshold: 0.2,
      root: document.querySelector("#projects"),
      rootMargin: `0px 0px 0px 0px`,
    },
    callback(this: IntersectionController<Set<string>>, entries) {
      const intersectingSet = this.value ?? new Set();
      for (const { isIntersecting, target } of entries) {
        const idx = target.getAttribute("data-idx") ?? "no-idx";
        const idy = target.getAttribute("data-idy") ?? "no-idy";
        if (isIntersecting) {
          if (idx !== "no-idx") {
            intersectingSet.add(idx);
          }
          if (idy !== "no-idy") {
            intersectingSet.add(idy);
          }
        } else {
          if (idx !== "no-idx") {
            intersectingSet.delete(idx);
          }
          if (idy !== "no-idy") {
            intersectingSet.delete(idy);
          }
        }
      }
      return intersectingSet;
    },
  });

  updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    this.shadowRoot?.querySelectorAll(".load-more-projects").forEach((item) => this.intersectionController.observe(item));
    this.shadowRoot?.querySelectorAll(".load-more-tasks").forEach((item) => this.intersectionController.observe(item));
    this.handleLoadMore();
    this.updateTruncatedProjectIds();
  }

  private updateTruncatedProjectIds() {
    const nextTruncatedProjectIds = new Set<string>();
    this.shadowRoot?.querySelectorAll<HTMLElement>(".project-name-text[data-project-id]").forEach((element) => {
      const projectId = element.dataset.projectId;
      if (projectId && element.scrollWidth > element.clientWidth) {
        nextTruncatedProjectIds.add(projectId);
      }
    });

    if (!this.areProjectIdSetsEqual(this.truncatedProjectIds, nextTruncatedProjectIds)) {
      this.truncatedProjectIds = nextTruncatedProjectIds;
    }
  }

  private areProjectIdSetsEqual(first: Set<string>, second: Set<string>) {
    if (first.size !== second.size) return false;
    return [...first].every((projectId) => second.has(projectId));
  }

  handleLoadMore() {
    const loadMoreClientIds = this.intersectionController.value;
    if (!loadMoreClientIds?.size) return;
    const idsToLoad = new Set(loadMoreClientIds);
    this.dispatchEvent(
      new CustomEvent("load-more", {
        detail: {
          loadMoreClientIds: idsToLoad,
        },
        bubbles: true,
        composed: true,
      })
    );
    loadMoreClientIds.clear();
  }

  toggleProjectCollapse(e: Event, clientId: string, projectId: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("toggle-project-collapse", {
        detail: {
          e,
          clientId,
          projectId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async getTasks(projectId: string) {
    const tasks = await queryClient.fetchQuery({
      queryKey: ['tasks', projectId, this.endpoint, this.workspaceId],
      queryFn: () => TaskService.getTasks(projectId, 1, [], this.token, this.endpoint, this.workspaceId),
      staleTime: 1000 * 60 * 5
    });
    const sortedTasks = [...tasks].reverse().sort((a: any, b: any) => {
      if (a.favorite === b.favorite) return 0;
      return a.favorite ? -1 : 1;
    });
    this.dispatchEvent(
      new CustomEvent("update-project-tasks", {
        detail: {
          projectId,
          tasks: sortedTasks,
        },
        bubbles: true,
        composed: true,
      })
    );
    return sortedTasks;
  }

  async handleSelect(project: any = {}, task: any = {}) {
    this.dispatchEvent(
      new CustomEvent("select-project-task", {
        detail: {
          project,
          task,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  openNewTaskDialog(e: Event, projectId: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("open-task-dialog", {
        detail: {
          projectId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async setFavoriteProject(e: Event, projectId: string) {
    e.stopPropagation();
    await this.setFavoriteProjectMutation.mutate(projectId);
  }

  async setFavoriteTask(e: Event, projectId: string, taskId: string) {
    e.stopPropagation();
    await this.setFavoriteTaskMutation.mutate({ projectId, taskId });
  }

  async deleteFavoriteTask(e: Event, projectId: string, taskId: string) {
    e.stopPropagation();
    await this.deleteFavoriteTaskMutation.mutate({ projectId, taskId });
  }

  async deleteFavoriteProject(e: Event, projectId: string) {
    e.stopPropagation();
    await this.deleteFavoriteProjectMutation.mutate(projectId);
  }

  async handleProjectSelection(e: Event, client: any, project: any, taskOfThisProjectSelected: boolean) {
    if (this.workspaceSettings?.forceTasks) {
      if (!this.isSingleClientDialogOpen) {
        this.toggleProjectCollapse(e, client.id, project.id);
        const tasks = await this.getTasks(project.id);
        if (tasks.length === 1 && !taskOfThisProjectSelected) {
          await this.handleSelect(project, tasks[0]);
        }
      }
    } else {
      await this.handleSelect(project);
    }
  }

  handleScroll(e: Event) {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    const containerRect = el.getBoundingClientRect();
    const BASELINE = containerRect.top;
    el.querySelectorAll<HTMLElement>(".project-container.sticking").forEach((pc) => {
      pc.classList.remove("sticking");
      pc.style.transform = "translateY(0)";
    });
    const projects = el.getElementsByClassName("expanded");
    let lastStickyProject: any = null;

    Array.from(projects).forEach((project, index) => {
      const nextProject = projects[index + 1];
      const clientRect = project.getBoundingClientRect();

      if (clientRect.top - BASELINE <= 0) {
        if (lastStickyProject) {
          lastStickyProject.classList.remove("sticking");
        }
        project.classList.add("sticking");
        lastStickyProject = project;
      }

      if (nextProject) {
        const nextClientRect = nextProject.getBoundingClientRect();
        if (nextClientRect.top <= BASELINE + clientRect.height) {
          // @ts-ignore
          project.style.transform = `translateY(${nextClientRect.top - BASELINE - clientRect.height}px)`;
        } else {
          // @ts-ignore
          project.style.transform = "translateY(0)";
        }
      }
    });
  }

  render() {
    const { client, projects = [], projectsCount } = this.clientObject;
    return html`<div @scroll="${this.handleScroll}">
      ${projects.map((project: any) => {
        const color = project.color || "#000";
        const taskOfThisProjectSelected = this.selectedProject?.id === project.id && this.selectedTask?.id;
        const taskCount = project.taskCount;
        const isProjectSelectionDisabled = this.workspaceSettings?.forceTasks && taskCount === 0;
        const projectTitle = `${project.name || ""}${client?.id === "favorites" && project.client?.name ? ` - ${project.client.name}` : ""}`.trim();
        return html`
          <div
            class=${classMap({
              "project-container": true,
              "disabled": isProjectSelectionDisabled,
              "expanded": !project.collapsed,
            })}
            title=${isProjectSelectionDisabled ? this.localization.CAN_NOT_SELECT_PROJECT : ""}>
            <div
              class="left"
              tabindex="0"
              role="button"
              data-value="${project.id}"
              @keyup="${async (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  await this.handleProjectSelection(e, client, project, taskOfThisProjectSelected);
                }
              }}"
              @click="${(e: Event) => this.handleProjectSelection(e, client, project, taskOfThisProjectSelected)}">
              ${this.showBullet
                ? html`<svg width="6px" height="6px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle fill="${color}" cx="50" cy="50" r="50" />
                  </svg>`
                : nothing}
              <clockify-tooltip class="project-tooltip" ?disabled=${!projectTitle || !this.truncatedProjectIds.has(project.id)} placement="bottom" content=${projectTitle}>
                <span class="text project-name-text" data-project-id=${project.id}>
                  <span class="project-name" style="color: ${color};">${project.name}</span>
                  ${client?.id === "favorites" && project.client?.name ? html`<span class="client-name">- ${project.client.name}</span>` : nothing}
                </span>
              </clockify-tooltip>
            </div>
            <div class="right">
              ${taskCount
                ? html`<span
                    class="${classMap({
                      quantity: true,
                      collapsed: !!project.collapsed,
                    })}"
                    tabindex="0"
                    role="button"
                    @keyup="${(e: KeyboardEvent) => {
                      if (e.key === "Enter") {
                        this.toggleProjectCollapse(e, client.id, project.id);
                      }
                    }}"
                    @click="${(e: Event) => this.toggleProjectCollapse(e, client.id, project.id)}">
                    <span>${t(this.localization.COUNT_TASKS_LABEL, { count: taskCount, taskLabel: getEntityLabel(this.entityNames.task, taskCount !== 1) })}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6">
                      <path
                        d="M5.48011 0.359492C5.21495 0.0943222 4.78505 0.0943223 4.51989 0.359492L0.19887 4.68051C-0.0663004 4.94566 -0.0663003 5.37557 0.19887 5.64073C0.46403 5.90589 0.89394 5.90589 1.15909 5.64073L5 1.79983L8.84091 5.64073C9.10606 5.90589 9.53597 5.90589 9.80112 5.64073C10.0663 5.37557 10.0663 4.94566 9.80112 4.68051L5.48011 0.359492Z"
                        fill="var(--clockify-gray-400)" />
                    </svg>
                  </span>`
                : nothing}
              ${!taskCount && (this.isCreatingTasksAllowed || (this.isCreatingTasksAllowedForPMs && this.projectIdListWhereUserIsProjectManager.includes(project.id)))
                ? html` <clockify-button class="link" variant="text" size="small" @click="${(e: Event) => this.openNewTaskDialog(e, project.id)}"
                    >${t(this.localization?.CREATE_CUSTOM_LABEL, {
                      label: getEntityLabel(this.entityNames.task),
                    })}</clockify-button
                  >`
                : nothing}
              ${this.favoriteProjects.map((favoriteProject: any) => favoriteProject.id).includes(project.id)
                ? html` <svg
                    tabindex="0"
                    role="button"
                    @keyup="${async (e: KeyboardEvent) => {
                      if (e.key === "Enter") {
                        await this.deleteFavoriteProject(e, project.id);
                      }
                    }}"
                    @mousedown="${(e: Event) => e.preventDefault()}"
                    @click="${(e: Event) => this.deleteFavoriteProject(e, project.id)}"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    class="star"
                    style="display: ${this.showFavorites ? "inline-block" : "none"};">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 6H5.8L8 0L10.2 6H16L11.3 9.6L13.5 16L8 12L2.5 16L4.7 9.6L0 6Z" fill="var(--clockify-warning)" />
                  </svg>`
                : html` <svg
                    tabindex="0"
                    role="button"
                    @keyup="${async (e: KeyboardEvent) => {
                      if (e.key === "Enter") {
                        await this.setFavoriteProject(e, project.id);
                      }
                    }}"
                    @mousedown="${(e: Event) => e.preventDefault()}"
                    @click="${(e: Event) => this.setFavoriteProject(e, project.id)}"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    class="star"
                    style="display: ${this.showFavorites ? "inline-block" : "none"};">
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M0 6H5.8L8 0L10.2 6H16L11.3 9.6L13.5 16L8 12L2.5 16L4.7 9.6L0 6ZM4.5 13.4L7.7 11.1L8 10.8L8.4 11.1L11.6 13.4L10.3 9.7L10.2 9.3L10.5 9L13.1 7H9.9H9.5L9.3 6.6L8 2.9L6.7 6.6L6.5 7H6.1H2.9L5.5 9L5.9 9.3L5.8 9.7L4.5 13.4Z"
                      fill="var(--clockify-gray-1000)" />
                  </svg>`}
            </div>
          </div>
          ${project.collapsed
            ? nothing
            : html` <div class="projects-container tasks">
                ${project.tasks.map((task: any) => {
                    return html` <div class="project-container tasks">
                      <div
                        class="left"
                        tabindex="0"
                        role="button"
                        data-value="${task.id}"
                        @keyup="${async (e: KeyboardEvent) => {
                          if (e.key === "Enter") {
                            await this.handleSelect(project, task);
                          }
                        }}"
                        @click="${() => this.handleSelect(project, task)}">
                        <div class="text">${task.name || task.task?.name || ""}</div>
                      </div>
                      <div class="right">
                        ${task.favorite
                          ? html` <svg
                              tabindex="0"
                              role="button"
                              @keyup="${async (e: KeyboardEvent) => {
                                if (e.key === "Enter") {
                                  await this.deleteFavoriteTask(e, project.id, task.id);
                                }
                              }}"
                              @mousedown="${(e: Event) => e.preventDefault()}"
                              @click="${(e: Event) => this.deleteFavoriteTask(e, project.id, task.id)}"
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              class="star"
                              style="display: ${this.showFavorites ? "inline-block" : "none"};">
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M0 6H5.8L8 0L10.2 6H16L11.3 9.6L13.5 16L8 12L2.5 16L4.7 9.6L0 6Z" fill="var(--clockify-warning)" />
                            </svg>`
                          : html`<svg
                            tabindex="0"
                            role="button"
                            @keyup="${async (e: KeyboardEvent) => {
                              if (e.key === "Enter") {
                                await this.setFavoriteTask(e, project.id, task.id);
                              }
                            }}"
                            @mousedown="${(e: Event) => e.preventDefault()}"
                            @click="${(e: Event) => this.setFavoriteTask(e, project.id, task.id)}"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            class="star"
                            style="display: ${this.showFavorites ? "inline-block" : "none"};">
                              <path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M0 6H5.8L8 0L10.2 6H16L11.3 9.6L13.5 16L8 12L2.5 16L4.7 9.6L0 6ZM4.5 13.4L7.7 11.1L8 10.8L8.4 11.1L11.6 13.4L10.3 9.7L10.2 9.3L10.5 9L13.1 7H9.9H9.5L9.3 6.6L8 2.9L6.7 6.6L6.5 7H6.1H2.9L5.5 9L5.9 9.3L5.8 9.7L4.5 13.4Z"
                                fill="var(--clockify-gray-1000)" />
                            </svg>`}
                      </div>
                    </div>`;
                  })}
                ${taskCount > 50 && this.loadingTasksForProjectId !== project.id && project.tasks.length < taskCount
                  ? html`<div class="load-more-tasks" data-idy="project-${project.id}"></div>`
                  : nothing}
                ${taskCount && (this.isCreatingTasksAllowed || (this.isCreatingTasksAllowedForPMs && this.projectIdListWhereUserIsProjectManager.includes(project.id)))
                  ? html` <div class="project-container create-task">
                      <clockify-button class="link" variant="text" size="small" @click="${(e: Event) => this.openNewTaskDialog(e, project.id)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19">
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M9.5 19C14.7467 19 19 14.7467 19 9.5C19 4.25329 14.7467 0 9.5 0C4.25329 0 0 4.25329 0 9.5C0 14.7467 4.25329 19 9.5 19ZM9.50001 18.05C14.222 18.05 18.05 14.222 18.05 9.5C18.05 4.77797 14.222 0.95 9.50001 0.95C4.77798 0.95 0.950012 4.77797 0.950012 9.5C0.950012 14.222 4.77798 18.05 9.50001 18.05Z"
                            fill="var(--clockify-primary)" />
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M9.97983 4.75005L9.03938 4.75005L9.03938 9.02062L4.76881 9.02062V9.96107L9.03938 9.96107L9.03938 14.2316L9.97983 14.2316L9.97983 9.96107L14.2504 9.96107V9.02062L9.97983 9.02062L9.97983 4.75005Z"
                            fill="var(--clockify-primary)" />
                        </svg>
                        ${t(this.localization?.CREATE_NEW_CUSTOM_LABEL, {
                          label: getEntityLabel(this.entityNames.task),
                        })}
                      </clockify-button>
                    </div>`
                  : nothing}
              </div>`}
        `;
      })}
      ${projectsCount > this.userSettings.projectListCollapse && this.loadingProjectsForClientId !== client.id && projects.length < projectsCount
        ? html`<div class="load-more-projects" data-idx="client-${client.id}"></div>`
        : nothing}
    </div>`;
  }
}

customElements.define("client-projects", ClientProjects);
export { ClientProjects };
