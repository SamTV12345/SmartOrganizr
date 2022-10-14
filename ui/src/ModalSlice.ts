import {createSlice} from '@reduxjs/toolkit'
import {Author} from "./models/Author";
import {NoteItem} from "./models/NoteItem";


// Define a type for the slice state
interface ModalProps {
    openModal:boolean,
    selectedAuthor: Author| undefined,
    selectedAuthorNotes: NoteItem[]| undefined
}

// Define the initial state using that type
const initialState: ModalProps = {
    openModal: false,
    selectedAuthor: undefined,
    selectedAuthorNotes: undefined
}

export const modalSlice = createSlice({
    name: 'modalSlice',
    initialState,
    reducers: {
        setModalOpen: (state, action)=>{
            state.openModal = action.payload
        },
        setAuthor: (state, action)=>{
            state.selectedAuthor  = action.payload
        },
        setAuthorName: (state, action)=>{
            if(state.selectedAuthor!== undefined) {
                state.selectedAuthor = {name: action.payload,extraInformation:state.selectedAuthor.extraInformation, id: state.selectedAuthor.id}
            }
        },
        setSelectedAuthorNotes:(state, action)=>{
            state.selectedAuthorNotes = action.payload
        }
    }

})

export const {setModalOpen, setAuthor, setSelectedAuthorNotes} = modalSlice.actions

export default modalSlice.reducer