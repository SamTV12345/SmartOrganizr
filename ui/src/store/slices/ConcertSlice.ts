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
        }
    }
})

export const concertReducer = concertSlice.reducer
export const concertActions = concertSlice.actions