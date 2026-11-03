import RequestService from "./request-service";
import TokenService from "./token-service";

class ApiService {
  private static pendingGetRequests = new Map<string, Promise<any>>();
  private static addon: boolean = false;

  static async get(endpoint: string | { endpoint: string, signal?: AbortSignal, timeout?: number, getHeaders?: boolean, token?: string }, signal?: AbortSignal, timeout?: number, getHeaders?: boolean, token?: string) {
    let options: { endpoint: string, signal?: AbortSignal, timeout?: number, getHeaders?: boolean, token?: string };
    if (typeof endpoint === 'string') {
      options = { endpoint, signal, timeout, getHeaders, token };
    } else {
      options = endpoint;
    }

    const cacheKey = `${options.endpoint}:${options.token || ''}`;

    if (this.pendingGetRequests.has(cacheKey)) {
      return this.pendingGetRequests.get(cacheKey);
    }

    const headers = this.getHeaders(options.token);

    const requestPromise = RequestService.get(options.endpoint, headers, options.signal, options.timeout, options.getHeaders);
    this.pendingGetRequests.set(cacheKey, requestPromise);

    requestPromise.finally(() => {
      this.pendingGetRequests.delete(cacheKey);
    });

    return requestPromise;
  }

  static async post(endpoint: string | { endpoint: string, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string }, body?: BodyInit | null, signal?: AbortSignal,  timeout?: number, token?: string) {
    let options: { endpoint: string, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string };
    if (typeof endpoint === 'string') {
      options = { endpoint, body, signal, timeout, token };
    } else {
      options = endpoint;
    }
    const headers = this.getHeaders(options.token);
    return RequestService.post(options.endpoint, options.body || null, headers, options.signal, options.timeout)
  }

  static async put(endpoint: string | { endpoint: string, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string }, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string) {
    let options: { endpoint: string, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string };
    if (typeof endpoint === 'string') {
      options = { endpoint, body, signal, timeout, token };
    } else {
      options = endpoint;
    }
    const headers = this.getHeaders(options.token);
    return RequestService.put(options.endpoint, options.body || null, headers, options.signal, options.timeout)
  }

  static async patch(endpoint: string | { endpoint: string, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string }, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string) {
    let options: { endpoint: string, body?: BodyInit | null, signal?: AbortSignal, timeout?: number, token?: string };
    if (typeof endpoint === 'string') {
      options = { endpoint, body, signal, timeout, token };
    } else {
      options = endpoint;
    }
    const headers = this.getHeaders(options.token);
    return RequestService.patch(options.endpoint, options.body || null, headers, options.signal, options.timeout)
  }

  static async delete(endpoint: string | { endpoint: string, signal?: AbortSignal, timeout?: number, token?: string }, signal?: AbortSignal, timeout?: number, token?: string) {
    let options: { endpoint: string, signal?: AbortSignal, timeout?: number, token?: string };
    if (typeof endpoint === 'string') {
      options = { endpoint, signal, timeout, token };
    } else {
      options = endpoint;
    }
    const headers = this.getHeaders(options.token);
    return RequestService.delete(options.endpoint, headers, options.signal, options.timeout)
  }

  static async setAddon(addon: boolean) {
    this.addon = addon;
  }

  private static getHeaders(tokenOverride?: string): HeadersInit {
    const token = tokenOverride || TokenService.getToken() || '';
    const addon = this.addon;
    const tokenHeader = addon ? 'X-Addon-Token' : 'X-Auth-Token';
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'App-Name': 'web-components',
      [tokenHeader]: token,
    }
  }
}

export default ApiService;