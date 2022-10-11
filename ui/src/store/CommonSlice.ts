import { createSlice } from '@reduxjs/toolkit'
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";


// Define a type for the slice state
interface CommonProps {
    sideBarCollapsed: boolean,
    authorPage: Page<AuthorEmbeddedContainer<Author>>| undefined
}

// Define the initial state using that type
const initialState: CommonProps = {
    sideBarCollapsed: false,
    authorPage:undefined
}

export const commonSlice = createSlice({
    name: 'commonSlice',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setSideBarCollapsed: (state, action)=>{
            state.sideBarCollapsed = action.payload
        },
        setAuthorPage:(state, action)=>{
            state.authorPage = action.payload
        },
        appendAuthorPage: (state, action)=>{

        }
    }
})

export const { setSideBarCollapsed, setAuthorPage } = commonSlice.actions

export default commonSlice.reducer