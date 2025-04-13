import {FolderItem} from "./Folder";
import {NoteItem} from "@/src/models/NoteItem";

export type ElementItem = NoteItem|FolderItem



export const isNote = (element: ElementItem): element is NoteItem => {
    return element && element.type === 'note';
}


export const isFolder = (element: ElementItem): element is FolderItem => {
    return element && element.type === 'folder';
}
