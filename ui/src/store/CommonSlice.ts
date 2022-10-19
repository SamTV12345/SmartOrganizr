import {createSlice} from '@reduxjs/toolkit'
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
    nodes: TreeData[],
    authorSearchText: string
    loadedFolders: number[],
    noteSearchText: string,
    elementsSearched: Page<ElementEmbeddedContainer<NoteItem>>| undefined
}

// Define the initial state using that type
const initialState: CommonProps = {
    sideBarCollapsed: false,
    noteSearchText:'',
    authorPage: undefined,
    nodes: [],
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
        setNodes: (state, action) => {
            state.nodes = action.payload
        },
        setAuthorSearchText: (state, action)=>{
            state.authorSearchText = action.payload
        },
        setLoadedFolders:(state, action)=>{
            state.loadedFolders = [...state.loadedFolders,action.payload]
        },
        setNotesSearched:(state, action)=>{
            console.log(action.payload)
            state.elementsSearched = action.payload
        },
        setNotesSearchText:(state, action)=>{
            state.noteSearchText = action.payload
        }
    }
})

export const {setSideBarCollapsed, setAuthorPage, setNodes, setAuthorSearchText, setLoadedFolders, setNotesSearched, setNotesSearchText} = commonSlice.actions

export default commonSlice.reducer