import { http } from "./client";
import type {
    AutocompleteAuthor,
    AutocompleteAuthorsResponse,
    AutocompleteWork,
    AutocompleteWorksResponse,
    WorkFromWikidataConflict,
    WorkFromWikidataRequest,
} from "@/src/api/types";
import type { Note } from "@/src/api/types";

// The generated response types mark local/external as optional (swag can't
// express required fields); normalize to concrete arrays here so consumers
// never have to guard.
export type WorksAutocomplete = { local: AutocompleteWork[]; external: AutocompleteWork[] };
export type AuthorsAutocomplete = { local: AutocompleteAuthor[]; external: AutocompleteAuthor[] };

export async function fetchWorksAutocomplete(q: string): Promise<WorksAutocomplete> {
    const resp = await http.get<AutocompleteWorksResponse>(
        `/api/v1/autocomplete/works`,
        { params: { q } },
    );
    return { local: resp.data.local ?? [], external: resp.data.external ?? [] };
}

export async function fetchAuthorsAutocomplete(q: string): Promise<AuthorsAutocomplete> {
    const resp = await http.get<AutocompleteAuthorsResponse>(
        `/api/v1/autocomplete/authors`,
        { params: { q } },
    );
    return { local: resp.data.local ?? [], external: resp.data.external ?? [] };
}

// createWorkFromWikidata returns the created Note on 200, or { conflict } on
// 409 — the caller must handle both branches. Any other non-2xx throws.
export type CreateWorkResult =
    | { note: Note }
    | { conflict: WorkFromWikidataConflict };

export async function createWorkFromWikidata(req: WorkFromWikidataRequest): Promise<CreateWorkResult> {
    try {
        const resp = await http.post<Note>(`/api/v1/works/from-wikidata`, req);
        return { note: resp.data };
    } catch (err) {
        const e = err as { response?: { status: number; data: unknown } };
        if (e.response?.status === 409) {
            return { conflict: e.response.data as WorkFromWikidataConflict };
        }
        throw err;
    }
}
