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
