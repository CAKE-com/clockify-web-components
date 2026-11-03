type RequestOptions = {
    headers?: HeadersInit;
    body?: BodyInit | null;
    signal?: AbortSignal;
    getHeaders?: boolean;
};

class RequestService {
    static async request(method: string, url: string, options: RequestOptions = {}, timeout: number = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const config: RequestInit = {
            method,
            headers: options.headers,
            body: method !== 'GET' ? options.body : null,
            signal: options.signal || controller.signal
        };

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            if(!response.ok) {
                new Error(await response.text())
            }

            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                return options.getHeaders ? [await response.json(), response.headers] : await response.json();
            } else {
                return options.getHeaders ? [await response.text(), response.headers] : await response.text();
            }

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    static async get(url: string, headers?: HeadersInit, signal?: AbortSignal, timeout?: number, getHeaders?: boolean) {
        return RequestService.request('GET', url, { headers, signal, getHeaders }, timeout);
    }

    static async post(url: string, body: BodyInit | null, headers?: HeadersInit, signal?: AbortSignal, timeout?: number) {
        return RequestService.request('POST', url, { body, headers, signal }, timeout);
    }

    static async put(url: string, body: BodyInit | null, headers?: HeadersInit, signal?: AbortSignal, timeout?: number) {
        return RequestService.request('PUT', url, { body, headers, signal }, timeout);
    }

    static async patch(url: string, body: BodyInit | null, headers?: HeadersInit, signal?: AbortSignal, timeout?: number) {
        return RequestService.request('PATCH', url, { body, headers, signal }, timeout);
    }

    static async delete(url: string, headers?: HeadersInit, signal?: AbortSignal, timeout?: number) {
        return RequestService.request('DELETE', url, { headers, signal }, timeout);
    }
}

export default RequestService;