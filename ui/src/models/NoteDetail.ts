import {NoteItem} from "@/src/models/NoteItem";

export type NoteDetail = {
    currentNote?: NoteItem
    previousNote?: NoteItem
    nextNote?: NoteItem
    index: number
}