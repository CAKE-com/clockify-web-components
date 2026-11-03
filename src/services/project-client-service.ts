import ApiService from "./api-service";
import EndpointService from "./endpoint-service";
import UserService from "./user-service";
import NotificationService from "./notification-service";
import WorkspaceService from "./workspace-service";
import LocalizationService from "./localization-service";
import { t, getEntityLabel } from "../utils";
import { DEFAULT_LOCALES } from "../utils/constants";

class ProjectClientService {
  static async getCreateProjectTask(body: BodyInit, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/workspaces/${activeWorkspace}/project-task`;
    if (!ep || !activeWorkspace) {
      return {};
    }
    try {
      const projectTask = await ApiService.post({ endpoint: url, body, token });
      const workspaceSettings = WorkspaceService.getWorkspaceSettings();
      const projectLabel = workspaceSettings?.projectLabel || "Project";
      const taskLabel = workspaceSettings?.taskLabel || "Task";
      const lang = LocalizationService.resolveLang();
      const locales = LocalizationService.getLocalization(lang) || DEFAULT_LOCALES;

      NotificationService.success(t(locales.PROJECT_CREATE_SUCCESS_MESSAGE, {
        projectLabel: getEntityLabel(projectLabel),
        name: projectTask.project?.name ?? ""
      }), projectTask.project);
      NotificationService.success(t(locales.PROJECT_CREATE_SUCCESS_MESSAGE, {
        projectLabel: getEntityLabel(taskLabel),
        name: projectTask.task?.name ?? ""
      }), projectTask.task);
      return projectTask;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async createClient(body: BodyInit, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/clients`;
    if (!ep || !activeWorkspace) {
      return {};
    }
    try {
      const client = await ApiService.post({ endpoint: url, body, token });
      const workspaceSettings = WorkspaceService.getWorkspaceSettings();
      const projectGroupingLabel = workspaceSettings?.projectGroupingLabel || "Client";
      const lang = LocalizationService.resolveLang();
      const locales = LocalizationService.getLocalization(lang) || DEFAULT_LOCALES;

      NotificationService.success(t(locales.CLIENT_CREATE_SUCCESS_MESSAGE, {
        projectGroupingLabel: getEntityLabel(projectGroupingLabel),
        projectName: client.name
      }), client);
      return client;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async getProjectById(projectId: string, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/projects/${projectId}`;
    if (!ep || !activeWorkspace || !projectId) {
      return {};
    }
    try {
      return await ApiService.get({ endpoint: url, token });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async getClientById(clientId: string, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/clients/${clientId}`;
    if (!ep || !activeWorkspace || !clientId) {
      return {};
    }
    try {
      return await ApiService.get({ endpoint: url, token });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async getClients(token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/clients?archived=false`;
    if (!ep || !activeWorkspace) {
      return [];
    }
    try {
      return await ApiService.get({ endpoint: url, token });
    } catch (error: any) {
      NotificationService.error(error);
      return [];
    }
  }
  static async getClientsProjects(
    search: string = "",
    excludedProjects: string[] = [],
    excludededTasks: string[] = [],
    signal?: AbortSignal,
    token?: string,
    endpoint?: string,
    workspaceId?: string
  ) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const excludedProjectsQueryParam = excludedProjects?.length
      ? `&excludedProjects=${excludedProjects.join(",")}`
      : "";
    const excludedTasksQueryParam = excludededTasks?.length
      ? `&excludedTasks=${excludededTasks.join(",")}`
      : "";
    const url = `${ep}/workspaces/${activeWorkspace}/project-picker/clients?page=1&archived=false&favorites=false&search=${encodeURIComponent(search)}${excludedProjectsQueryParam}${excludedTasksQueryParam}`;
    if (!ep || !activeWorkspace) {
      return [];
    }
    try {
      return await ApiService.get({ endpoint: url, signal, token });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        NotificationService.error(error);
      }
      return [];
    }
  }

  static async getSingleClientProjects(
    clientId: any,
    search: string = "",
    page: number = 1,
    excludedProjects: string[] = [],
    excludededTasks: string[] = [],
    token?: string,
    endpoint?: string,
    workspaceId?: string
  ) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const favorites =
      clientId === "favorites" ? "&favorites=true" : "&favorites=false";
    const excludedProjectsQueryParam = excludedProjects?.length
      ? `&excludedProjects=${excludedProjects.join(",")}`
      : "";
    const excludedTasksQueryParam = excludededTasks?.length
      ? `&excludedTasks=${excludededTasks.join(",")}`
      : "";
    const url = `${ep}/workspaces/${activeWorkspace}/project-picker/projects?page=${page}&search=${encodeURIComponent(search)}&clientId=${clientId}${favorites}${excludedProjectsQueryParam}${excludedTasksQueryParam}`;
    if (!ep || !activeWorkspace) {
      return {};
    }
    try {
      return await ApiService.get({ endpoint: url, token });
    } catch (error: any) {
      NotificationService.error(error);
      return [];
    }
  }

  static async getFavoriteProjects(
    search: string = "",
    excludedProjects: string[] = [],
    excludededTasks: string[] = [],
    signal?: AbortSignal,
    token?: string,
    endpoint?: string,
    workspaceId?: string
  ) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const excludedProjectsQueryParam = excludedProjects?.length
      ? `&excludedProjects=${excludedProjects.join(",")}`
      : "";
    const excludedTasksQueryParam = excludededTasks?.length
      ? `&excludedTasks=${excludededTasks.join(",")}`
      : "";
    const url = `${ep}/workspaces/${activeWorkspace}/project-picker/projects?archived=false&favorites=true&search=${encodeURIComponent(search)}${excludedProjectsQueryParam}${excludedTasksQueryParam}`;
    if (!ep || !activeWorkspace) {
      return [];
    }
    try {
      return await ApiService.get({ endpoint: url, signal, token });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        NotificationService.error(error);
      }
      return [];
    }
  }

  static async createProject(body: BodyInit, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/projects`;
    if (!ep || !activeWorkspace) {
      return {};
    }
    try {
      const project = await ApiService.post({ endpoint: url, body, token });
      const workspaceSettings = WorkspaceService.getWorkspaceSettings();
      const projectLabel = workspaceSettings?.projectLabel || "Project";
      const lang = LocalizationService.resolveLang();
      const locales = LocalizationService.getLocalization(lang) || DEFAULT_LOCALES;

      NotificationService.success(t(locales.PROJECT_CREATE_SUCCESS_MESSAGE, {
        projectLabel: getEntityLabel(projectLabel),
        name: project.name
      }), project);
      return project;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async setFavoriteProject(projectId: string, token?: string, endpoint?: string, workspaceId?: string, userId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const uid = userId || await UserService.getUserId();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/workspaces/${activeWorkspace}/users/${uid}/projects/favorites/${projectId}`;
    if (!ep || !activeWorkspace) {
      return;
    }
    const body = JSON.stringify({});
    try {
      return await ApiService.post({ endpoint: url, body, token });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async deleteFavoriteProject(projectId: string, token?: string, endpoint?: string, workspaceId?: string, userId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const uid = userId || await UserService.getUserId();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/workspaces/${activeWorkspace}/users/${uid}/projects/favorites/projects/${projectId}`;
    if (!ep || !activeWorkspace || !uid || !projectId) {
      return;
    }
    try {
      await ApiService.delete({ endpoint: url, token });
      return true;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }
}

export default ProjectClientService;