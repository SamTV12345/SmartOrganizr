import {setNotesSearched, setNotesSearchText} from "../store/CommonSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {Page} from "../models/Page";
import axios from "axios";
import {ElementEmbeddedContainer} from "../models/ElementEmbeddedContainer";
import {NoteItem} from "../models/NoteItem";
import {useDebounce} from "../utils/DebounceHook";
import {apiURL} from "../Keycloak";
import {useEffect} from "react";

export const ElementSearchBar = ()=>{
    const dispatch = useAppDispatch()
    const searchedElements = useAppSelector(state=>state.commonReducer.elementsSearched)
    const text = useAppSelector(state=>state.commonReducer.noteSearchText)

    const loadNotes = async (link:string)=>{
        const notesInPage: Page<ElementEmbeddedContainer<NoteItem>> = await new Promise<Page<ElementEmbeddedContainer<NoteItem>>>(resolve=>{
            axios.get(link)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(notesInPage !== undefined){
          dispatch(setNotesSearched(notesInPage))
        }
    }

    useEffect(()=>{
            loadNotes(apiURL+`/v1/elements/notes?page=0`)
        },[])

    useDebounce(()=>{
        loadNotes(apiURL+`/v1/elements/notes?page=0&noteName=${text}`)
        },
        1000,[text])

    return <input className="w-8/12 m-2 bg-gray-700 text-white pl-3 pr-3" value={text} onChange={v=>dispatch(setNotesSearchText(v.target.value))}/>

}