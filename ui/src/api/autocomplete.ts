import { http } from "./client";
import type {
    AutocompleteAuthorsResponse,
    AutocompleteWorksResponse,
    WorkFromWikidataConflict,
    WorkFromWikidataRequest,
} from "@/src/models/Autocomplete";
import type { Note } from "@/src/api/types";

export async function fetchWorksAutocomplete(q: string): Promise<AutocompleteWorksResponse> {
    const resp = await http.get<AutocompleteWorksResponse>(
        `/api/v1/autocomplete/works`,
        { params: { q } },
    );
    return resp.data;
}

export async function fetchAuthorsAutocomplete(q: string): Promise<AutocompleteAuthorsResponse> {
    const resp = await http.get<AutocompleteAuthorsResponse>(
        `/api/v1/autocomplete/authors`,
        { params: { q } },
    );
    return resp.data;
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
