import ApiService from "./api-service";
import EndpointService from "./endpoint-service";
import UserService from "./user-service";
import NotificationService from "./notification-service";

export type Tag = {
  id: string;
  name: string;
  workspaceId: string,
  archived: boolean;
}

class TagService {
  private static tags: { data: Tag[], totalCount: number } = { data: [], totalCount: 0 };

  static async getTags(page: number = 1, name: string = "", token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/tags?archived=false&page=${page}&name=${name}`;
    if(!ep || !activeWorkspace) {
      return { data: [], totalCount: 0 };
    }
    try {
      const [dataArray, headers] = await ApiService.get({ endpoint: url, getHeaders: true, token });
      const totalCount = parseInt(headers.get("Total-Count") || "0");
      const data = Array.isArray(dataArray) ? dataArray : [];
      return { data, totalCount };
    } catch (error: any) {
      NotificationService.error(error);
      return { data: [], totalCount: 0 };
    }
  }

  static async fetchTags(workspaceId: string) {
    try{
      const endpoint = await EndpointService.getEndpoint();
      const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
      if(!endpoint || !activeWorkspace) return;
      const url = `${endpoint}/v1/workspaces/${activeWorkspace}/tags?archived=false&page=1`;
      const [dataArray, headers] = await ApiService.get({ endpoint: url, getHeaders: true });
      const totalCount = parseInt(headers.get("Total-Count") || "0");
      const data = Array.isArray(dataArray) ? dataArray : [];
      this.tags = { data, totalCount };
    } catch (error: any) {
      NotificationService.error(error);
      return '';
    }
  }

  static async getTag(id: string = "", token?: string, endpoint?: string, workspaceId?: string) {
    if(!id) return null;
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/tags/${id}`;
    if(!ep || !activeWorkspace) {
      return null;
    }
    try {
      return await ApiService.get({ endpoint: url, token });
    } catch (error: any) {
      NotificationService.error(error);
      return null;
    }
  }

  static async createTag(body: BodyInit, token?: string, endpoint?: string, workspaceId?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    const url = `${ep}/v1/workspaces/${activeWorkspace}/tags`;
    if(!ep || !activeWorkspace) {
      return {};
    }
    try {
      const tag = await ApiService.post({ endpoint: url, body, token });
      NotificationService.success("Tag created successfully", tag);
      return tag;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static clearTags() {
      this.tags = { data: [], totalCount: 0 };
  }

  static getStoredTags() {
      return this.tags;
  }

}

export default TagService;