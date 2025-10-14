import {createSlice, PayloadAction} from '@reduxjs/toolkit'
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import {TreeData} from "../components/Tree";
import {NoteItem} from "../models/NoteItem";
import {ElementEmbeddedContainer} from "../models/ElementEmbeddedContainer";


// Define a type for the slice state
interface CommonProps {
    sideBarCollapsed: boolean,
    authorPage: Page<AuthorEmbeddedContainer<Author>> | undefined,
    authorSearchText: string
    loadedFolders: string[],
    noteSearchText: string,
    elementsSearched: Page<ElementEmbeddedContainer<NoteItem>>| undefined
}

// Define the initial state using that type
const initialState: CommonProps = {
    sideBarCollapsed: false,
    noteSearchText:'',
    authorPage: undefined,
    authorSearchText: '',
    loadedFolders:[],
    elementsSearched: undefined
}

export const commonSlice = createSlice({
    name: 'commonSlice',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setSideBarCollapsed: (state, action) => {
            state.sideBarCollapsed = action.payload
        },
        setAuthorPage: (state, action) => {
            state.authorPage = action.payload
        },
        setAuthorSearchText: (state,action )=>{
            state.authorSearchText = action.payload
        },
        setLoadedFolders:(state, action)=>{
            state.loadedFolders = [...state.loadedFolders,action.payload]
        },
        setNotesSearched:(state, action)=>{
            state.elementsSearched = action.payload
        },
        setNotesSearchText:(state, action)=>{
            state.noteSearchText = action.payload
        }
    }
})

export const {setSideBarCollapsed, setAuthorPage, setAuthorSearchText, setLoadedFolders, setNotesSearched, setNotesSearchText} = commonSlice.actions

    export default commonSlice.reducer
