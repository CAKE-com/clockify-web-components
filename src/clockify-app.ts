import TokenService from "./services/token-service";
import EndpointService from "./services/endpoint-service";
import ApiService from "./services/api-service";
import WorkspaceService from "./services/workspace-service";
import { queryClient } from "./query/client";
import EventBus from "./services/event-bus";
import { userQueryOptions, workspaceQueryOptions, rolesQueryOptions } from "./query/hooks/app-hooks";
import UserService from "./services/user-service";

export type ClockifyWebComponentsAppConfig = {
  token?: string;
  workspaceId?: string;
  endpoint?: string;
  homeUrl?: string;
  addon?: boolean;
};

export class ClockifyWebComponentsApp {
  static isInitialized = false;
  static initializationData: any = null;

  static async init(config: ClockifyWebComponentsAppConfig) {
    const { token, workspaceId, endpoint, homeUrl, addon } = config;

    if (token !== undefined) {
      TokenService.setTokenToStorage(token);
    }
    if (homeUrl) await EndpointService.setHomeUrlFromComponentToStorage(homeUrl);

    const storedToken = token || TokenService.getToken() || "";
    await EndpointService.setEndpointToStorage(storedToken, endpoint || "");
    const activeEndpoint = await EndpointService.getEndpoint();

    if (addon !== undefined) await ApiService.setAddon(addon);
    if (workspaceId) WorkspaceService.setActiveWorkspace(workspaceId);


    if (storedToken) {
      try {
        const user = await queryClient.fetchQuery({ ...userQueryOptions(storedToken, activeEndpoint), staleTime: 0 });
        if (user) {
          const activeWorkspaceId = workspaceId || user.activeWorkspace;
          UserService.setUser(user);
          if (activeWorkspaceId) {
             WorkspaceService.setActiveWorkspace(activeWorkspaceId);
          }

          if (activeWorkspaceId) {
            const [workspace, roles] = await Promise.all([
              queryClient.fetchQuery({ ...workspaceQueryOptions(activeWorkspaceId, storedToken, activeEndpoint), staleTime: 0 }),
              queryClient.fetchQuery({ ...rolesQueryOptions(activeWorkspaceId, user.id, storedToken, activeEndpoint), staleTime: 0 })
            ]);
            WorkspaceService.setWorkspace(workspace);
            UserService.setRoles(roles);
          }
        }
      } catch (error) {
        console.error("Error initializing ClockifyWebComponentsApp data:", error);
      }
      this.isInitialized = true;
      this.initializationData = { ...config, workspaceId, endpoint: activeEndpoint };
      EventBus.dispatchEvent(new CustomEvent("clockify-app-init", { detail: this.initializationData }));
    }
  }
}