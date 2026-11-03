import { ReactiveControllerHost } from "lit";
import { QueryController } from "../controllers/query-controller";
import { queryClient } from "../client";
import ApiService from "../../services/api-service";
import EndpointService from "../../services/endpoint-service";
import { DEFAULT_LOCALES, LocalizationData } from "../../utils/constants";
import { extractTranslations } from "../../services/localization-service";
import LocalizationService from "../../services/localization-service";

const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);

export const userQueryOptions = (token?: string, endpoint?: string, invalidateOnFocus?: boolean) => ({
  queryKey: ['user', token, endpoint],
  queryFn: async () => {
    const ep = endpoint || await EndpointService.getEndpoint();
    return ApiService.get({ endpoint: `${ep}/v1/user`, token });
  },
  staleTime: (invalidateOnFocus ?? isElectron) ? 0 : Infinity,
});

export const workspaceQueryOptions = (workspaceId: string, token?: string, endpoint?: string, invalidateOnFocus?: boolean) => ({
  queryKey: ['workspace', workspaceId, endpoint],
  queryFn: async () => {
    const ep = endpoint || await EndpointService.getEndpoint();
    return ApiService.get({ endpoint: `${ep}/v1/workspaces/${workspaceId}`, token });
  },
  enabled: !!workspaceId,
  staleTime: (invalidateOnFocus ?? isElectron) ? 0 : Infinity,
});

export const rolesQueryOptions = (workspaceId: string, userId: string, token?: string, endpoint?: string, invalidateOnFocus?: boolean) => ({
  queryKey: ['roles', workspaceId, userId, endpoint],
  queryFn: async () => {
    const ep = endpoint || await EndpointService.getEndpoint();
    const data = await ApiService.get({ endpoint: `${ep}/workspaces/${workspaceId}/users/${userId}/roles`, token });
    return data.userRoles || [];
  },
  enabled: !!workspaceId && !!userId,
  staleTime: (invalidateOnFocus ?? isElectron) ? 0 : Infinity,
});

export function useUser(host: ReactiveControllerHost, params: { token?: string, endpoint?: string, invalidateOnFocus?: boolean } | (() => { token?: string, endpoint?: string, invalidateOnFocus?: boolean }), options?: any | (() => any)) {
  if (typeof params === 'function' || typeof options === 'function') {
    return new QueryController<any>(host, queryClient, () => {
      const p = typeof params === 'function' ? (params as any)() : params;
      const o = typeof options === 'function' ? options() : options;
      return { ...userQueryOptions(p.token, p.endpoint, p.invalidateOnFocus), ...o };
    });
  }
  return new QueryController<any>(host, queryClient, { ...userQueryOptions(params.token, params.endpoint, params.invalidateOnFocus), ...options });
}

export function useWorkspace(host: ReactiveControllerHost, params: { workspaceId: string, token?: string, endpoint?: string, invalidateOnFocus?: boolean } | (() => { workspaceId: string, token?: string, endpoint?: string, invalidateOnFocus?: boolean }), options?: any | (() => any)) {
  if (typeof params === 'function' || typeof options === 'function') {
    return new QueryController<any>(host, queryClient, () => {
      const p = typeof params === 'function' ? (params as any)() : params;
      const o = typeof options === 'function' ? options() : options;
      return { ...workspaceQueryOptions(p.workspaceId, p.token, p.endpoint, p.invalidateOnFocus), ...o };
    });
  }
  return new QueryController<any>(host, queryClient, { ...workspaceQueryOptions(params.workspaceId, params.token, params.endpoint, params.invalidateOnFocus), ...options });
}

