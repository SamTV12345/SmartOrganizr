import {Author} from "./Author";
import {ElementItem} from "./ElementItem";
import {Folder} from "./Folder";

export interface NoteItem extends ElementItem {
    title: string,
    name:string,
    author: Author,
    numberOfPages: number
    parent:Folder,
    pdfAvailable: boolean,
}


export type NotePostDto = {
    authorId: string
    description?: string
    numberOfPages: number
    parentId: string
    title: string
}
