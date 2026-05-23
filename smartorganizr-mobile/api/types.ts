export type ConfigModel = {
    clientId : string,
    url: string
    realm: string
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

export type PageInfo = {
    size: number
    number: number
    totalElements: number
    totalPages: number
}

export type PagedEmbeddedResponse<T> = {
    _embedded: {
        noteRepresentationModelList: T[]
    },
    page: PageInfo
}

export type NoteResponse = PagedEmbeddedResponse<Note>;
export type FolderResponse = {
    _embedded: {
        elementRepresentationModelList: Folder[]
    },
    page: PageInfo
}

export type Note = {
    author: Author,
    numberOfPages: number,
    pdfAvailable: boolean,
    creationDate: string,
    id: string,
    name: string,
    parent: Folder
}

export type NoteDetail = {
    currentNote?: Note
    previousNote?: Note
    nextNote?: Note
    index: number
}
