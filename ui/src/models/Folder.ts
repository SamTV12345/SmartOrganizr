import {ApiLink} from "./ApiLink";
import {ElementItem} from "./ElementItem";
import {User} from "@/src/models/User";

export type FolderItem = {
    creationDate: Date,
    id: string,
    name: string,
    parent?: FolderItem,
    description: string,
    creator: User,
    elements: ElementItem[]
    links: ApiLink[]
    type: 'folder'
}


export type FolderPostDto = {
    name: string
    description?: string
    parentId?: string
}