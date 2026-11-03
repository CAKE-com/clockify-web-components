import { html, LitElement, nothing, PropertyValues, unsafeCSS } from "lit";
import { property, state, queryAsync } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { createRef, ref } from "lit/directives/ref.js";
import hotkeys from "hotkeys-js";

import { toggleTheme, toCapital, t, getEntityLabel, uniqueBy } from "../utils";
import clockifyProjectSelectStyles from "../styles/special/clockify-project-picker.css?inline";
import ProjectClientService from "../services/project-client-service";
import TaskService from "../services/task-service";
import WorkspaceService from "../services/workspace-service";
import TimeEntryService, { EmitType } from "../services/time-entry-service";
import { WorkspaceRole } from "../services/user-service";
import { PermissionEntity } from "../models/project-task.interface";
import { presetColors, DEFAULT_PROJECT, DEFAULT_TASK, DEFAULT_ENTITY_NAMES, DEFAULT_LOCALES, type LocalizationData } from "../utils/constants";
import EventBus from "../services/event-bus";
import { MutationController } from "../query/controllers/mutation-controller";
import { queryClient } from '../query/client';
import { useRoles, useUser, useWorkspace, useLocalization } from "../query/hooks/app-hooks";
import { useClientsProjects, clientsProjectsQueryOptions } from "../query/hooks/project-hooks";
import { ClockifyWebComponentsApp } from "../clockify-app";

import "./clockify-input";
import "./clockify-tooltip";
import "./clockify-checkbox";
import "./clockify-dropdown";
import "./clockify-dialog";
import "./clockify-project-picker/client-projects";

