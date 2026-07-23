import { test as base, expect, Page, Route } from "@playwright/test";

// Shared e2e harness. Auto-authenticates WITHOUT a real Keycloak by intercepting
// the OAuth code flow — keycloak-js runs completely unmodified, so no production
// auth-bypass code is needed. Also exposes `api` to stub backend JSON. Feature
// specs import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures".

export const E2E_USER = {
    sub: "e2e-user-1",
    username: "e2euser",
    name: "Erika Muster",
    email: "e2e@test.local",
    firstName: "Erika",
    lastName: "Muster",
};

export const CLUB_ID = "club-e2e-1";

// Baseline club so ClubDetailView renders; specs pass overrides as needed.
export const baseClub = (overrides: Record<string, unknown> = {}) => ({
    id: CLUB_ID,
    name: "E2E Musikverein",
    club_type: "musikverein",
    street: "Hauptstraße",
    house_number: "1",
    location: "Teststadt",
    postal_code: "12345",
    country: "DE",
    dates_visible_for_all_members: true,
    members_can_send_messages: true,
    feedback_visibility: "all",
    reason_visibility: "all",
    ...overrides,
});

const KC_URL = "https://kc.e2e.local";
const REALM = "e2e";
const CLIENT = "e2e-client";

const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");

// A structurally valid but unsigned JWT. keycloak-js decodes (never verifies)
// tokens client-side, so this is enough to authenticate the SPA.
const jwt = (extra: Record<string, unknown>) => {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url({ alg: "RS256", typ: "JWT", kid: "e2e" });
    const payload = b64url({
        iss: `${KC_URL}/realms/${REALM}`,
        aud: CLIENT,
        azp: CLIENT,
        sub: E2E_USER.sub,
        typ: "Bearer",
        iat: now,
        exp: now + 3600,
        preferred_username: E2E_USER.username,
        email: E2E_USER.email,
        given_name: E2E_USER.firstName,
        family_name: E2E_USER.lastName,
        realm_access: { roles: [] },
        ...extra,
    });
    return `${header}.${payload}.e2e-signature`;
};

// Backend stub API. json/empty register rules SYNCHRONOUSLY (into an array a
// single /api/** route consults per request) so specs can call them without
// `await` and not race page.goto. Newest matching rule wins; a spec can override
// a default. Unmatched: [] for GET, 204 otherwise — gentle enough for the app's
// boot fetches.
export type ApiMock = {
    json: (urlSubstring: string, body: unknown, opts?: { method?: string; status?: number }) => Promise<void>;
    empty: (urlSubstring: string, opts?: { method?: string; status?: number }) => Promise<void>;
};

async function installApiMock(page: Page): Promise<ApiMock> {
    type Rule = { urlSubstring: string; method?: string; status: number; body?: unknown };
    const rules: Rule[] = [];

    // Catch-all for backend calls (apiURL = origin + "/api"). Registered before
    // the SSE route below so the SSE route (more recently registered) wins for it.
    await page.route("**/api/**", async (route: Route) => {
        const req = route.request();
        const url = req.url();
        const method = req.method();
        for (let i = rules.length - 1; i >= 0; i--) {
            const r = rules[i];
            if (!url.includes(r.urlSubstring)) continue;
            if (r.method && r.method !== method) continue;
            if (r.body === undefined) return route.fulfill({ status: r.status });
            return route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.body) });
        }
        return method === "GET"
            ? route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
            : route.fulfill({ status: 204 });
    });

    // Keep the notifications SSE stream from hanging on the absent backend.
    await page.route("**/v1/notifications/stream", (route) =>
        route.fulfill({ status: 200, contentType: "text/event-stream", body: "" }),
    );

    return {
        json: (urlSubstring, body, opts) => {
            rules.push({ urlSubstring, method: opts?.method?.toUpperCase(), status: opts?.status ?? 200, body });
            return Promise.resolve();
        },
        empty: (urlSubstring, opts) => {
            rules.push({ urlSubstring, method: opts?.method?.toUpperCase(), status: opts?.status ?? 204 });
            return Promise.resolve();
        },
    };
}

export const test = base.extend<{ api: ApiMock }>({
    api: async ({ page }, use) => {
        // Keycloak discovery config the SPA fetches from GET /public.
        await page.route(
            (u) => u.pathname === "/public",
            (route) => route.fulfill({ json: { clientId: CLIENT, realm: REALM, url: KC_URL, aiEnabled: false } }),
        );

        // OAuth authorization endpoint: bounce straight back to the app with a
        // code, echoing the state and capturing the nonce for the id_token.
        let nonce = "";
        await page.route("**/protocol/openid-connect/auth*", (route) => {
            const u = new URL(route.request().url());
            nonce = u.searchParams.get("nonce") ?? "";
            const state = u.searchParams.get("state") ?? "";
            const redirectUri = u.searchParams.get("redirect_uri") ?? "";
            const location = `${redirectUri}#state=${encodeURIComponent(state)}&session_state=e2e-session&code=e2e-code`;
            route.fulfill({ status: 302, headers: { location } });
        });

        // Token endpoint: mint tokens (id_token carries the captured nonce so
        // keycloak-js's nonce check passes). Also serves refresh grants.
        await page.route("**/protocol/openid-connect/token", (route) =>
            route.fulfill({
                json: {
                    access_token: jwt({ session_state: "e2e-session" }),
                    id_token: jwt({ session_state: "e2e-session", nonce }),
                    refresh_token: jwt({ typ: "Refresh" }),
                    token_type: "Bearer",
                    expires_in: 3600,
                    refresh_expires_in: 7200,
                    session_state: "e2e-session",
                    scope: "openid profile email",
                    "not-before-policy": 0,
                },
            }),
        );

        const api = await installApiMock(page);
        await use(api);
    },
});

export { expect };
