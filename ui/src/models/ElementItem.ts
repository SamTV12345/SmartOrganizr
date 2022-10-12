import {Folder} from "./Folder";

export interface ElementItem {
    creationDate: Date,
    id: number,
    name: string,
    parent: Folder,
    description: string
}