class ClockifyProjectPicker extends LitElement {
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean }) addon = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) hideIcon = false;
  @property({ type: Boolean }) autoCreateProjectTaskByName = false;
  @property({ type: Boolean }) createProjectEnabled = true;
  @property({ type: Boolean }) createTaskEnabled = true;
  @property({ type: String }) timeentryid = "";
  @property({ type: String }) workspaceId = "";
  @property({ type: String }) token = "";
  @property({ type: String }) tokenkey = "";
  @property({ type: String }) tokensearchparam = "";
  @property({ type: String }) tokenheader = "";
  @property({ type: String }) homeurl = "";
  @property({ type: String }) homeurlkey = "";
  @property({ type: String }) endpoint = "";
  @property({ type: String }) syncPickedData: EmitType = EmitType.EMIT_EVENT_ONLY;
  @property({ type: String }) alignment: "left" | "right" = "left";
  @property({ type: String }) className = "";
  @property({ type: String }) customStyles = "";
  @property() onchange: (e: Event) => void = () => {};
  @property({ type: Object }) selectedProject: any = {};
  @property({ type: Object }) selectedClient: any = {};
  @property({ type: Object }) selectedTask: any = {};
  @property({ type: String }) projectId: string = "";
  @property({ type: String }) clientId: string = "";
  @property({ type: String }) taskId: string = "";
  @property({ type: String }) projectName: string = "";
  @property({ type: String }) taskName: string = "";
  @property({ type: String }) height = "300px";
  @property({ type: String }) width = "360px";

  @state() private loading = true;
  @state() private debounceTimeout: any = null;
  @state() private clients: any[] = [];
  @state() private projectsSearchString = "";
  @state() private debouncedProjectsSearchString = "";
  @state() private clientsSearchString = "";
  @state() private singleClientProjectsSearchString = "";
  private get favoriteProjects(): any[] {
    const favoritesClient = this.clientsProjects.find((c: any) => c.client.id === "favorites");
    return favoritesClient ? favoritesClient.projects : [];
  }
  @state() private createProjectClientsDropdownOpen = false;
  @state() private singleClientDialog: null | undefined | HTMLDialogElement = null;
  @state() private singleClient: any = {};
  @state() private colorPickerOpen = false;
  @state() private newProject = { ...DEFAULT_PROJECT };
  @state() private newTask = { ...DEFAULT_TASK };
  @state() private entityNames: any = DEFAULT_ENTITY_NAMES;
  @state() private isCreateProjectDialogOpen = false;
  @state() private isCreateTaskDialogOpen = false;
  @state() private isSingleClientDialogOpen = false;
  @state() private customColors: string[] = [];
  @state() private loadingProjectsForClientId: string | null = null;
  @state() private loadingTasksForProjectId: string | null = null;
  @state() private localization: LocalizationData = DEFAULT_LOCALES;

  @queryAsync(".dropdown.clients") clientsDropdown: any;

  private _searchInputRef = createRef<HTMLInputElement>();
  private _searchClientInputRef = createRef<HTMLInputElement>();
  private _createProjectButton = createRef<HTMLButtonElement>();
  private _createTaskButton = createRef<HTMLButtonElement>();
  private _lastUserData: any = null;
  private _lastWorkspaceData: any = null;


  private userQuery = useUser(this, () => ({ token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!this.endpoint }));
  private workspaceQuery = useWorkspace(this, () => ({ workspaceId: this.workspaceId || this.userQuery.data?.activeWorkspace, token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!(this.workspaceId || this.userQuery.data?.activeWorkspace) && !!this.endpoint }));
  private rolesQuery = useRoles(this, () => ({ workspaceId: this.activeWorkspaceId, userId: this.userQuery.data?.id, token: this.token, endpoint: this.endpoint }), () => ({ enabled: !!this.activeWorkspaceId && !!this.userQuery.data?.id }));
  private localizationQuery = useLocalization(this, () => this.endpoint, () => ({ enabled: !!this.endpoint }));

  get showFavorites() {
    return this.workspaceSettings.projectFavorites ?? false;
  }

  get clientsProjects() {
    return this.clientsProjectsQuery.data?.pages.flatMap((page: any) => page) || [];
  }

  get excludedProjects() {
    return this.selectedProject?.id && !this.selectedTask?.id ? [this.selectedProject?.id] : [];
  }

  get excludedTasks() {
    return this.selectedTask?.id ? [this.selectedTask?.id] : [];
  }

  private clientsProjectsQuery = useClientsProjects(
    this,
    () => ({
      searchString: this.debouncedProjectsSearchString,
      token: this.token,
      endpoint: this.endpoint,
      activeWorkspaceId: this.activeWorkspaceId,
      excludedProjects: this.excludedProjects,
      excludedTasks: this.excludedTasks,
      getPreparedProjects: (clients, favorites, search) => this.getPreparedProjects(clients, favorites, search)
    }),
    () => ({ enabled: !!this.activeWorkspaceId && !!this.endpoint })
  );

  private createProjectMutation = new MutationController(this, queryClient, {
    mutationFn: (body: string) => ProjectClientService.createProject(body, this.token, this.endpoint, this.activeWorkspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
    }
  });

  private createClientMutation = new MutationController(this, queryClient, {
    mutationFn: (body: string) => ProjectClientService.createClient(body, this.token, this.endpoint, this.activeWorkspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
    }
  });

  private createTaskMutation = new MutationController(this, queryClient, {
    mutationFn: ({ projectId, body }: { projectId: string; body: string }) => TaskService.createTask(projectId, body, this.token, this.endpoint, this.activeWorkspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
    }
  });

  private createProjectTaskMutation = new MutationController(this, queryClient, {
    mutationFn: (body: string) => ProjectClientService.getCreateProjectTask(body, this.token, this.endpoint, this.activeWorkspaceId),
    onSuccess: async (data: any) => {
      if (data && !data.project?.archived) {
        this.selectedClient = data.project?.client;
        this.selectedProject = data.project;
        this.selectedTask = data.task;
        await this.handleProjectPicked();
      }
    }
  });

  private updateTimeEntryMutation = new MutationController(this, queryClient, {
    mutationFn: async ({ type, body }: { type: 'remove' | 'project' | 'project-task', body?: string }) => {
      if (type === 'remove') return TimeEntryService.removeProject(this.timeentryid);
      if (type === 'project') return TimeEntryService.updateProject(this.timeentryid, body!);
      if (type === 'project-task') return TimeEntryService.updateProjectAndTask(this.timeentryid, body!);
    },
    onSuccess: (data: any) => {
      if (data?.id) this.dispatchChangeEvent();
    }
  });

  private readonly _boundHandleAppInit: any;
  private readonly _boundHandleGlobalError: any;
  private readonly _boundHandleGlobalSuccess: any;

  constructor() {
    super();
    this._boundHandleAppInit = this.handleAppInit.bind(this);
    this._boundHandleGlobalError = this.handleGlobalError.bind(this);
    this._boundHandleGlobalSuccess = this.handleGlobalSuccess.bind(this);
    this.createProject = this.createProject.bind(this);
    this.createClient = this.createClient.bind(this);
    this.createTask = this.createTask.bind(this);
    this.closeCreateProjectDialog = this.closeCreateProjectDialog.bind(this);
    this.closeCreateTaskDialog = this.closeCreateTaskDialog.bind(this);
    this.closeSingleClientDialog = this.closeSingleClientDialog.bind(this);
    this.handleHeaderClick = this.handleHeaderClick.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.quickCreateProject = this.quickCreateProject.bind(this);
    this.openNewProjectDialog = this.openNewProjectDialog.bind(this);
    this.toggleProjectsClientOpen = this.toggleProjectsClientOpen.bind(this);
  }

  static styles = [unsafeCSS(clockifyProjectSelectStyles)];

  get workspaceSettings() {
    return this.workspaceQuery.data?.workspaceSettings || {};
  }

  get userRoles() {
    return this.rolesQuery.data || [];
  }

  get userSettings() {
    return this.userQuery.data?.settings || {};
  }

  get projectIdListWhereUserIsProjectManager() {
    return this.userRoles?.find((roleData: { role: any }) => roleData.role === WorkspaceRole.PROJECT_MANAGER)?.entities?.map((x: { id: any }) => x.id) || [];
  }

  get isCreatingProjectsAllowed() {
    const roleList = this.userRoles?.map((roleData: { role: any }) => roleData.role) || [];
    const { whoCanCreateProjectsAndClients } = this.workspaceSettings?.entityCreationPermissions || {
      whoCanCreateProjectsAndClients: this.workspaceSettings?.onlyAdminsCreateProject ? PermissionEntity.ADMINS_AND_PROJECT_MANAGERS : PermissionEntity.EVERYONE,
    };

    return (
      (whoCanCreateProjectsAndClients === PermissionEntity.EVERYONE ||
        roleList.includes(WorkspaceRole.WORKSPACE_OWN) ||
        ((whoCanCreateProjectsAndClients === PermissionEntity.ADMINS || whoCanCreateProjectsAndClients === PermissionEntity.ADMINS_AND_PROJECT_MANAGERS) &&
          roleList.includes(WorkspaceRole.WORKSPACE_ADMIN)) ||
        (whoCanCreateProjectsAndClients === PermissionEntity.ADMINS_AND_PROJECT_MANAGERS && roleList.includes(WorkspaceRole.PROJECT_MANAGER))) &&
      !this.readonly
    );
  }

  get isCreatingTasksAllowed() {
    const roleList = this.userRoles?.map((roleData: { role: any }) => roleData.role) || [];
    const { whoCanCreateTasks } = this.workspaceSettings?.entityCreationPermissions || {
      whoCanCreateTasks: this.workspaceSettings?.onlyAdminsCreateTask ? PermissionEntity.ADMINS_AND_PROJECT_MANAGERS : PermissionEntity.EVERYONE,
    };

    return (
      (whoCanCreateTasks === PermissionEntity.EVERYONE ||
        roleList.includes(WorkspaceRole.WORKSPACE_OWN) ||
        ((whoCanCreateTasks === PermissionEntity.ADMINS || whoCanCreateTasks === PermissionEntity.ADMINS_AND_PROJECT_MANAGERS) &&
          roleList.includes(WorkspaceRole.WORKSPACE_ADMIN))) &&
      !this.readonly
    );
  }

  get isCreatingTasksAllowedForPMs() {
    const roleList = this.userRoles?.map((roleData: { role: any }) => roleData.role) || [];
    const { whoCanCreateTasks } = this.workspaceSettings?.entityCreationPermissions || {
      whoCanCreateTasks: this.workspaceSettings?.onlyAdminsCreateTask ? PermissionEntity.ADMINS_AND_PROJECT_MANAGERS : PermissionEntity.EVERYONE,
    };
    return whoCanCreateTasks === PermissionEntity.ADMINS_AND_PROJECT_MANAGERS && roleList.includes(WorkspaceRole.PROJECT_MANAGER) && !this.readonly;
  }

  get activeWorkspaceId() {
    return this.workspaceId || this.userQuery.data?.activeWorkspace;
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
    this.loading = true;

    if (config.token) this.token = config.token;
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.workspaceId) this.workspaceId = config.workspaceId;
    if (config.homeUrl) this.homeurl = config.homeUrl;
    if (config.addon !== undefined) this.addon = config.addon;

    if (config.workspaceId) {
      this.setEntityNames();
      this.resetPages();
      this.selectedClient = {};
      if (!(this.autoCreateProjectTaskByName && this.projectName)) {
        this.selectedProject = {};
        this.selectedTask = {};
      }
    }

    await this.updateComplete;
    await this.resetProjectTaskClient();

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
    await this.updateComplete;
    hotkeys("ctrl+Enter", () => {
      if (this.createProjectClientsDropdownOpen) {
        if (this.clientsSearchString && !this.clients.filter(({ name }) => name === this.clientsSearchString).length) {
          this.createClient();
        }
      } else {
        if (this.projectsSearchString && !this.clientsProjects.length && this.isCreatingProjectsAllowed) {
          this.quickCreateProject();
        }
      }
    });
    hotkeys("esc", () => {
      this.close();
    })
    document.addEventListener("click", async (event) => {
      const path = event.composedPath();
      if (!path.includes(this) && this.open) {
        await this.close();
      }
      const clientsDropdown = await this.clientsDropdown;
      if (this.createProjectClientsDropdownOpen && clientsDropdown) {
        if (!path.includes(clientsDropdown)) {
          this.createProjectClientsDropdownOpen = false;
        }
      }
    });
    toggleTheme(this, this.shadowRoot?.querySelector(".clockify-project-picker"));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    EventBus.removeEventListener("error", this._boundHandleGlobalError);
    EventBus.removeEventListener("success", this._boundHandleGlobalSuccess);
    EventBus.removeEventListener("clockify-app-init", this._boundHandleAppInit);
  }

  async willUpdate(_changedProperties: PropertyValues) {
    const autoCreateFlagTurnedOn = _changedProperties.has("autoCreateProjectTaskByName") && this.autoCreateProjectTaskByName;
    const namesChanged = _changedProperties.has("projectName") || _changedProperties.has("taskName");
    if (this.autoCreateProjectTaskByName && this.projectName && (namesChanged || autoCreateFlagTurnedOn)) {
      await this.getCreateProjectsTasks();
    }
  }

  async updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has("open") && !this.open) {
      this.resetPages();
    }
    const workspaceId = this.workspaceId || this.userQuery.data?.activeWorkspace;

    if (this.localizationQuery.data && this.localizationQuery.data !== this.localization) {
      this.localization = this.localizationQuery.data;
    }

    let userDataChanged = false;
    if (this.userQuery.data && this.userQuery.data !== this._lastUserData) {
      this._lastUserData = this.userQuery.data;
      userDataChanged = true;
      if (this.autoCreateProjectTaskByName && this.projectName) {
        await this.getCreateProjectsTasks();
      }
    }

    const workspaceIdChanged = _changedProperties.has("workspaceId") || (userDataChanged && this.userQuery.data?.activeWorkspace);

    if (workspaceId && (_changedProperties.has("token") || _changedProperties.has("endpoint") || workspaceIdChanged)) {
      WorkspaceService.setActiveWorkspace(workspaceId);
    }

    if (this.workspaceQuery.data && this.workspaceQuery.data !== this._lastWorkspaceData) {
      this._lastWorkspaceData = this.workspaceQuery.data;
      this.setEntityNames();
      if (this.autoCreateProjectTaskByName && this.projectName) {
        await this.getCreateProjectsTasks();
      }
    }

    const criticalProps = ["token", "tokenkey", "homeurl", "homeurlkey", "endpoint", "addon", "workspaceId", "projectId", "taskId", "clientId"];

    const needsReinitialization = criticalProps.some((prop) => _changedProperties.has(prop) && (this as any)[prop] !== undefined) || (workspaceIdChanged && !!this.projectId);

    if (needsReinitialization) {
      await this._handleCriticalPropertyChange(_changedProperties);
    }

    if (_changedProperties.has("timeentryid") && this.timeentryid) {
      this.loading = true;
      await this.setProjectInitially(this.timeentryid);
      this.loading = false;
    }

    if (_changedProperties.has("open") && this.open) {
      this._searchInputRef.value?.focus();
    }

    if (_changedProperties.has("createProjectClientsDropdownOpen") && this.createProjectClientsDropdownOpen) {
      this._searchClientInputRef.value?.focus();
    }

    await this.updateComplete;
  }

  get canQuicklyCreate() {
    const isSameAsSelected = this.userSettings?.projectPickerTaskFilter
      ? this.projectsSearchString.replace(/^@\s*/, "").trim().toLowerCase() === `${this.selectedTask?.name || ""} @ ${this.selectedProject?.name || ""}`.trim().toLowerCase()
      : this.projectsSearchString.trim().toLowerCase() === (this.selectedProject?.name || "").trim().toLowerCase();

    return (
      this.isCreatingProjectsAllowed &&
      this.projectsSearchString &&
      !this.clientsProjects.length &&
      !this.loading &&
      !isSameAsSelected &&
      ((this.isCreatingProjectsAllowed && !this.userSettings?.projectPickerTaskFilter) ||
        (this.userSettings?.projectPickerTaskFilter && this.projectsSearchString.includes("@") && !this.projectsSearchString.endsWith("@")))
    );
  }

  get taskFilterOnAndNotFound() {
    const isSameAsSelectedTask = this.selectedTask?.name && this.projectsSearchString.trim().toLowerCase() === this.selectedTask.name.trim().toLowerCase();
    return (
      this.userSettings?.projectPickerTaskFilter &&
      this.projectsSearchString &&
      !this.clientsProjects.length &&
      !this.loading &&
      !isSameAsSelectedTask &&
      (!this.projectsSearchString.includes("@") || this.projectsSearchString.endsWith("@"))
    );
  }

  private async _handleCriticalPropertyChange(_changedProperties: PropertyValues) {
    this.loading = true;

    if (_changedProperties.has("workspaceId")) {
      this.setEntityNames();
      this.resetPages();
      this.selectedClient = {};
      if (!(this.autoCreateProjectTaskByName && this.projectName)) {
        this.selectedProject = {};
        this.selectedTask = {};
      }
    }

    await this.resetProjectTaskClient();

    this.loading = false;
  }

  async refreshProjects() {
    await queryClient.invalidateQueries({ queryKey: ['clientsProjects'] });
  }

  getPreparedProjects(clients: any[] = [], favorites: any[] = [], search: string = "") {
    const collapsed = !(search && !search.includes("@") && (this.workspaceSettings?.forceTasks || this.userSettings?.projectPickerTaskFilter));
    const isTaskSearch = !!search && this.userSettings?.projectPickerTaskFilter && !search.includes("@");
    
    const currentFavorites = this.clientsProjects.find((c: any) => c.client.id === "favorites")?.projects || [];

    const preparedFavorites = favorites.map((project: any) => {
      const currentProject = currentFavorites.find((p: any) => p.id === project.id);
      const tasks = currentProject?.tasks?.length ? currentProject.tasks : (project.tasks ? [...project.tasks].reverse().sort((a: any, b: any) => {
        if (a.favorite === b.favorite) return 0;
        return a.favorite ? -1 : 1;
      }) : []);

      const hasTasksFromSearch = Array.isArray(project.tasks) && project.tasks.length > 0;
      const defaultCollapsed = collapsed ? true : !hasTasksFromSearch;
      return {
        ...project,
        collapsed: isTaskSearch ? !hasTasksFromSearch : (currentProject?.collapsed ?? (project.collapsed ?? defaultCollapsed)),
        tasks,
        page: 1,
      };
    });
    const favoriteClient = [
      {
        client: {
          id: "favorites",
          name: this.localization.FAVORITES_LABEL,
          collapsed: search ? false : preparedFavorites.length > 50,
        },
        projects: preparedFavorites,
        projectsCount: preparedFavorites.length,
      },
    ];
    const allClients = favorites.length && this.showFavorites ? [...favoriteClient, ...clients] : clients;
    return allClients.map(({ client, projects, projectsCount }: any) => {
      const currentClient = this.clientsProjects.find(({ client: thisClient }: any) => thisClient.id === (client.id || "without"));
      return {
        client: {
          ...client,
          collapsed: search ? false : (currentClient?.client?.collapsed ?? (!projects.length ? true : projects.length > 50)),
          id: client.id || "without",
        },
        projects:
          currentClient?.projectsCount > 50 && !projects?.length
            ? currentClient?.projects
            : projects.map((project: any) => {
                const currentProject = currentClient?.projects?.find((p: any) => p.id === project.id);
                const tasks = currentProject?.tasks?.length ? currentProject.tasks : (project.tasks ? [...project.tasks].reverse().sort((a: any, b: any) => {
                  if (a.favorite === b.favorite) return 0;
                  return a.favorite ? -1 : 1;
                }) : []);

                const hasTasksFromSearch = Array.isArray(project.tasks) && project.tasks.length > 0;
                const defaultCollapsed = collapsed ? true : !hasTasksFromSearch;
                return {
                  ...project,
                  collapsed: isTaskSearch ? !hasTasksFromSearch : (currentProject?.collapsed ?? (project.collapsed ?? defaultCollapsed)),
                  tasks,
                  page: 1,
                };
              }),
        projectsCount,
      };
    });
  }


  collapseProjects(projects: any[]) {
    if (!Array.isArray(projects)) {
      return [];
    }
    return projects.map((project: any) => ({
      ...project,
      collapsed: true,
    }));
  }

  expandProjects(projects: any[]) {
    if (!Array.isArray(projects)) {
      return [];
    }
    return projects.map((project: any) => ({
      ...project,
      collapsed: !(Array.isArray(project.tasks) && project.tasks.length > 0),
    }));
  }

  collapseClientsProjects() {
    const queryKey = clientsProjectsQueryOptions("", this.token, this.endpoint, this.activeWorkspaceId, this.excludedProjects, this.excludedTasks).queryKey;
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => {
          return page.map((clientData: any) => ({
            ...clientData,
            projects: this.collapseProjects(clientData.projects),
          }));
        }),
      };
    });

    if (this.debouncedProjectsSearchString) {
      const currentQueryKey = clientsProjectsQueryOptions(this.debouncedProjectsSearchString, this.token, this.endpoint, this.activeWorkspaceId, this.excludedProjects, this.excludedTasks).queryKey;
      queryClient.setQueryData(currentQueryKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => {
            return page.map((clientData: any) => ({
              ...clientData,
              projects: this.collapseProjects(clientData.projects),
            }));
          }),
        };
      });
    }
  }

  resetPages() {
    this.isSingleClientDialogOpen = false;
    this.singleClient = {};
    queryClient.setQueriesData({ queryKey: ['clientsProjects'] }, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((pageData: any) => {
          return pageData.map((clientData: any) => {
            return {
              ...clientData,
              page: 1,
              projects: clientData.projects.map((project: any) => ({
                ...project,
                page: 1,
                collapsed: true,
                tasks: []
              })),
            };
          });
        }),
      };
    });
  }

  async getSingleClientProjects(clientId: any, search: string = "", projectsPage = 1) {
    const isSingleClientDialogOpen = Object.keys(this.singleClient).length > 0;
    const excludedProjects = this.selectedProject?.id && !this.selectedTask?.id ? [this.selectedProject?.id] : [];
    const excludedTasks = this.selectedTask?.id ? [this.selectedTask?.id] : [];
    
    const projects = await queryClient.fetchQuery({
      queryKey: ['singleClientProjects', clientId, search, projectsPage, excludedProjects, excludedTasks, this.endpoint, this.activeWorkspaceId],
      queryFn: () => ProjectClientService.getSingleClientProjects(clientId, search, projectsPage, excludedProjects, excludedTasks, this.token, this.endpoint, this.activeWorkspaceId),
      staleTime: Infinity
    });

    const collapsed = !(search && !search.includes("@") && (this.workspaceSettings?.forceTasks || this.userSettings?.projectPickerTaskFilter));
    const collapsedProjects = collapsed ? this.collapseProjects(projects) : this.expandProjects(projects);
    if (isSingleClientDialogOpen) {
      const projects = projectsPage === 1 ? collapsedProjects : [...this.singleClient.projects, ...collapsedProjects];
      this.singleClient = {
        ...this.singleClient,
        projects: collapsed ? this.collapseProjects(projects) : this.expandProjects(projects),
      };
      this.requestUpdate("singleClient", this.singleClient);
    } else {
      const queryKey = clientsProjectsQueryOptions(this.debouncedProjectsSearchString, this.token, this.endpoint, this.activeWorkspaceId, this.excludedProjects, this.excludedTasks).queryKey;
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => {
            return page.map((clientData: any) => {
              if (clientData.client.id === clientId) {
                const newProjects = projectsPage === 1 ? collapsedProjects : uniqueBy([...clientData.projects, ...collapsedProjects], 'id');
                return {
                  ...clientData,
                  projects: newProjects,
                };
              }
              return clientData;
            });
          }),
        };
      });
    }
    return projects;
  }

  async getTasks(projectId: string, page: number = 1) {
    const excludedTasks = this.selectedTask?.id ? [this.selectedTask?.id] : [];
    const tasks = await queryClient.fetchQuery({
      queryKey: ['tasks', projectId, page, excludedTasks, this.endpoint, this.activeWorkspaceId],
      queryFn: () => TaskService.getTasks(projectId, page, excludedTasks, this.token, this.endpoint, this.activeWorkspaceId),
      staleTime: Infinity
    });
    const sortedTasks = [...tasks].reverse().sort((a: any, b: any) => {
      if (a.favorite === b.favorite) return 0;
      return a.favorite ? -1 : 1;
    });
    this.updateProjectTasks(projectId, sortedTasks, page);
    return sortedTasks;
  }

  async getClients() {
    const clients = await queryClient.fetchQuery({
      queryKey: ['clients', this.endpoint, this.activeWorkspaceId],
      queryFn: () => ProjectClientService.getClients(this.token, this.endpoint, this.activeWorkspaceId),
      staleTime: Infinity
    });
    this.clients = Array.isArray(clients) ? clients : [];
  }

  setEntityNames() {
    this.entityNames = {
      project: toCapital(this.workspaceSettings?.projectLabel) || DEFAULT_ENTITY_NAMES.project,
      task: toCapital(this.workspaceSettings?.taskLabel) || DEFAULT_ENTITY_NAMES.task,
      client: toCapital(this.workspaceSettings?.projectGroupingLabel) || DEFAULT_ENTITY_NAMES.client,
    };
  }

  async setProjectInitially(timeentryid: string) {
    if (!timeentryid) return;
    if (this.autoCreateProjectTaskByName && this.selectedProject?.id) return;
    
    const timeEntry = await queryClient.fetchQuery({
      queryKey: ['timeEntry', timeentryid, this.workspaceId, this.endpoint],
      queryFn: () => TimeEntryService.getTimeEntry(timeentryid, this.workspaceId, this.endpoint, this.token),
      staleTime: Infinity
    });

    if (!timeEntry) return;
    const { projectId, taskId } = timeEntry;
    if (!projectId) return;
    let project, client, task;
    
    project = await queryClient.fetchQuery({
      queryKey: ['project', projectId, this.activeWorkspaceId, this.endpoint],
      queryFn: () => ProjectClientService.getProjectById(projectId, this.token, this.endpoint, this.activeWorkspaceId),
      staleTime: Infinity
    });

    if (!project || !project.id) return;
    const { clientId } = project;
    if (clientId) {
      client = await queryClient.fetchQuery({
        queryKey: ['client', clientId, this.activeWorkspaceId, this.endpoint],
        queryFn: () => ProjectClientService.getClientById(clientId, this.token, this.endpoint, this.activeWorkspaceId),
        staleTime: Infinity
      });
    }
    if (taskId) {
      task = await queryClient.fetchQuery({
        queryKey: ['task', projectId, taskId, this.activeWorkspaceId, this.endpoint],
        queryFn: () => TaskService.getTaskById(projectId, taskId, this.token, this.endpoint, this.activeWorkspaceId),
        staleTime: Infinity
      });
    }
    this.selectedProject = project;
    this.selectedClient = client;
    this.selectedTask = task;
  }

  async resetProjectTaskClient() {
    if (this.autoCreateProjectTaskByName && this.selectedProject?.id) return;
    if (this.projectId) {
      const project = await queryClient.fetchQuery({
        queryKey: ['project', this.projectId, this.activeWorkspaceId, this.endpoint],
        queryFn: () => ProjectClientService.getProjectById(this.projectId, this.token, this.endpoint, this.activeWorkspaceId),
        staleTime: Infinity
      });

      if (project && project.id) {
        this.selectedProject = project;
        this.selectedClient = project?.client ?? {
          id: project?.clientId,
          name: project?.clientName,
        };
        if (this.taskId) {
          this.selectedTask = await queryClient.fetchQuery({
            queryKey: ['task', this.projectId, this.taskId, this.activeWorkspaceId, this.endpoint],
            queryFn: () => TaskService.getTaskById(this.projectId, this.taskId, this.token, this.endpoint, this.activeWorkspaceId),
            staleTime: Infinity
          });
        }
      }
    }
  }

  handleScroll(e: Event) {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    const BASELINE = el.getBoundingClientRect().top;
    const clients = el.getElementsByClassName("client");
    const projectHosts = Array.from(el.getElementsByTagName("client-projects"));
    let lastStickyClientHeader: HTMLElement | null = null;

    const allExpanded: HTMLElement[] = [];
    projectHosts.forEach((host: Element) => {
      (host as HTMLElement).classList.remove("has-sticky-project");
      const shadow = (host as any).shadowRoot as ShadowRoot | undefined;
      if (shadow) {
        shadow.querySelectorAll<HTMLElement>(".project-container.sticking").forEach((pc) => {
          pc.classList.remove("sticking");
          pc.style.transform = "translateY(0)";
        });
        const expanded = shadow.querySelectorAll<HTMLElement>(".project-container.expanded");
        if (expanded) allExpanded.push(...Array.from(expanded));
      }
    });

    let stickyEl: HTMLElement | null = null;
    let stickyIdx = -1;
    for (let i = 0; i < allExpanded.length; i++) {
      const projEl = allExpanded[i];
      if (projEl.getBoundingClientRect().top - BASELINE < 0) {
        stickyEl = projEl;
        stickyIdx = i;
      }
    }
    if (stickyEl) {
      stickyEl.classList.add("sticking");

      const next = allExpanded[stickyIdx + 1];
      let applyHostLift = true;
      if (next) {
        const stickyRect = stickyEl.getBoundingClientRect();
        const nextRect = next.getBoundingClientRect();
        if (nextRect.top <= BASELINE) {
          stickyEl.classList.remove("sticking");
          stickyEl.style.transform = "translateY(0)";
          applyHostLift = false;
        } else if (nextRect.top <= BASELINE + stickyRect.height) {
          stickyEl.style.transform = `translateY(${nextRect.top - BASELINE - stickyRect.height}px)`;
        } else {
          stickyEl.style.transform = "translateY(0)";
        }
      } else {
        stickyEl.style.transform = "translateY(0)";
      }
      if (applyHostLift) {
        const host = (stickyEl.getRootNode() as ShadowRoot)?.host as HTMLElement | undefined;
        if (host) host.classList.add("has-sticky-project");
      }
    }

    Array.from(clients).forEach((client, index) => {
      const nextClient = clients[index + 1];
      const clientRect = client.getBoundingClientRect();

      if (clientRect.top - BASELINE <= 0) {
        if (lastStickyClientHeader) {
          lastStickyClientHeader.classList.remove("sticking");
        }
        client.classList.add("sticking");
        lastStickyClientHeader = client as HTMLElement;
      }

      if (nextClient) {
        const nextClientRect = nextClient.getBoundingClientRect();
        if (nextClientRect.top <= BASELINE + clientRect.height) {
          // @ts-ignore
          client.style.transform = `translateY(${nextClientRect.top - BASELINE - clientRect.height}px)`;
        } else {
          // @ts-ignore
          client.style.transform = "translateY(0)";
        }
      }
    });
  }

  async handleLoadMore(loadMoreClientIds: Set<string>) {
    for (const id of loadMoreClientIds) {
      const entity = id.split("-")[0];
      if (entity === "client") {
        const idx = id.split("-")[1];
        const clientProjects = this.clientsProjects.find(({ client }: any) => client.id === idx);
        if ((clientProjects?.projects?.length ?? 0) < (clientProjects?.projectsCount ?? 0) && this.loadingProjectsForClientId !== idx) {
          const nextPage = (clientProjects.page || 1) + 1;
          this.loadingProjectsForClientId = idx;
          clientProjects.page = nextPage;
          await this.getSingleClientProjects(clientProjects.client.id, this.projectsSearchString, nextPage);
          this.loadingProjectsForClientId = null;
        }
      }
      if (entity === "project") {
        const idy = id.split("-")[1];
        const clientProjects = this.clientsProjects.find(({ projects }: any) => projects.find(({ id }: any) => id === idy));
        const project = clientProjects?.projects.find(({ id }: any) => id === idy);
        if (project && project.taskCount > (project.tasks?.length ?? 0) && this.loadingTasksForProjectId !== project.id) {
          const nextPage = (project.page || 1) + 1;
          this.loadingTasksForProjectId = project.id;
          project.page = nextPage;
          await this.getTasks(project.id, nextPage);
          this.loadingTasksForProjectId = null;
        }
      }
    }
  }

  async handleProjectPicked() {
    switch (this.syncPickedData) {
      case EmitType.EMIT_EVENT_ONLY:
        this.dispatchChangeEvent();
        break;
      case EmitType.SYNC_ON_CHANGE:
        await this.sendPickedProjectData();
        break;
      default:
        this.dispatchChangeEvent();
    }
  }

  async sendPickedProjectData() {
    if (!this.timeentryid) return;
    const projectId = this.selectedProject?.id || null;
    const taskId = this.selectedTask?.id || null;

    if (!projectId) {
      await this.updateTimeEntryMutation.mutate({ type: 'remove' });
      return;
    }

    if (!taskId) {
      const body = JSON.stringify({ projectId });
      await this.updateTimeEntryMutation.mutate({ type: "project", body });
      return;
    }

    const body = JSON.stringify({ projectId, taskId });
    await this.updateTimeEntryMutation.mutate({ type: "project-task", body });
  }

  dispatchChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          selectedProject: this.selectedProject,
          selectedTask: this.selectedTask,
          selectedClient: this.selectedClient,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  async handleSelect(project: any = {}, task: any = {}) {
    if (this.workspaceSettings?.forceTasks && project.taskCount === 0) return;
    this.resetPages();
    this.selectedProject = project;
    this.selectedClient = project.client;
    this.selectedTask = task;
    await this.handleProjectPicked();
    await this.close();
    this.singleClientDialog?.close();
  }

  async handleHeaderClick() {
    if (!this.disabled) {
      if (this.open) {
        await this.close();
      } else {
        this.open = true;
        this._searchInputRef.value?.focus();
      }
    }
  }

  async close() {
    this.open = false;
    this.collapseClientsProjects();
    this.clientsSearchString = "";
    this.isSingleClientDialogOpen = false;
    if (this.projectsSearchString || this.selectedProject?.id) {
      this.projectsSearchString = "";
      this.debouncedProjectsSearchString = "";
    }
  }

  async updateSingleClient(client: any) {
    if (!client.projects.length && client.projectsCount > 0) {
      client.projects = await this.getSingleClientProjects(client.client.id);
      client.projects = client.projects.map((project: any) => {
        return {
          ...project,
          collapsed: true,
        };
      });
    }
  }

  async toggleClientCollapse(id: any) {
    const queryKey = clientsProjectsQueryOptions(this.debouncedProjectsSearchString, this.token, this.endpoint, this.activeWorkspaceId, this.excludedProjects, this.excludedTasks).queryKey;
    const currentData = queryClient.getQueryData(queryKey) as any;
    let needsProjects = false;

    if (currentData?.pages) {
      for (const page of currentData.pages) {
        const clientData = page.find((c: any) => c.client.id === id);
        if (clientData && !clientData.projects.length && clientData.projectsCount > 0) {
          needsProjects = true;
          break;
        }
      }
    }

    if (needsProjects) {
      await this.getSingleClientProjects(id);
    }

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => {
          return page.map((clientData: any) => {
            if (clientData.client.id === id) {
              return {
                ...clientData,
                client: {
                  ...clientData.client,
                  collapsed: !clientData.client.collapsed,
                },
              };
            }
            return clientData;
          });
        }),
      };
    });
  }

  async fetchInitialSingleClientProjects(id: any) {
    const newClientsProjects = [...this.clientsProjects];
    const singleClient = newClientsProjects.find(({ client }) => client.id === id);
    await this.updateSingleClient(singleClient);
  }

  debounceGetClientsProjects() {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.debouncedProjectsSearchString = this.projectsSearchString;
    }, 350);
  }

  debounceGetSingleClientProjects(clientId: any, search: string = "", page = 1) {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(async () => {
      const singleClient = this.clientsProjects.find(({ client }: any) => client.id === clientId);
      singleClient.page = search ? 1 : page;
      await this.getSingleClientProjects(clientId, search, page);
    }, 350);
  }

  async toggleProjectCollapse(e: Event, clientId: any, projectId: string) {
    e.stopPropagation();
    const isSingleClientDialogOpen = Object.keys(this.singleClient).length > 0;
    if (isSingleClientDialogOpen) {
      const project = this.singleClient.projects.find((p: any) => p.id === projectId);
      if (project && project.collapsed && !project.tasks?.length && project.taskCount > 0) {
        await this.getTasks(projectId);
      }

      this.singleClient = {
        ...this.singleClient,
        projects: this.singleClient.projects.map((project: any) => {
          if (project.id === projectId) {
            return { ...project, collapsed: !project.collapsed };
          }
          return project;
        }),
      };
      this.requestUpdate("singleClient", this.singleClient);
    } else {
      const queryKey = clientsProjectsQueryOptions(this.debouncedProjectsSearchString, this.token, this.endpoint, this.activeWorkspaceId, this.excludedProjects, this.excludedTasks).queryKey;
      const currentData = queryClient.getQueryData(queryKey) as any;
      let needsTasks = false;

      if (currentData?.pages) {
        for (const page of currentData.pages) {
          for (const clientData of page) {
            if (clientData.client.id === clientId) {
              const project = clientData.projects.find((p: any) => p.id === projectId);
              if (project && !project.tasks?.length && project.taskCount > 0 && project.collapsed) {
                needsTasks = true;
              }
            }
          }
        }
      }

      if (needsTasks) {
        await this.getTasks(projectId);
      }

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => {
            return page.map((clientData: any) => {
              if (clientData.client.id === clientId) {
                return {
                  ...clientData,
                  projects: clientData.projects.map((project: any) => {
                    if (project.id === projectId) {
                      const newCollapsed = !project.collapsed;
                      let newTasks = project.tasks;
                      if (!newCollapsed && newTasks) {
                        newTasks = [...newTasks].reverse().sort((a: any, b: any) => {
                          if (a.favorite === b.favorite) return 0;
                          return a.favorite ? -1 : 1;
                        });
                      }
                      return { ...project, collapsed: newCollapsed, tasks: newTasks };
                    }
                    return project;
                  }),
                };
              }
              return clientData;
            });
          }),
        };
      });
    }
  }

  updateProjectTasks(projectId: string, tasks: any[], page: number = 1, projectUpdates?: any) {
    const queryKey = clientsProjectsQueryOptions(this.debouncedProjectsSearchString, this.token, this.endpoint, this.activeWorkspaceId, this.excludedProjects, this.excludedTasks).queryKey;

    const isSingleClientDialogOpen = Object.keys(this.singleClient).length > 0;
    if (isSingleClientDialogOpen) {
      this.singleClient = {
        ...this.singleClient,
        projects: this.singleClient.projects.map((project: any) => {
          if (project.id === projectId) {
            project = { ...project, ...projectUpdates };
            project.tasks = page === 1 ? tasks : uniqueBy([...project.tasks, ...tasks], 'id');
          }
          return project;
        }),
      };
      this.requestUpdate("singleClient", this.singleClient);
    } else {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;

        let projectToAdd: any = null;
        if (projectUpdates?.favorite === true) {
          for (const pageData of oldData.pages) {
            for (const clientData of pageData) {
              const found = clientData.projects.find((p: any) => p.id === projectId);
              if (found) {
                projectToAdd = found;
                break;
              }
            }
            if (projectToAdd) break;
          }
        }

        return {
          ...oldData,
          pages: oldData.pages.map((pageData: any) => {
            return pageData.map((clientData: any) => {
              // Handle Favorites group updates
              if (clientData.client.id === "favorites") {
                if (projectUpdates?.favorite === true && projectToAdd) {
                  const alreadyExists = clientData.projects.some((p: any) => p.id === projectId);
                  if (!alreadyExists) {
                    return {
                      ...clientData,
                      projects: [...clientData.projects, { ...projectToAdd, ...projectUpdates, tasks: page === 1 ? tasks : uniqueBy([...(projectToAdd.tasks || []), ...tasks], 'id') }],
                      projectsCount: clientData.projectsCount + 1
                    };
                  }
                } else if (projectUpdates?.favorite === false) {
                  return {
                    ...clientData,
                    projects: clientData.projects.filter((p: any) => p.id !== projectId),
                    projectsCount: Math.max(0, clientData.projectsCount - 1)
                  };
                }
              }

              const hasProject = clientData.projects.some((p: any) => p.id === projectId);
              if (hasProject) {
                return {
                  ...clientData,
                  projects: clientData.projects.map((project: any) => {
                    if (project.id === projectId) {
                      return {
                        ...project,
                        ...projectUpdates,
                        tasks: page === 1 ? tasks : uniqueBy([...(project.tasks || []), ...tasks], 'id'),
                      };
                    }
                    return project;
                  }),
                };
              }
              return clientData;
            });
          }),
        };
      });
    }
  }

  openNewProjectDialog() {
    this.newProject = {
      ...this.newProject,
      taskName: this.taskFilterOnAndNotFound ? this.projectsSearchString : "",
      color: presetColors[Math.floor(Math.random() * presetColors.length)],
      isPublic: this.workspaceSettings.isProjectPublicByDefault,
      billable: this.workspaceSettings.defaultBillableProjects,
    };
    this.isCreateProjectDialogOpen = true;
  }

  async toggleProjectsClientOpen() {
    this.createProjectClientsDropdownOpen = !this.createProjectClientsDropdownOpen;
    await this.getClients();
  }

  openNewTaskDialog(projectId: string) {
    this.isCreateTaskDialogOpen = true;
    this.newTask.projectId = projectId;
  }

  getQuickCreateSubject() {
    if (this.userSettings.projectPickerTaskFilter) {
      if (this.projectsSearchString.startsWith("@")) {
        const projectName = this.projectsSearchString.substring(1);
        return t(this.localization?.["CREATE_PROJECT_WITH_PARAM_LABEL"], {
          project: projectName,
          projectLabel: getEntityLabel(this.entityNames.project),
        });
      } else {
        if (this.projectsSearchString.includes("@")) {
          const taskAndProject = this.projectsSearchString.split("@");
          const taskName = taskAndProject[0];
          const projectName = taskAndProject[1];
          return t(this.localization?.["CREATE_TASK_WITH_PARAM_LABEL"], {
            task: taskName,
            project: projectName,
            taskLabel: getEntityLabel(this.entityNames.task),
            projectLabel: getEntityLabel(this.entityNames.project),
          });
        }
      }
    } else {
      return `create '${this.projectsSearchString}' ${this.entityNames.project}`;
    }
  }

  async createProject() {
    const body = JSON.stringify({
      ...this.newProject,
      name: this.newProject.name,
      clientId: this.newProject.client.id,
    });
    const project = await this.createProjectMutation.mutateAsync(body);
    if (!project) return;
    if (this.newProject.taskName) {
      const body = JSON.stringify({
        name: this.newProject.taskName,
      });
      const task = await this.createTaskMutation.mutateAsync({ projectId: project.id, body });
      if (task) {
        this.selectedTask = task;
      }
    }
    if (!this.workspaceSettings.forceTasks) {
      this.resetPages();
      this.selectedProject = project;
      this.selectedClient = {
        ...DEFAULT_PROJECT.client,
        id: this.selectedProject.clientId,
        name: this.selectedProject.clientName,
      };
      if (!this.newProject.taskName) {
        this.selectedTask = {};
      }
      await this.handleProjectPicked();
      this.closeCreateProjectDialog();
    }
    this.projectsSearchString = "";
    this.closeCreateProjectDialog();
    await this.close();
  }

  async quickCreateProject() {
    let projectName = "";
    let taskName = "";
    if (this.userSettings.projectPickerTaskFilter) {
      if (this.projectsSearchString.startsWith("@")) {
        projectName = this.projectsSearchString.substring(1);
      } else {
        if (this.projectsSearchString.includes("@") && !this.projectsSearchString.endsWith("@")) {
          const taskAndProject = this.projectsSearchString.split("@");
          taskName = taskAndProject[0];
          projectName = taskAndProject[1];
        }
      }
    } else {
      projectName = this.projectsSearchString;
    }
    const body = JSON.stringify({
      ...this.newProject,
      name: projectName,
      clientId: this.newProject.client.id,
      isPublic: this.workspaceSettings.isProjectPublicByDefault,
      billable: this.workspaceSettings.defaultBillableProjects,
    });
    const project = await this.createProjectMutation.mutateAsync(body);
    if (!project) return;
    if (taskName) {
      const body = JSON.stringify({
        name: taskName,
      });
      const task = await this.createTaskMutation.mutateAsync({ projectId: project.id, body });
      if (task) {
        this.selectedTask = task;
      }
    }
    if (!this.workspaceSettings.forceTasks) {
      this.resetPages();
      this.selectedProject = project;
      this.selectedClient = {
        ...DEFAULT_PROJECT.client,
        id: this.selectedProject.clientId,
        name: this.selectedProject.clientName,
      };
      if (!taskName) {
        this.selectedTask = {};
      }
      await this.handleProjectPicked();
    }
    this.projectsSearchString = "";
    await this.close();
  }

  async createTask() {
    const body = JSON.stringify(this.newTask);
    const newTask = await this.createTaskMutation.mutateAsync({ projectId: this.newTask.projectId, body });
    if (newTask) {
      this.resetPages();
      const selectedClientProjects = this.clientsProjects
        .filter(({ client }: any) => client.id !== "favorites")
        .find(({ projects }: any) => projects.find(({ id }: any) => id === newTask.projectId));
      this.selectedClient = selectedClientProjects?.client || {};
      this.selectedProject = selectedClientProjects?.projects?.find(({ id }: any) => id === newTask.projectId) || {};
      this.selectedTask = newTask;
      this.closeCreateTaskDialog();
      await this.handleProjectPicked();
      await this.close();
      this.clientsProjects.forEach(({ projects }: any) => {
        projects.forEach((project: any) => {
          if (project.id === newTask.projectId) {
            this.selectedProject = project;
            this.selectedClient = project.client;
          }
        });
      });
      await this.getTasks(newTask.projectId);
    }
  }

  async getCreateProjectsTasks() {
    if (!this.autoCreateProjectTaskByName || !this.projectName) return;
    if (this.createProjectTaskMutation.isPending) return;

    await this.createProjectTaskMutation.mutate(
      JSON.stringify({
        projectName: this.projectName,
        taskName: this.taskName || undefined,
        createProjectEnabled: this.createProjectEnabled,
        createTaskEnabled: this.createTaskEnabled,
      })
    );
  }

  async createClient() {
    const body = JSON.stringify({
      name: this.clientsSearchString,
    });
    const data = await this.createClientMutation.mutateAsync(body);
    if (data) {
      this.newProject = {
        ...this.newProject,
        client: data,
        isPublic: this.workspaceSettings.isProjectPublicByDefault,
        billable: this.workspaceSettings.defaultBillableProjects,
      };
      this.createProjectClientsDropdownOpen = false;
      this.clientsSearchString = "";
    }
  }

  async selectSingleClient(e: Event, clientId: any) {
    e.stopPropagation();
    const singleClient = this.clientsProjects.find(({ client: { id } }: any) => id === clientId) ?? {};
    this.singleClient = Object.assign(
      {},
      {
        ...singleClient,
        projects: this.collapseProjects(singleClient.projects),
      }
    );
    await this.fetchInitialSingleClientProjects(clientId);
    this.isSingleClientDialogOpen = true;
  }

  get requiredProject() {
    return !this.readonly && this.workspaceSettings?.forceProjects && !this.selectedProject?.id;
  }

  get requiredTask() {
    return !this.readonly && this.workspaceSettings?.forceTasks && !this.selectedTask?.id;
  }

  get required() {
    return this.requiredProject || this.requiredTask;
  }

  closeCreateProjectDialog() {
    this.isCreateProjectDialogOpen = false;
    this.newProject = {
      ...DEFAULT_PROJECT,
      isPublic: this.workspaceSettings.isProjectPublicByDefault,
      billable: this.workspaceSettings.defaultBillableProjects,
    };
    this.clientsSearchString = "";
  }

  closeCreateTaskDialog() {
    this.isCreateTaskDialogOpen = false;
    this.newTask = { ...DEFAULT_TASK };
  }

  closeSingleClientDialog() {
    this.isSingleClientDialogOpen = false;
    setTimeout(() => {
      this.singleClient = {};
      this.singleClientProjectsSearchString = "";
    }, 300);
  }

  render() {
    return html`
            <div class=${classMap({
              "clockify-project-picker": true,
              "open": this.open,
              "disabled": this.disabled,
            })}
            >
      <clockify-tooltip ?disabled=${(!this.selectedProject?.name && !this.selectedTask?.name && !this.selectedClient?.name) || this.open} placement="bottom" content=${`${this.selectedProject?.name ? `Project: ${this.selectedProject.name}` : ""}\n${this.selectedClient?.name ? `Client: ${this.selectedClient.name} ` : ""}${this.selectedTask?.name ? `Task: ${this.selectedTask.name}` : ""}`.trim()}>
                <div
                    class="header"
                    tabindex="0"
                    part="header"
                    @keyup="${async (e: KeyboardEvent) => {
                      if (e.key === "Enter") {
                        await this.handleHeaderClick();
                      }
                    }}"
                    @click="${this.handleHeaderClick}"
                >
                  ${
                    this.selectedProject?.name
                      ? html`<svg width="6px" height="6px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <circle fill="${this.selectedProject?.color || "#333"}" cx="50" cy="50" r="50" />
                        </svg>`
                      : nothing
                  }
                    ${
                      this.selectedProject?.name
                        ? html` <div style="color: ${this.selectedProject?.color || "#333"};" class="title">
                              ${`${this.selectedProject?.name}${this.selectedTask?.name ? `: ${this.selectedTask?.name}` : ""}`}
                            </div>
                            ${this.selectedClient?.name ? html`<div class="client"> ${`- ${this.selectedClient?.name}`} </div>` : nothing}`
                        : html` <clockify-button class="link" variant="text" size="small">
                            ${!this.hideIcon
                              ? html`<span class=${classMap({
                                  "add-icon": true,
                                  "required": this.required,
                                })}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
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
                                </span>`
                              : nothing}
                            <span
                              >${this.userSettings.projectPickerTaskFilter
                                ? `${getEntityLabel(this.entityNames.task)} @${getEntityLabel(this.entityNames.project)}`
                                : this.requiredTask
                                  ? getEntityLabel(this.entityNames.task)
                                  : getEntityLabel(this.entityNames.project)}</span
                            >
                          </clockify-button>`
                    }
                </div>
            </clockify-tooltip>
                <div id="projects" part="overlay" class=${classMap({
                  "projects": true,
                  "alignment-left": this.alignment === "left",
                  "alignment-right": this.alignment === "right",
                  "new-projects-disallowed": !this.isCreatingProjectsAllowed,
                })} style=${`height: ${this.height}; width: ${this.width};`} >
                    <div class="projects-header">
                        <div class="search-box">
                          <clockify-input
                              type="text"
                              class="clockify-input"
                              autocomplete="off"
                              placeholder="${
                                this.userSettings.projectPickerTaskFilter
                                  ? t(this.localization.SEARCH_TASK_CUSTOM_LABEL, {
                                      taskLabel: getEntityLabel(this.entityNames.task),
                                      projectLabel: getEntityLabel(this.entityNames.project),
                                      projectGroupingLabel: getEntityLabel(this.entityNames.client),
                                    })
                                  : t(this.localization?.["SEARCH_PROJECT_CUSTOM_LABEL_NO_DOTS"], {
                                      projectLabel: getEntityLabel(this.entityNames.project),
                                      projectGroupingLabel: getEntityLabel(this.entityNames.client),
                                    })
                              }"
                              .value="${this.projectsSearchString}"
                              @input=${(e: InputEvent) => {
                                this.projectsSearchString = (e.target as HTMLInputElement).value;
                                this.debounceGetClientsProjects();
                              }}
                              ${ref(this._searchInputRef)}
                              autofocus
                            >
                            ${
                              this.loading
                                ? html`<svg class="loading" width="20" height="20" slot="prefix" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <style>
                                      .spinner_path {
                                        stroke: var(--clockify-gray-400);
                                        transform-origin: center;
                                        animation: spinner_animation 2s linear infinite;
                                      }

                                      @keyframes spinner_animation {
                                        0% {
                                          stroke-dasharray: 1, 200;
                                          stroke-dashoffset: 0;
                                          transform: rotate(0);
                                        }
                                        50% {
                                          stroke-dasharray: 100, 200;
                                          stroke-dashoffset: -15;
                                          transform: rotate(450deg);
                                        }
                                        100% {
                                          stroke-dasharray: 100, 200;
                                          stroke-dashoffset: -125;
                                          transform: rotate(1080deg);
                                        }
                                      }
                                    </style>
                                    <circle class="spinner_path" cx="10" cy="10" r="8" fill="none" stroke-width="1"></circle>
                                  </svg>`
                                : html`<svg class="search" width="20" height="20" slot="prefix" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      fill-rule="evenodd"
                                      clip-rule="evenodd"
                                      d="M19.975 19.275L14.675 13.975C17.575 10.675 17.475 5.575 14.375 2.475C11.075 -0.825 5.775 -0.825 2.475 2.475C-0.825 5.775 -0.825 11.075 2.475 14.375C5.675 17.575 10.675 17.675 13.975 14.675L19.275 19.975L19.975 19.275ZM3.175 13.575C0.275 10.675 0.275 5.975 3.175 3.075C6.075 0.175 10.775 0.175 13.675 3.075C16.575 5.975 16.575 10.675 13.675 13.575C10.775 16.475 6.075 16.475 3.175 13.575Z"
                                      fill="var(--clockify-gray-400)" />
                                  </svg>`
                            }
                              ${
                                this.projectsSearchString
                                  ? html`<svg
                                      class="close"
                                      slot="suffix"
                                      tabindex="0"
                                      @click="${async () => {
                                        this.projectsSearchString = "";
                                        this.debouncedProjectsSearchString = "";
                                      }}"
                                      @keyup="${async (e: any) => {
                                        if (e.key === "Enter") {
                                          this.projectsSearchString = "";
                                          this.debouncedProjectsSearchString = "";
                                        }
                                      }}"
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg">
                                      <path
                                        fill-rule="evenodd"
                                        clip-rule="evenodd"
                                        d="M12 0.7L11.3 0L6 5.3L0.7 0L0 0.7L5.3 6L0 11.3L0.7 12L6 6.7L11.3 12L12 11.3L6.7 6L12 0.7Z"
                                        fill="var(--clockify-text-lightest)" />
                                    </svg>`
                                  : nothing
                              }
                            </clockify-input>
                        </div>
                    </div>

                    <div @scroll="${this.handleScroll}"
                        class=${classMap({
                          "projects-container": true,
                        })}>
                        ${
                          this.selectedProject?.id && !this.workspaceSettings?.forceProjects && !this.projectsSearchString
                            ? html` <div
                                class="project-container no-project"
                                data-value=""
                                role="button"
                                tabindex="0"
                                @keyup="${async (e: KeyboardEvent) => {
                                  if (e.key === "Enter") {
                                    await this.handleSelect();
                                  }
                                }}"
                                @click="${() => this.handleSelect()}">
                                <div class="left">
                                  <div class="text">${t(this.localization?.NO_ENTITY_LABEL, { entity: getEntityLabel(this.entityNames.project) })}</div>
                                </div>
                              </div>`
                            : nothing
                        }
                        ${this.clientsProjects.length === 0 && !this.selectedProject?.id && !this.projectsSearchString && !this.loading ? html`<div class="project-container no-hover">${t(this.localization?.NO_ENTITIES_YET_LABEL, { entityInPlural: getEntityLabel(this.entityNames.project, true) })}</div>` : nothing}
                        ${
                          this.projectsSearchString && !this.clientsProjects.length && !this.loading
                            ? html`<div class="project-container no-hover">
                                ${this.userSettings?.projectPickerTaskFilter && !this.projectsSearchString.includes("@")
                                  ? html`<div class="no-match"
                                      >${t(this.localization?.NO_MATCHING_ENTITIES_LABEL, {
                                        entityInPlural: getEntityLabel(this.entityNames.task, true),
                                      })}</div
                                    >`
                                  : html`<div class="no-match"
                                      >${t(this.localization?.NO_MATCHING_ENTITIES_LABEL, {
                                        entityInPlural: getEntityLabel(this.entityNames.project, true),
                                      })}</div
                                    >`}
                                ${this.canQuicklyCreate
                                  ? html`<div class="quick-create-project">
                                      ${this.localization?.CREATE_ENTITY_LABEL}
                                      <clockify-button class="link" variant="text" size="small" @click="${this.quickCreateProject}">
                                        ${this.getQuickCreateSubject()}</clockify-button
                                      >
                                    </div>`
                                  : nothing}
                                ${this.taskFilterOnAndNotFound && this.canQuicklyCreate
                                  ? html`<div class="quick-create-project"
                                      >${t(this.localization?.TYPE_TO_CREATE_CUSTOM_PLACEHOLDER, {
                                        taskLabel: getEntityLabel(this.entityNames.task),
                                        projectLabel: getEntityLabel(this.entityNames.project),
                                      })}</div
                                    >`
                                  : nothing}
                              </div>`
                            : nothing
                        }
                        ${
                          !this.clientsProjects?.length && this.loading
                            ? nothing
                            : this.clientsProjects.map(({ client, projects, projectsCount }: any) => {
                                return html`
                                  <div class="client">
                                    <div class="left">
                                      <span class="name"
                                        >${client.name ||
                                        t(this.localization?.NO_ENTITY_LABEL, {
                                          entity: getEntityLabel(this.entityNames.client),
                                        })}</span
                                      >
                                    </div>
                                    <div class="right">
                                      <span
                                        class="${classMap({
                                          quantity: true,
                                          collapsed: client.collapsed,
                                        })}"
                                        tabindex="0"
                                        @keyup="${async (e: KeyboardEvent) => {
                                          if (e.key === "Enter") {
                                            await this.toggleClientCollapse(client.id);
                                          }
                                        }}"
                                        @click="${() => this.toggleClientCollapse(client.id)}">
                                        <span>${projectsCount} ${getEntityLabel(this.entityNames.project, projectsCount !== 1)}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none">
                                          <path
                                            d="M5.48011 0.359492C5.21495 0.0943222 4.78505 0.0943223 4.51989 0.359492L0.19887 4.68051C-0.0663004 4.94566 -0.0663003 5.37557 0.19887 5.64073C0.46403 5.90589 0.89394 5.90589 1.15909 5.64073L5 1.79983L8.84091 5.64073C9.10606 5.90589 9.53597 5.90589 9.80112 5.64073C10.0663 5.37557 10.0663 4.94566 9.80112 4.68051L5.48011 0.359492Z"
                                            fill="var(--clockify-gray-400)" />
                                        </svg>
                                      </span>
                                      <svg
                                        tabindex="0"
                                        role="button"
                                        @keyup="${async (e: KeyboardEvent) => {
                                          if (e.key === "Enter") {
                                            await this.selectSingleClient(e, client.id);
                                          }
                                        }}"
                                        @click="${(e: Event) => this.selectSingleClient(e, client.id)}"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16">
                                        <path
                                          fill-rule="evenodd"
                                          clip-rule="evenodd"
                                          d="M5 4H2C0.895431 4 0 4.89543 0 6V14C0 15.1046 0.895431 16 2 16H10C11.1046 16 12 15.1046 12 14V11H11V14C11 14.5523 10.5523 15 10 15H2C1.44772 15 1 14.5523 1 14V6C1 5.44772 1.44772 5 2 5H5V4Z"
                                          fill="var(--clockify-gray-400)" />
                                        <path
                                          fill-rule="evenodd"
                                          clip-rule="evenodd"
                                          d="M6 0C4.89543 0 4 0.895431 4 2H5C5 1.44772 5.44772 1 6 1H14C14.5523 1 15 1.44772 15 2V10C15 10.5523 14.5523 11 14 11V12C15.1046 12 16 11.1046 16 10V2C16 0.895431 15.1046 0 14 0H6Z"
                                          fill="var(--clockify-gray-400)" />
                                        <path
                                          d="M7.07929 4.90557C7.16276 4.99765 7.30869 5.06617 7.4755 5.06182L10.2288 5.05858L3.14915 12.1434C2.93712 12.3554 3.00371 12.7047 3.14235 12.8433C3.3503 13.0513 3.63028 13.0486 3.84231 12.8365L10.9353 5.75815L10.9353 8.52399C10.9339 8.66398 11.0029 8.8832 11.1623 8.98856C11.3216 9.09392 11.5905 9.05884 11.7551 8.9828C11.8257 8.91212 11.9342 8.64507 11.9263 8.51436L11.9419 4.63025C11.9419 4.43592 11.9236 4.32633 11.785 4.1877C11.7156 4.11838 11.5558 4.05858 11.3454 4.06186L7.4755 4.06182C7.26291 4.06386 7.18563 4.13121 7.07929 4.23755C6.86726 4.44958 6.92112 4.7311 7.07929 4.90557Z"
                                          fill="var(--clockify-gray-400)" />
                                      </svg>
                                    </div>
                                  </div>
                                  ${client.collapsed
                                    ? nothing
                                    : html`
                                  <client-projects
                                    .entityNames="${this.entityNames}"
                                    .token="${this.token}"
                                    .endpoint="${this.endpoint}"
                                    .workspaceId="${this.activeWorkspaceId}"
                                    .clientObject="${{
                                      client,
                                      projects,
                                      projectsCount,
                                    }}"
                                    .workspaceSettings="${this.workspaceSettings}"
                                    .userSettings="${this.userSettings}"
                                    .localization="${this.localization}"
                                    .selectedProject="${this.selectedProject}"
                                    .selectedTask="${this.selectedTask}"
                                    .isCreatingProjectsAllowed="${this.isCreatingProjectsAllowed}"
                                    .isCreatingTasksAllowed="${this.isCreatingTasksAllowed}"
                                    .isCreatingTasksAllowedForPMs="${this.isCreatingTasksAllowedForPMs}"
                                    .projectIdListWhereUserIsProjectManager="${this.projectIdListWhereUserIsProjectManager}"
                                    .favoriteProjects="${this.favoriteProjects}"
                                    .loadingProjectsForClientId="${this.loadingProjectsForClientId}"
                                    .loadingTasksForProjectId="${this.loadingTasksForProjectId}"
                                    ?isSingleClientDialogOpen="${this.isSingleClientDialogOpen}"
                                    .showFavorites="${this.showFavorites}"
                                    .userId="${this.userQuery.data?.id}"
                                    @toggle-project-collapse="${async ({ detail }: any) => {
                                      await this.toggleProjectCollapse(detail.e, detail.clientId, detail.projectId);
                                    }}"
                                    @update-project-tasks="${({ detail }: any) => {
                                      this.updateProjectTasks(detail.projectId, detail.tasks, 1, detail.projectUpdates);
                                    }}"
                                    @select-project-task="${async ({ detail }: any) => {
                                      await this.handleSelect(detail.project, detail.task);
                                    }}"
                                    @open-task-dialog="${({ detail }: any) => {
                                      this.openNewTaskDialog(detail.projectId);
                                    }}"
                                    @update-favorite-projects="${async () => {
                                      await this.refreshProjects();
                                    }}"
                                    @load-more="${async ({ detail }: any) => {
                                      await this.handleLoadMore(detail.loadMoreClientIds);
                                    }}"
                                  ></client-projects>
                                  </div>`}
                                `;
                              })
                        }
                    </div>
                    ${
                      this.isCreatingProjectsAllowed
                        ? html`<div class="create-project">
                            <clockify-button class="link" variant="text" size="small" tabindex="0" @click="${this.openNewProjectDialog}">
                              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
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
                              <span
                                >${this.taskFilterOnAndNotFound
                                  ? t(this.localization.CREATE_NEW_PROJ_TASK_CUSTOM_LABEL, {
                                      projectLabel: getEntityLabel(this.entityNames.project),
                                      taskLabel: getEntityLabel(this.entityNames.task),
                                    })
                                  : t(this.localization.CREATE_NEW_CUSTOM_LABEL, {
                                      label: getEntityLabel(this.entityNames.project),
                                    })}</span
                              >
                            </clockify-button>
                          </div>`
                        : nothing
                    }
                    </div>
                </div>
            </div>
            <clockify-dialog
              id="create-project-dialog"
              label="${t(this.localization.CREATE_NEW_CUSTOM_LABEL, {
                label: getEntityLabel(this.entityNames.project),
              })}"
              ?open="${this.isCreateProjectDialogOpen}"
              @sl-hide="${() => this.closeCreateProjectDialog()}"
              @keyup="${(e: KeyboardEvent) => {
                if (e.key === "Enter" && !(this.isCreateProjectDialogOpen || this.createProjectClientsDropdownOpen)) {
                  this._createProjectButton?.value?.click();
                }
              }}"
              modal
            >
                <div class="dialog-content">
                    <clockify-input
                        type="text"
                        autofocus
                        placeholder="${t(this.localization.ENTER_CUSTOM_NAME_PLACEHOLDER, {
                          projectLabel: getEntityLabel(this.entityNames.project),
                        })}"
                        .value=${this.newProject.name}
                        @input="${(e: InputEvent) => {
                          this.newProject = {
                            ...this.newProject,
                            name: (e.target as HTMLInputElement).value,
                          };
                        }}"
                        @keyup="${(e: KeyboardEvent) => {
                          if (e.key === "Enter") {
                            this._createProjectButton.value?.click();
                          }
                        }}"
                    ></clockify-input>
                    <div class="${classMap({ dropdown: true, clients: true, open: this.createProjectClientsDropdownOpen })}">
                        <div tabindex="0" class="header" @click="${this.toggleProjectsClientOpen}">
                            ${
                              this.newProject?.client?.id
                                ? this.newProject?.client?.name
                                : t(this.localization.SELECT_LABEL, {
                                    label: getEntityLabel(this.entityNames.client),
                                  })
                            }
                        </div>
                        <div class="options">
                            <div class="options-header">
                                <div class="search-box">
                                    <clockify-input
                                        placeholder="${t(this.localization.ADD_FIND_PLACEHOLDER_LABEL, {
                                          entity: getEntityLabel(this.entityNames.client),
                                        })}"
                                        class="clockify-input search"
                                        .value="${this.clientsSearchString}"
                                        @input="${(e: InputEvent) => {
                                          this.clientsSearchString = (e.target as HTMLInputElement).value;
                                        }}"
                                        ${ref(this._searchClientInputRef)}
                                    ></clockify-input>
                                </div>
                            </div>
                          <div class="options-container">
                            ${
                              this.clients?.length === 0 && !this.clientsSearchString && !this.loading
                                ? html`<div class="option-container no-hover no-client">
                                    <div class="upper"
                                      >${t(this.localization.NO_ENTITIES_YET_LABEL, {
                                        entityInPlural: getEntityLabel(this.entityNames.client, true),
                                      })}</div
                                    >
                                    <div class="start-typing">${this.localization.START_TYPING_LABEL}</div>
                                  </div>`
                                : nothing
                            }
                            ${
                              this.newProject.client.id
                                ? html` <div
                                    class="option-container"
                                    @click="${() => {
                                      this.newProject = {
                                        ...this.newProject,
                                        client: DEFAULT_PROJECT.client,
                                        isPublic: this.workspaceSettings.isProjectPublicByDefault,
                                      };
                                      this.createProjectClientsDropdownOpen = false;
                                    }}">
                                    ${t(this.localization.WITHOUT_CUSTOM_LABEL, {
                                      label: getEntityLabel(this.entityNames.client),
                                    })}
                                  </div>`
                                : nothing
                            }
                              ${
                                this.clients.filter((client) => (client.name || "").toLowerCase().includes(this.clientsSearchString.toLowerCase())).length
                                  ? this.clients
                                      .filter((client) => (client.name || "").toLowerCase().includes(this.clientsSearchString.toLowerCase()))
                                      .map((client: any) => {
                                        return html` <div
                                          class="${classMap({
                                            "option-container": true,
                                            "selected": this.newProject.client.id === client.id,
                                          })}"
                                          @click="${() => {
                                            this.newProject = {
                                              ...this.newProject,
                                              client,
                                              isPublic: this.workspaceSettings.isProjectPublicByDefault,
                                              billable: this.workspaceSettings.defaultBillableProjects,
                                            };
                                            this.createProjectClientsDropdownOpen = false;
                                          }}">
                                          ${client.name}
                                        </div>`;
                                      })
                                  : this.clientsSearchString
                                    ? html`<div class="option-container create-client no-hover">
                                        <div class="no-match"
                                          >${t(this.localization.NO_MATCHING_ENTITIES_LABEL, { entityInPlural: getEntityLabel(this.entityNames.client, true) })}</div
                                        >
                                        <div class="quick-create-client">
                                          ${this.localization.CREATE_ENTITY_LABEL}
                                          <button class="link" @click="${this.createClient}">
                                            ${t(this.localization.CREATE_ENTITY_LABEL_2, {
                                              nameFilter: this.clientsSearchString,
                                              entity: getEntityLabel(this.entityNames.client),
                                            })}</button
                                          >
                                        </div>
                                      </div>`
                                    : nothing
                              }
                            </div>
                        </div>
                    </div>
                  ${
                    this.taskFilterOnAndNotFound
                      ? html`<clockify-input
                          type="text"
                          autofocus
                          placeholder="${`Enter ${this.entityNames.task} name`}"
                          .value=${this.newProject.taskName}
                          @input="${(e: InputEvent) => {
                            this.newProject = {
                              ...this.newProject,
                              taskName: (e.target as HTMLInputElement).value,
                            };
                          }}"></clockify-input>`
                      : nothing
                  }
                    <div class="color-picker-is-public">
                        <div class="${classMap({ "dropdown color-picker": true, "open": this.colorPickerOpen })}">
                            <div tabindex="0" class="header" @click="${() => (this.colorPickerOpen = !this.colorPickerOpen)}">
                                <div class="square" style="background-color: ${this.newProject.color}"></div>
                            </div>
                            <div class="options color-options">
                                <div class="option-container colors">
                                    ${presetColors.map((color) => {
                                      return html` <div
                                        class="${classMap({
                                          color: true,
                                          selected: this.newProject.color === color,
                                        })}"
                                        style="background-color: ${color}"
                                        @click="${() => {
                                          this.newProject = {
                                            ...this.newProject,
                                            color,
                                          };
                                          this.colorPickerOpen = false;
                                        }}"></div>`;
                                    })}
                                </div>
                                <div class="option-container custom-color">
                                    <div class="custom-header">Custom</div>
                                    <div class="custom-row">
                                        ${this.customColors.map((color) => html`
                                            <div
                                                class="${classMap({
                                                    "color": true,
                                                    "selected": this.newProject.color === color
                                                })}"
                                                style="background-color: ${color}"
                                                @click="${() => {
                                                    this.newProject = {
                                                        ...this.newProject,
                                                        color: color
                                                    };
                                                    this.colorPickerOpen = false;
                                                }}"
                                            ></div>
                                        `)}
                                        <label class="add-custom-color">
                                            <input
                                                type="color"
                                                @input="${(e: InputEvent) => {
                                                  const color = (e.target as HTMLInputElement).value;
                                                  this.newProject = {
                                                    ...this.newProject,
                                                    color: color,
                                                  };
                                                }}"
                                                @change="${(e: Event) => {
                                                  const color = (e.target as HTMLInputElement).value;
                                                  if (!this.customColors.includes(color)) {
                                                      let newColors = [...this.customColors, color];
                                                      if (newColors.length > 8) {
                                                          newColors.shift();
                                                      }
                                                      this.customColors = newColors;
                                                  }
                                                }}"
                                            />
                                            <div class="plus-icon">+</div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                      <div class="public-checkbox-tooltip">
                      <clockify-checkbox
                        type="checkbox"
                        ?checked="${this.newProject.isPublic}"
                        @sl-change="${(e: InputEvent) => {
                          this.newProject = {
                            ...this.newProject,
                            isPublic: (e.target as HTMLInputElement).checked,
                          };
                        }}"
                      >${this.localization.PUBLIC_LABEL}
                      </clockify-checkbox>
                      <clockify-tooltip
                        placement="top"
                        hoist
                        content="${this.localization.VISIBLE_TO_ALL}"
                        @sl-hide="${(e: Event) => e.stopPropagation()}"
                      ><svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 0C6.9813 0 9 2.01873 9 4.50003C9 6.98133 6.9813 9 4.5 9C2.0187 9 -2.23517e-08 6.98133 -2.23517e-08 4.50003C-2.23517e-08 2.01873 2.0187 0 4.5 0ZM4.5 8.18182C6.53018 8.18182 8.18182 6.53018 8.18182 4.50003C8.18182 2.46987 6.53018 0.818182 4.5 0.818182C2.46982 0.818182 0.818182 2.46987 0.818182 4.50003C0.818182 6.53018 2.46985 8.18182 4.5 8.18182Z" fill="#90A4AE"/>
                        <path d="M4.5 2C4.77571 2 5 2.2244 5 2.50023C5 2.7758 4.77571 3 4.5 3C4.22429 3 4 2.7758 4 2.50023C4 2.2244 4.22429 2 4.5 2Z" fill="#90A4AE"/>
                        <path d="M4.5 4C4.77613 4 5 4.1679 5 4.375V6.625C5 6.8321 4.77613 7 4.5 7C4.22387 7 4 6.8321 4 6.625V4.375C4 4.1679 4.22387 4 4.5 4Z" fill="#90A4AE"/>
                      </svg></clockify-tooltip>
                      </div>
                    </div>
                </div>
                <clockify-button variant="text" size="small" slot="footer" @click="${this.closeCreateProjectDialog}">${this.localization.CANCEL_BTN}</clockify-button>
                <clockify-button variant="primary" slot="footer" @click="${this.createProject}" ${ref(this._createProjectButton)} @keyup="${(e: KeyboardEvent) => {
                  e.stopPropagation();
                }}">${this.localization.CREATE_LABEL}</clockify-button>
            </clockify-dialog>
            <clockify-dialog
              @sl-hide="${this.closeSingleClientDialog}"
              label="${
                this.singleClient.client?.name ||
                t(this.localization?.NO_LABEL_WITH_PARAM, {
                  label: this.entityNames.client,
                })
              }"
              ?open="${this.isSingleClientDialogOpen}"
              id="single-client-dialog"
              modal
            >
                <div class="dialog-content">
                    <clockify-input
                        autofocus
                        type="text"
                        .value="${this.singleClientProjectsSearchString}"
                        placeholder="${
                          this.userSettings.projectPickerTaskFilter
                            ? t(this.localization?.SEARCH_TASK_CUSTOM_LABEL, {
                                taskLabel: getEntityLabel(this.entityNames.task),
                                projectLabel: getEntityLabel(this.entityNames.project),
                                projectGroupingLabel: getEntityLabel(this.entityNames.client),
                              })
                            : t(this.localization?.["SEARCH_PROJECT_CUSTOM_LABEL_NO_DOTS"], {
                                projectLabel: getEntityLabel(this.entityNames.project),
                                projectGroupingLabel: getEntityLabel(this.entityNames.client),
                              })
                        }"
                        @input="${async (e: InputEvent) => {
                          this.singleClientProjectsSearchString = (e.target as HTMLInputElement).value;
                          this.debounceGetSingleClientProjects(this.singleClient.client?.id, this.singleClientProjectsSearchString);
                        }}"
                    ></clockify-input>
                </div>
                ${
                  this.singleClient.projects?.length
                    ? html`<client-projects
                        slot="footer"
                        .token="${this.token}"
                        .endpoint="${this.endpoint}"
                        .workspaceId="${this.activeWorkspaceId}"
                        .entityNames="${this.entityNames}"
                        .clientObject="${this.singleClient}"
                        .workspaceSettings="${this.workspaceSettings}"
                        .userSettings="${this.userSettings}"
                        .localization="${this.localization}"
                        .selectedProject="${this.selectedProject}"
                        .selectedTask="${this.selectedTask}"
                        .isCreatingProjectsAllowed="${this.isCreatingProjectsAllowed}"
                        .isCreatingTasksAllowed="${this.isCreatingTasksAllowed}"
                        .isCreatingTasksAllowedForPMs="${this.isCreatingTasksAllowedForPMs}"
                        .projectIdListWhereUserIsProjectManager="${this.projectIdListWhereUserIsProjectManager}"
                        .favoriteProjects="${this.favoriteProjects}"
                        .loadingProjectsForClientId="${this.loadingProjectsForClientId}"
                        .loadingTasksForProjectId="${this.loadingTasksForProjectId}"
                        ?isSingleClientDialogOpen="${this.isSingleClientDialogOpen}"
                        .showFavorites="${this.showFavorites}"
                        .showBullet=${false}
                        .userId="${this.userQuery.data?.id}"
                        @toggle-project-collapse="${async ({ detail }: any) => {
                          await this.toggleProjectCollapse(detail.e, detail.clientId, detail.projectId);
                        }}"
                        @update-project-tasks="${({ detail }: any) => {
                          this.updateProjectTasks(detail.projectId, detail.tasks, 1, detail.projectUpdates);
                        }}"
                        @select-project-task="${async ({ detail }: any) => {
                          await this.handleSelect(detail.project, detail.task);
                        }}"
                        @open-task-dialog="${({ detail }: any) => {
                          this.openNewTaskDialog(detail.projectId);
                        }}"
                        @update-favorite-projects="${async () => {
                          await this.refreshProjects();
                        }}"
                        @load-more="${async ({ detail }: any) => {
                          await this.handleLoadMore(detail.loadMoreClientIds);
                        }}"></client-projects>`
                    : nothing
                }
            </clockify-dialog>
            <clockify-dialog
              label="${t(this.localization?.CREATE_CUSTOM_LABEL, {
                label: this.entityNames.task,
              })}"
              ?open="${this.isCreateTaskDialogOpen}"
              @sl-hide="${() => this.closeCreateTaskDialog()}"
              @keyup="${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  this._createTaskButton?.value?.click();
                }
              }}"
              modal
            >
              <clockify-input
                autofocus
                type="text"
                size="large"
                .value="${this.newTask.name}"
                @input="${(e: InputEvent) => {
                  this.newTask = {
                    ...this.newTask,
                    name: (e.target as HTMLInputElement).value,
                  };
                }}"
              ></clockify-input>
              <clockify-button variant="text" size="small" @click="${this.closeCreateTaskDialog}" slot="footer">${this.localization.CANCEL_BTN}</clockify-button>
              <clockify-button variant="primary" @click="${this.createTask}" slot="footer" ${ref(this._createTaskButton)} @keyup="${(e: KeyboardEvent) => {
                e.stopPropagation();
              }}">${this.localization.SAVE_LABEL}</clockify-button>
            </clockify-dialog>
            </div>
        `;
  }
}

customElements.define("clockify-project-picker", ClockifyProjectPicker);
// @ts-ignore
export { ClockifyProjectPicker };