export function useRoles(host: ReactiveControllerHost, params: { workspaceId: string, userId: string, token?: string, endpoint?: string, invalidateOnFocus?: boolean } | (() => { workspaceId: string, userId: string, token?: string, endpoint?: string, invalidateOnFocus?: boolean }), options?: any | (() => any)) {
  if (typeof params === 'function' || typeof options === 'function') {
    return new QueryController<any>(host, queryClient, () => {
      const p = typeof params === 'function' ? (params as any)() : params;
      const o = typeof options === 'function' ? options() : options;
      return { ...rolesQueryOptions(p.workspaceId, p.userId, p.token, p.endpoint, p.invalidateOnFocus), ...o };
    });
  }
  return new QueryController<any>(host, queryClient, { ...rolesQueryOptions(params.workspaceId, params.userId, params.token, params.endpoint, params.invalidateOnFocus), ...options });
}

export const localizationQueryOptions = (endpoint?: string) => {
  const lang = LocalizationService.resolveLang();
  return {
    queryKey: ['localization', lang, endpoint],
    queryFn: async () => {
      const ep = endpoint || await EndpointService.getEndpoint();
      if (!ep) return DEFAULT_LOCALES;
      const response = await fetch(`${ep.replace(/\/api\/?$/, "")}/assets/localization/${lang}.json`);
      const data = await response.json();
      const translations = extractTranslations(data);
      LocalizationService.updateStorage(lang, translations);
      return translations;
    },
    staleTime: Infinity,
    placeholderData: DEFAULT_LOCALES
  };
};

export function useLocalization(host: ReactiveControllerHost, endpoint?: string | (() => string | undefined), options?: any | (() => any)) {
  if (typeof endpoint === 'function' || typeof options === 'function') {
    return new QueryController<LocalizationData>(host, queryClient, () => {
      const ep = typeof endpoint === 'function' ? endpoint() : endpoint;
      const o = typeof options === 'function' ? options() : options;
      return { ...localizationQueryOptions(ep), ...o };
    });
  }
  return new QueryController<LocalizationData>(host, queryClient, { ...localizationQueryOptions(endpoint), ...options });
}

export const recentTimeEntriesQueryOptions = (workspaceId: string, limit: number = 8, token?: string, endpoint?: string) => ({
  queryKey: ['recentTimeEntries', workspaceId, limit, endpoint],
  queryFn: async () => {
    const ep = endpoint || await EndpointService.getEndpoint();
    return ApiService.get({ endpoint: `${ep}/workspaces/${workspaceId}/timeEntries/recent?limit=${limit}`, token });
  },
  enabled: !!workspaceId,
  staleTime: 60 * 1000, // 1 minute
});

export function useRecentTimeEntries(host: ReactiveControllerHost, workspaceId: string, limit: number = 8, token?: string, endpoint?: string) {
  return new QueryController<any>(host, queryClient, recentTimeEntriesQueryOptions(workspaceId, limit, token, endpoint));
}

export const customFieldsQueryOptions = (workspaceId: string, token?: string, endpoint?: string, isEnabled: boolean = true) => ({
  queryKey: ['customFields', workspaceId, endpoint],
  queryFn: async () => {
    const ep = endpoint || await EndpointService.getEndpoint();
    return ApiService.get({ endpoint: `${ep}/v1/workspaces/${workspaceId}/custom-fields?entityType=TIMEENTRY`, token });
  },
  enabled: !!workspaceId && isEnabled,
  staleTime: Infinity,
});

export function useCustomFields(host: ReactiveControllerHost, workspaceIdOrParams: string | (() => { workspaceId: string, token?: string, endpoint?: string, isEnabled?: boolean }), tokenOrOptions?: string | any | (() => any), endpoint?: string, isEnabled: boolean = true, options?: any | (() => any)) {
  if (typeof workspaceIdOrParams === 'function') {
    const opts = tokenOrOptions;
    return new QueryController<any>(host, queryClient, () => {
      const p = workspaceIdOrParams();
      const o = typeof opts === 'function' ? opts() : opts;
      return { ...customFieldsQueryOptions(p.workspaceId, p.token, p.endpoint, p.isEnabled), ...o };
    });
  }
  const workspaceId = workspaceIdOrParams as string;
  const token = tokenOrOptions as string;
  return new QueryController<any>(host, queryClient, { ...customFieldsQueryOptions(workspaceId, token, endpoint, isEnabled), ...options });
}


