import ApiService from "./api-service";
import EndpointService from "./endpoint-service";

class WorkspaceService {
    private static activeWorkspaceId: string = "";
    private static workspace: any = null;

    static async getWorkspace(workspaceId: string, token?: string, endpoint?: string) {
    const ep = endpoint || await EndpointService.getEndpoint();
    if (!ep || !workspaceId) return null;
    try {
      return await ApiService.get({ endpoint: `${ep}/v1/workspaces/${workspaceId}`, token });
    } catch (error: any) {
      return null;
    }
  }

  static setActiveWorkspace(workspaceId: string) {
    if(!workspaceId) return;
    this.activeWorkspaceId = workspaceId;
    return workspaceId;
  }

  static getActiveWorkspaceId() {
      return this.activeWorkspaceId;
  }

  static getWorkspaceSettings() {
    return this.workspace?.workspaceSettings ?? {};
  }

  static setWorkspace(workspace: any) {
      this.workspace = workspace;
  }
}

export default WorkspaceService;