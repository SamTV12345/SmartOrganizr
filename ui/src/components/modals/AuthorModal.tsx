import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {NoteItem} from "../../models/NoteItem";
import axios from "axios";
import {apiURL} from "../../Keycloak";
import {setAuthorExtraInformation, setAuthorName, setSelectedAuthorNotes} from "../../ModalSlice";
import React, {useEffect} from "react";
import {useTranslation} from "react-i18next";
import {FormInput} from "../form/FormInput";

export const AuthorModal = ()=>{
    const selectedAuthor = useAppSelector(state=>state.modalReducer.selectedAuthor)
    const selectedAuthorsNotes = useAppSelector(state=>state.modalReducer.selectedAuthorNotes)
    const openModal = useAppSelector(state=>state.modalReducer.openModal)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()

    const loadAuthorNotes = async (selectedAuthorId:string)=> {
        if(selectedAuthorId=== undefined){
            return
        }
        const authorsInResponse: NoteItem[] = await new Promise<NoteItem[]>(resolve => {
            axios.get(apiURL + `/v1/authors/${selectedAuthorId}/notes`)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (authorsInResponse !== undefined) {
            dispatch(setSelectedAuthorNotes(authorsInResponse))
        }
    }

    useEffect(()=>{
        if(openModal && selectedAuthor !== undefined){
            loadAuthorNotes(selectedAuthor.id)
        }
    },[])

    return <div className="grid grid-cols-2 gap-5">
        <FormInput id={'name'} label={t('name')} value={selectedAuthor?.name as string} onChange={(v)=>dispatch(setAuthorName(v))}/>
        <FormInput id={'extraInformation'} label={t('extraInformation')} value={selectedAuthor?.extraInformation as string} onChange={(v)=>dispatch(setAuthorExtraInformation(v))}/>

    <div className="col-span-2 text-center grid grid-cols-2">{t('containedNotes')}</div>
    {
        selectedAuthorsNotes&&selectedAuthorsNotes.map((note, index)=> <React.Fragment key={index+"Index"}>
            <div key={index}>#{index+1}</div>
            <div key={index+"title"}>{note.name}</div>
        </React.Fragment>)
    }
    </div>
}