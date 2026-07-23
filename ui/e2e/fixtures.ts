import { test as base, expect, Page } from "@playwright/test";

export const E2E_USER = { sub: "e2e-user", name: "E2E User", email: "e2e@test.local" };
export const CLUB_ID = "club-e2e-1";

// A tiny API-mock helper. Register JSON (or empty-204) responses for /api/** calls
// keyed by an URL substring; the newest matching registration wins so a spec can
// override a base route. Anything unmatched returns 404 so a missing mock is loud.
export type ApiMock = {
    json: (urlSubstring: string, body: unknown, opts?: { method?: string; status?: number }) => void;
    empty: (urlSubstring: string, opts?: { method?: string; status?: number }) => void;
};

async function installApiMock(page: Page): Promise<ApiMock> {
    type Rule = { urlSubstring: string; method?: string; status: number; body?: unknown };
    const rules: Rule[] = [];

    await page.route("**/api/**", async (route) => {
        const req = route.request();
        const url = req.url();
        const method = req.method();
        // last registered wins
        for (let i = rules.length - 1; i >= 0; i--) {
            const r = rules[i];
            if (!url.includes(r.urlSubstring)) continue;
            if (r.method && r.method !== method) continue;
            if (r.body === undefined) return route.fulfill({ status: r.status });
            return route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.body) });
        }
        return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: `no mock for ${method} ${url}` }) });
    });

    return {
        json: (urlSubstring, body, opts) => rules.push({ urlSubstring, method: opts?.method, status: opts?.status ?? 200, body }),
        empty: (urlSubstring, opts) => rules.push({ urlSubstring, method: opts?.method, status: opts?.status ?? 204 }),
    };
}

// Baseline club so ClubDetailView renders. Feature specs add their tab's routes on top.
export function baseClub(overrides: Record<string, unknown> = {}) {
    return {
        id: CLUB_ID,
        name: "E2E Blasorchester",
        club_type: "musikverein",
        dates_visible_for_all_members: true,
        members_can_send_messages: true,
        ...overrides,
    };
}

export const test = base.extend<{ api: ApiMock }>({
    api: async ({ page }, use) => {
        await page.addInitScript((user) => {
            (window as unknown as { __E2E_AUTH__: unknown }).__E2E_AUTH__ = user;
        }, E2E_USER);
        const api = await installApiMock(page);
        await use(api);
    },
});

export { expect };
