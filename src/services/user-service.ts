import ApiService from "./api-service";
import EndpointService from "./endpoint-service";
import NotificationService from "./notification-service";

export enum WorkspaceRole {
  WORKSPACE_ADMIN = 'WORKSPACE_ADMIN',
  WORKSPACE_OWN = 'WORKSPACE_OWN',
  PROJECT_MANAGER = "PROJECT_MANAGER",
}

class UserService {
  private static user: any = null;
  private static roles: any[] = [];

  static async getUser(token?: string, endpoint?: string) {
    const ep = endpoint || await EndpointService.getEndpoint();
    if (!ep) return null;
    try {
      return await ApiService.get({ endpoint: `${ep}/v1/user`, token });
    } catch (error: any) {
      NotificationService.error(error);
      return null;
    }
  }

  static async fetchUser(workspaceId: string) {
    try{
      const endpoint = await EndpointService.getEndpoint();
      if(!endpoint) return;
      const user = await ApiService.get(`${endpoint}/v1/user`);
      
      this.user = user;
      
      if(!workspaceId && user.activeWorkspace){
          const { default: WorkspaceService } = await import("./workspace-service");
          WorkspaceService.setActiveWorkspace(user.activeWorkspace);
      }
    } catch (error: any) {
      NotificationService.error(error);
      return '';
    }
  }

  static async getUserId() {
    try{
      const userData = await this.getUserData();
      return userData.id || '';
    } catch (error: any) {
      NotificationService.error(error);
      return '';
    }
  }

  static async getUserSettings() {
    try{
      const userData = await this.getUserData();
      return userData.settings || {};
    } catch (error: any) {
      NotificationService.error(error);
      return {};
    }
  }

  static async getActiveWorkspace() {
    try{
      const { default: WorkspaceService } = await import("./workspace-service");
      const activeWorkspace = WorkspaceService.getActiveWorkspaceId();
      const userData = await this.getUserData();
      return activeWorkspace || userData.activeWorkspace || '';
    } catch (error: any) {
      NotificationService.error(error);
      return '';
    }
  }

  static getLang() {
    try{
      return this.user?.settings?.lang?.toLowerCase() || 'en';
    } catch (error: any) {
      NotificationService.error(error);
      return '';
    }
  }

  static async getUserData() {
    return this.user || {};
  }

  static async getRoles(workspaceId: string, userId: string, token?: string, endpoint?: string) {
    const ep = endpoint || await EndpointService.getEndpoint();
    if (!ep || !workspaceId || !userId) return [];
    try {
      const data = await ApiService.get({ endpoint: `${ep}/workspaces/${workspaceId}/users/${userId}/roles`, token });
      return data.userRoles || [];
    } catch (error: any) {
      return [];
    }
  }

  static async getUserRoles() {
    return this.roles;
  }

  static setRoles(roles: any[]) {
      this.roles = roles;
  }

  static setUser(user: any) {
      this.user = user;
  }

}

export default UserService;