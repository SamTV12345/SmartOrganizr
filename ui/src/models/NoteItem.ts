import {Author} from "./Author";
import {ElementItem} from "./ElementItem";
import {Folder} from "./Folder";

export interface NoteItem extends ElementItem {
    title: string,
    name:string,
    author: Author,
    numberOfPages: number
    parent:Folder
}