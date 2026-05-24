// Frontend types for the Wikidata autocomplete endpoints. These mirror the
// Go DTOs in api_go/controllers/dto/AutocompleteDto.go. Once the OpenAPI
// schema is regenerated via `npm run gen:api`, prefer the generated types
// in src/api/types.ts and delete this file.

export interface AutocompleteAuthor {
    id?: string;
    wikidataId?: string;
    name: string;
    description?: string;
    birthYear?: number;
    deathYear?: number;
}

export interface AutocompleteWork {
    id?: string;
    wikidataId?: string;
    name: string;
    description?: string;
    compositionYear?: number;
    genre?: string;
    composer?: AutocompleteAuthor;
    arranger?: AutocompleteAuthor;
}

export interface AutocompleteWorksResponse {
    local: AutocompleteWork[];
    external: AutocompleteWork[];
}

export interface AutocompleteAuthorsResponse {
    local: AutocompleteAuthor[];
    external: AutocompleteAuthor[];
}

export interface WorkFromWikidataRequest {
    wikidataId: string;
    parentId: string;
    forceNewAuthor?: boolean;
}

export interface WorkFromWikidataConflict {
    incoming: AutocompleteAuthor;
    candidates: AutocompleteAuthor[];
}
