export type ConfigModel = {
    clientId : string,
    url: string
    realm: string
    links: Record<string, Href>
}

export type Author = {
    id: string,
    extraInformation: string,
    name: string
}

export type User = {
    userId: string,
    username: string,
    sideBarCollapsed: boolean,
    profilePicUrl: string,
}

export type Folder = {
    creationDate: string,
    id: string,
    name: string,
    parent: Folder|undefined,
    description: string
    creator: User
}

export type PagedEmbeddedResponse<T> = {
    _embedded: {
        noteRepresentationModelList: T[]
    },
    _links: Record<string, unknown>,
    page: {
        size: number
        // ggf. weitere Felder wie totalElements, totalPages, number etc.
    }
}

export type NoteResponse = PagedEmbeddedResponse<Note>;

export type Note = {
    author: Author,
    numberOfPages: number,
    pdfAvailable: boolean,
    creationDate: string,
    id: string,
    name: string,
    parent: Folder
}

export type Href = {
    href: string
}
