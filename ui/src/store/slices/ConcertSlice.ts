import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {ConcertDto} from "../../models/ConcertDto";
import exp from "constants";

interface ConcertSliceProps {
    concerts: ConcertDto[]
}


const initialState: ConcertSliceProps = {
    concerts: []
}
export const concertSlice = createSlice({
    name: 'commonSlice',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setConcerts : (state, action:PayloadAction<ConcertDto[]>)=>{
            state.concerts = action.payload
        }
    }
})

export const concertReducer = concertSlice.reducer
export const concertActions = concertSlice.actions