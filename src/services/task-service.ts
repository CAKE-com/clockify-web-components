import ApiService from "./api-service";
import EndpointService from "./endpoint-service";
import UserService from "./user-service";
import NotificationService from "./notification-service";
import WorkspaceService from "./workspace-service";

class TaskService {

  static async getTasks(projectId: string, page: number = 1, excludedTasks: any[] = [], token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const excludedTasksQueryParam = excludedTasks.length
      ? `&excludedTasks=${excludedTasks.join(",")}`
      : "";
    const url = `${ep}/workspaces/${activeWorkspace}/project-picker/projects/${projectId}/tasks?page=${page}${excludedTasksQueryParam}`;
    if(!ep || !activeWorkspace || !projectId){
      return [];
    }
    try {
      const data = await ApiService.get({ endpoint: url, token });
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      NotificationService.error(error);
      return [];
    }
  }

  static async getTaskById(projectId: string, taskId: string, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/projects/${projectId}/tasks/${taskId}`;
    if(!ep || !activeWorkspace || !projectId || !taskId){
      return {};
    }
    try {
      return await ApiService.get({ endpoint: url, token });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }
  static async createTask(projectId: string, body: BodyInit, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/projects/${projectId}/tasks`;
    if(!ep || !activeWorkspace || !projectId){
      return {};
    }
    try {
      const task = await ApiService.post({ endpoint: url, body, token });
      const workspaceSettings = WorkspaceService.getWorkspaceSettings();
      const taskLabel = workspaceSettings?.taskLabel || "Task";
      NotificationService.success(`${taskLabel} ${task.name} has been created`, task);
      return task;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async setFavoriteTask(projectId: string, taskId: string, token?: string, endpoint?: string, workspaceId?: string, userId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const uid = userId || await UserService.getUserId();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/workspaces/${activeWorkspace}/users/${uid}/projects/${projectId}/tasks/${taskId}/favorites`;
    const body = JSON.stringify({});
    if(!ep || !activeWorkspace || !projectId || !taskId){
      return {};
    }
    try {
      return await ApiService.post({ endpoint: url, body, token });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async deleteFavoriteTask(projectId: string, taskId: string, token?: string, endpoint?: string, workspaceId?: string, userId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const uid = userId || await UserService.getUserId();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/workspaces/${activeWorkspace}/users/${uid}/projects/${projectId}/tasks/${taskId}/favorites`;
    if(!ep || !activeWorkspace || !projectId || !taskId){
      return {};
    }
    try {
      await ApiService.delete({ endpoint: url, token });
      return true;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

}

export default TaskService;