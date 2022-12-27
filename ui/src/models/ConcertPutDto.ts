import {ConcertDto} from "./ConcertDto";

export interface ConcertPutDto extends ConcertDto{
    newNotes:number[]
}