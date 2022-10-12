import {Author} from "./Author";
import {ElementItem} from "./ElementItem";

export interface NoteItem extends ElementItem {
    title: string,
    author: Author,
    numberOfPages: number
}