import {NoteItem} from "./NoteItem";

export interface ConcertDto {
    id: string,
    title:string,
    description: string,
    dueDate: string,
    location:string,
    noteInConcerts: NoteItem[]
}