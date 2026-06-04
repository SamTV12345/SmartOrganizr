import createFetchClient from "openapi-fetch";
import createQueryClient from "openapi-react-query";
import { apiURL, keycloak } from "@/src/Keycloak";
import type { paths } from "./schema";
import { buildOfflineApiResponse, buildOfflineHttpResponse } from "@/src/offline/offlineFallback";

export const apiFetch = createFetchClient<paths>({ baseUrl: apiURL });

apiFetch.use({
    onRequest({ request }) {
        if (keycloak?.token) {
            request.headers.set("Authorization", `Bearer ${keycloak.token}`);
        }
        return request;
    },
    async onError({ request, error }) {
        // fetch rejected (offline / network failure) — try serving from the local store.
        if (request.method === "GET") {
            const offline = await buildOfflineApiResponse(new URL(request.url));
            if (offline) return offline;
        }
        throw error;
    },
});

export const $api = createQueryClient(apiFetch);

export const parentDecksQueryKey = $api.queryOptions(
    "get",
    "/v1/elements/parentDecks",
).queryKey;

// authFetch is a thin wrapper around native fetch that adds the Keycloak bearer token.
// Use it for endpoints that aren't (yet) part of the typed OpenAPI schema — e.g. file
// uploads with FormData, blob downloads, or legacy paths the backend doesn't expose
// in the spec. Prefer $api for any endpoint declared in src/api/schema.ts.
export const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (keycloak?.token) {
        headers.set("Authorization", `Bearer ${keycloak.token}`);
    }
    return fetch(input, { ...init, headers });
};

// http is a minimal axios-compatible shim built on authFetch. It exists to let the
// remaining axios call-sites migrate without rewriting their shape (returns { data }).
// New code should prefer the typed $api hooks (openapi-react-query) instead.
type HttpResponse<T> = {
    data: T;
    status: number;
    headers: Headers;
};

type HttpConfig = {
    headers?: Record<string, string>;
    responseType?: "json" | "blob" | "text";
    params?: Record<string, string | number | boolean | null | undefined>;
};

const parseBody = async <T>(response: Response, responseType: HttpConfig["responseType"]): Promise<T> => {
    if (response.status === 204) {
        return undefined as T;
    }
    if (responseType === "blob") {
        return (await response.blob()) as T;
    }
    if (responseType === "text") {
        return (await response.text()) as T;
    }
    const text = await response.text();
    if (!text) {
        return undefined as T;
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
};

const isJsonBody = (body: unknown, headers?: Record<string, string>) => {
    if (body === undefined || body === null) return false;
    if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return false;
    if (typeof body === "string") {
        const contentType = headers?.["Content-Type"] ?? headers?.["content-type"];
        return contentType === "application/json";
    }
    return true;
};

const request = async <T>(method: string, url: string, body: unknown, config: HttpConfig = {}): Promise<HttpResponse<T>> => {
    const headers = new Headers(config.headers);
    let payload: BodyInit | undefined = undefined;
    if (body !== undefined && body !== null) {
        if (isJsonBody(body, config.headers)) {
            if (!headers.has("Content-Type")) {
                headers.set("Content-Type", "application/json");
            }
            payload = typeof body === "string" ? body : JSON.stringify(body);
        } else {
            payload = body as BodyInit;
        }
    }
    let finalUrl = url;
    if (config.params) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(config.params)) {
            if (value === undefined || value === null) continue;
            search.append(key, String(value));
        }
        const qs = search.toString();
        if (qs) {
            finalUrl += (url.includes("?") ? "&" : "?") + qs;
        }
    }
    if (method === "GET" && typeof navigator !== "undefined" && !navigator.onLine) {
        const offline = await buildOfflineHttpResponse(finalUrl);
        if (offline) return offline as HttpResponse<T>;
    }

    let response: Response;
    try {
        response = await authFetch(finalUrl, { method, body: payload, headers });
    } catch (networkErr) {
        if (method === "GET") {
            const offline = await buildOfflineHttpResponse(finalUrl);
            if (offline) return offline as HttpResponse<T>;
        }
        throw networkErr;
    }
    if (!response.ok) {
        const err: Error & { response?: { status: number; data: unknown } } = new Error(`Request failed with status ${response.status}`);
        try {
            err.response = { status: response.status, data: await parseBody(response.clone(), config.responseType) };
        } catch {
            err.response = { status: response.status, data: undefined };
        }
        throw err;
    }
    const data = await parseBody<T>(response, config.responseType);
    return { data, status: response.status, headers: response.headers };
};

export const http = {
    // Defaults to `any` so callers without an explicit type argument keep the loose
    // ergonomics of axios. New code should pass an explicit type or use $api.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: <T = any, _B = unknown>(url: string, config?: HttpConfig) => request<T>("GET", url, undefined, config),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: <T = any, _B = unknown>(url: string, config?: HttpConfig) => request<T>("DELETE", url, undefined, config),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: <T = any, _B = unknown>(url: string, body?: unknown, config?: HttpConfig) => request<T>("POST", url, body, config),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    put: <T = any, _B = unknown>(url: string, body?: unknown, config?: HttpConfig) => request<T>("PUT", url, body, config),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patch: <T = any, _B = unknown>(url: string, body?: unknown, config?: HttpConfig) => request<T>("PATCH", url, body, config),
};
