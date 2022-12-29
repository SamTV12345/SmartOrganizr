import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {ConcertDto} from "../../models/ConcertDto";
import exp from "constants";

interface ConcertSliceProps {
    concerts: ConcertDto[],
    selectedConcert: string
}


const initialState: ConcertSliceProps = {
    concerts: [],
    selectedConcert: ''
}


type DeleteProps = {
    concertId:string,
    noteId: number
}

type SwapProps  = {
    concertId:string,
    noteId1:number,
    noteId2:number
}

export const concertSlice = createSlice({
    name: 'commonSlice',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setConcerts : (state, action:PayloadAction<ConcertDto[]>)=>{
            state.concerts = action.payload
        },
        updateConcert: (state, action:PayloadAction<ConcertDto>)=>{
            state.concerts = state.concerts.map(c=>c.id==action.payload.id?action.payload: c)
        },
        setSelectedConcert: (state, action:PayloadAction<string>)=>{
            state.selectedConcert = action.payload
        },
        removeNoteFromConcert:(state, action:PayloadAction<DeleteProps>)=>{
            const foundConcert = state.concerts.filter(c=> c.id==action.payload.concertId)[0]
            foundConcert.noteInConcerts = foundConcert.noteInConcerts
                .filter(n=>n.noteInConcert.id!=action.payload.noteId)
        },
        removeConcert(state, action:PayloadAction<string>) {
            state.concerts = state.concerts
                                  .filter(c=>c.id!=action.payload)
        },
        swapNotesInConcert(state, action:PayloadAction<SwapProps>){
            const foundConcert = state.concerts.filter(c=> c.id==action.payload.concertId)[0]
            const x = foundConcert.noteInConcerts.findIndex(a=> a.noteInConcert.id === action.payload.noteId1)
            const y = foundConcert.noteInConcerts.findIndex(b=> b.noteInConcert.id === action.payload.noteId2)

            // Swap place
            const placeX = foundConcert.noteInConcerts[x].placeInConcert
            const placeY = foundConcert.noteInConcerts[y].placeInConcert

            foundConcert.noteInConcerts[x].placeInConcert = placeY
            foundConcert.noteInConcerts[y].placeInConcert = placeX

            const b = foundConcert.noteInConcerts[y];
            foundConcert.noteInConcerts[y] = foundConcert.noteInConcerts[x];
            foundConcert.noteInConcerts[x] = b;
        }
    }
})

export const concertReducer = concertSlice.reducer
export const concertActions = concertSlice.actions