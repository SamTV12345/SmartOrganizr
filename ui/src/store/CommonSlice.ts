import {createSlice} from '@reduxjs/toolkit'
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import {TreeData} from "../components/Tree";


// Define a type for the slice state
interface CommonProps {
    sideBarCollapsed: boolean,
    authorPage: Page<AuthorEmbeddedContainer<Author>> | undefined,
    nodes: TreeData[],
    authorSearchText: string

}

// Define the initial state using that type
const initialState: CommonProps = {
    sideBarCollapsed: false,
    authorPage: undefined,
    nodes: [],
    authorSearchText: ''
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
        }
    }

})

export const {setSideBarCollapsed, setAuthorPage, setNodes, setAuthorSearchText} = commonSlice.actions

export default commonSlice.reducer