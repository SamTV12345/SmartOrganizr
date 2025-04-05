import {ApiLink} from "./ApiLink";
import {ElementItem} from "./ElementItem";

export interface Folder extends ElementItem {
    links: ApiLink[],
    length: number
}


export type FolderPostDto = {
    name: string
    description?: string
    parentId: string
}