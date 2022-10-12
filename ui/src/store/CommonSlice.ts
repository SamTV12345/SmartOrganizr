import {createSlice} from '@reduxjs/toolkit'
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import TreeNode from "primereact/treenode";


// Define a type for the slice state
interface CommonProps {
    sideBarCollapsed: boolean,
    authorPage: Page<AuthorEmbeddedContainer<Author>> | undefined,
    nodes: TreeNode[]
}

// Define the initial state using that type
const initialState: CommonProps = {
    sideBarCollapsed: false,
    authorPage: undefined,
    nodes: []
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
        }
    }

})

export const {setSideBarCollapsed, setAuthorPage, setNodes} = commonSlice.actions

export default commonSlice.reducer