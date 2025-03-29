export interface Author {
    id: string,
    name: string,
    extraInformation?: string | undefined,
}


export type AuthorPostDto =  Omit<Author, "id">;
