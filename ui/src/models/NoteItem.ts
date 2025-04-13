import {Author} from "./Author";
import {FolderItem} from "@/src/models/Folder";

export interface NoteItem {
    type: 'note',
    name: string,
    author: Author,
    numberOfPages: number
    parent:FolderItem,
    description: string,
    pdfAvailable: boolean,
    id: string
    creationDate: Date,
}


export type NotePostDto = {
    authorId: string
    description?: string
    numberOfPages: number
    parentId: string
    name: string
}
