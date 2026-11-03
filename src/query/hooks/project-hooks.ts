import { ReactiveControllerHost } from "lit";
import { InfiniteQueryController } from "../controllers/infinite-query-controller";
import { queryClient } from "../client";
import { keepPreviousData } from "@tanstack/query-core";
import ProjectClientService from "../../services/project-client-service";

export const clientsProjectsQueryOptions = (
  searchString: string,
  token?: string,
  endpoint?: string,
  activeWorkspaceId?: string,
  excludedProjects: string[] = [],
  excludedTasks: string[] = [],
  getPreparedProjects?: (clients: any[], favorites: any[], search: string) => any[]
) => ({
  queryKey: ['clientsProjects', searchString, endpoint, activeWorkspaceId, excludedProjects, excludedTasks],
  staleTime: Infinity,
  enabled: !!activeWorkspaceId && !!endpoint,
  placeholderData: keepPreviousData,
  queryFn: async ({ pageParam = 1 }) => {
    const [clients, favorites] = await Promise.all([
      ProjectClientService.getClientsProjects(searchString, excludedProjects, excludedTasks, undefined, token, endpoint, activeWorkspaceId),
      ProjectClientService.getFavoriteProjects(searchString, excludedProjects, excludedTasks, undefined, token, endpoint, activeWorkspaceId)
    ]);
    return getPreparedProjects ? getPreparedProjects(clients, favorites, searchString) : clients;
  },
  initialPageParam: 1,
  getNextPageParam: (lastPage: any, allPages: any) => {
    return undefined;
  },
});

export function useClientsProjects(
  host: ReactiveControllerHost,
  params: {
    searchString: string,
    token?: string,
    endpoint?: string,
    activeWorkspaceId?: string,
    excludedProjects?: string[],
    excludedTasks?: string[],
    getPreparedProjects?: (clients: any[], favorites: any[], search: string) => any[]
  } | (() => {
    searchString: string,
    token?: string,
    endpoint?: string,
    activeWorkspaceId?: string,
    excludedProjects?: string[],
    excludedTasks?: string[],
    getPreparedProjects?: (clients: any[], favorites: any[], search: string) => any[]
  }),
  options?: any | (() => any)
) {
  if (typeof params === 'function' || typeof options === 'function') {
    return new InfiniteQueryController<any, Error, any, readonly unknown[], number>(
      host,
      queryClient,
      () => {
        const p = typeof params === 'function' ? (params as any)() : params;
        const o = typeof options === 'function' ? options() : options;
        return { ...clientsProjectsQueryOptions(p.searchString, p.token, p.endpoint, p.activeWorkspaceId, p.excludedProjects, p.excludedTasks, p.getPreparedProjects), ...o };
      }
    );
  }
  return new InfiniteQueryController<any, Error, any, readonly unknown[], number>(
    host,
    queryClient,
    { ...clientsProjectsQueryOptions(params.searchString, params.token, params.endpoint, params.activeWorkspaceId, params.excludedProjects, params.excludedTasks, params.getPreparedProjects), ...options }
  );
}
