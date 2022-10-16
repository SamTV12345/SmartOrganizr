import {createSlice} from "@reduxjs/toolkit";


interface ElementProps {
    name: string,
    description: string,
    parent: number | undefined,
    // Note
    title: string,
    author: number | undefined,
    numberOfPages: number,
    type:string
}

const elementInitialState: ElementProps = {
    name: '',
    description: '',
    parent: undefined,
    author: undefined,
    numberOfPages: 0,
    title: '',
    type:'Note'
}

export const elementSlice = createSlice({
    initialState: elementInitialState,
    name: 'ElementSlice',
    reducers: {
        setElementName: (state, action) => {
            state.name = action.payload
        },
        setElementDescription:(state, action)=>{
            state.description = action.payload
        },
        setElementParent: (state, action)=>{
            state.parent = action.payload
        },
        setElementTitle: (state, action)=>{
            state.title = action.payload
        },
        setElementAuthor: (state, action)=>{
            state.author = action.payload
        },
        setElementNumberOfPages:(state, action)=>{
            state.numberOfPages = action.payload
        },
        setElementType: (state, action)=>{
            state.type = action.payload
        }
    }
})

export const {setElementName,setElementNumberOfPages,setElementDescription,setElementParent,
                setElementTitle,setElementType,setElementAuthor} = elementSlice.actions

export default elementSlice.reducer