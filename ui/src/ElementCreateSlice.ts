import {createSlice} from "@reduxjs/toolkit";


interface ElementProps {
    name: string,
    description: string,
    parent: number | undefined,
    // Note
    author: number | undefined,
    authorName:string,
    numberOfPages: number,
    type:string,
    searchParentName: string|undefined
}

const elementInitialState: ElementProps = {
    name: '',
    description: '',
    parent: undefined,
    authorName:'',
    author: undefined,
    numberOfPages: 0,
    searchParentName:undefined,
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
            //id
            state.parent = action.payload
        },
        setElementAuthor: (state, action)=>{
            state.author = action.payload
        },
        setElementNumberOfPages:(state, action)=>{
            state.numberOfPages = Number(action.payload)
        },
        setElementSelectedAuthorName:(state, action)=>{
            state.authorName = action.payload
        },
        setElementType: (state, action)=>{
            state.type = action.payload
        },
        setElementParentName: (state, action)=>{
            //name
            state.searchParentName = action.payload
        }
    }
})

export const {setElementName,setElementNumberOfPages,setElementDescription,setElementParent
    ,setElementType,setElementAuthor, setElementParentName, setElementSelectedAuthorName} = elementSlice.actions

export default elementSlice.reducer