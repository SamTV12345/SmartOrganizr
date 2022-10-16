import {createSlice} from '@reduxjs/toolkit'
import {Author} from "./models/Author";
import {NoteItem} from "./models/NoteItem";
import {ElementItem} from "./models/ElementItem";


// Define a type for the slice state
interface ModalProps {
    openModal:boolean,
    openAddModal: boolean,
    selectedAuthor: Author| undefined,
    selectedAuthorNotes: NoteItem[]| undefined,
    selectedFolder: ElementItem|undefined,
    createdAuthor: Author
}

// Define the initial state using that type
const initialState: ModalProps = {
    openModal: false,
    openAddModal: false,
    selectedAuthor: undefined,
    selectedAuthorNotes: undefined,
    selectedFolder: undefined,
    createdAuthor: {name:'',extraInformation:'',id:0}
}

export const modalSlice = createSlice({
    name: 'modalSlice',
    initialState,
    reducers: {
        setModalOpen: (state, action)=>{
            state.openModal = action.payload
        },
        setOpenAddModal: (state, action)=>{
            state.openAddModal = action.payload
        },
        setAuthor: (state, action)=>{
            state.selectedAuthor  = action.payload
        },
        setAuthorName: (state, action)=>{
            if(state.selectedAuthor!== undefined) {
                state.selectedAuthor.name = action.payload
            }
        },
        setAuthorExtraInformation: (state, action)=>{
            if(state.selectedAuthor!== undefined) {
                state.selectedAuthor.extraInformation = action.payload
            }
        },
        setSelectedAuthorNotes:(state, action)=>{
            state.selectedAuthorNotes = action.payload
        },
        setCreatedAuthorName: (state, action)=>{
                state.createdAuthor.name = action.payload
        },
        setCreatedAuthorExtraInformation: (state, action)=>{
                state.createdAuthor.extraInformation = action.payload
        },
        setCreatedAuthor: (state, action)=>{
            state.createdAuthor = action.payload
        },
        setSelectedFolder: (state, action)=>{
            state.selectedFolder = action.payload
        },
        setSelectedFolderName:(state, action)=>{
            if(state.selectedFolder!== undefined) {
                state.selectedFolder.name = action.payload
            }
        },
        setSelectedFolderDescription: (state, action)=>{
            if(state.selectedFolder!== undefined) {
                state.selectedFolder.description = action.payload
            }
        },
        setSelectedFolderPage: (state, action)=>{
            if(state.selectedFolder!== undefined){
                state.selectedFolder.numberOfPages = action.payload
            }
        },
        setSelectedAuthorName: (state, action)=>{
            if(state.selectedFolder!== undefined && state.selectedFolder.author){
                state.selectedFolder.author.name = action.payload
            }
        },
        setSelectedFolderAuthor: (state, action)=>{
            if(state.selectedFolder!== undefined && state.selectedFolder.author){
                state.selectedFolder.author = action.payload
            }
        }
    }
})

export const {setModalOpen, setAuthor, setSelectedAuthorNotes, setAuthorName, setAuthorExtraInformation, setOpenAddModal,
             setCreatedAuthorExtraInformation, setCreatedAuthorName, setSelectedFolderDescription, setSelectedFolder, setSelectedFolderName,
    setSelectedFolderPage, setSelectedAuthorName, setSelectedFolderAuthor} = modalSlice.actions

export default modalSlice.reducer