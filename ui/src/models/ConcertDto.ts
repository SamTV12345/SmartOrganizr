import {NoteItem} from "./NoteItem";

export interface ConcertDto {
    id: string,
    title:string,
    description: string,
    dueData: Date,
    location:string,
    noteInConcerts: NoteItem[]
}