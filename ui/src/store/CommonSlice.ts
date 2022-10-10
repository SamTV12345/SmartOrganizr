import { createSlice } from '@reduxjs/toolkit'


// Define a type for the slice state
interface CommonProps {
    sideBarCollapsed: boolean,
}

// Define the initial state using that type
const initialState: CommonProps = {
    sideBarCollapsed: false,
}

export const commonSlice = createSlice({
    name: 'commonSlice',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        setSideBarCollapsed: (state, action)=>{
            state.sideBarCollapsed = action.payload
        }
    }
})

export const { setSideBarCollapsed } = commonSlice.actions

export default commonSlice.reducer