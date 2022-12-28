import {NoteItem} from "./NoteItem";
import {NoteInConcert} from "./NoteInConcert";

export interface ConcertDto {
    id: string,
    title:string,
    description: string,
    dueDate: string,
    location:string,
    noteInConcerts: NoteInConcert[],
    hints: string
}