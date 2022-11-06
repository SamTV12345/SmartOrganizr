import {useAppDispatch, useAppSelector} from "../store/hooks";
import {NoteItem} from "../models/NoteItem";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {setAuthorExtraInformation, setAuthorName, setSelectedAuthorNotes} from "../ModalSlice";
import React, {useEffect} from "react";
import {useTranslation} from "react-i18next";

export const AuthorModal = ()=>{
    const selectedAuthor = useAppSelector(state=>state.modalReducer.selectedAuthor)
    const selectedAuthorsNotes = useAppSelector(state=>state.modalReducer.selectedAuthorNotes)
    const openModal = useAppSelector(state=>state.modalReducer.openModal)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()

    const loadAuthorNotes = async (selectedAuthorId:number)=> {
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
    },[selectedAuthor])

    return <div className="grid grid-cols-2 gap-5">
        <div>{t('name')}</div>
        <input value={selectedAuthor?.name}
               className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
                placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" onChange={(v)=>dispatch(setAuthorName(v.target.value))}/>
    <div>{t('extraInformation')}</div>
        <input value={selectedAuthor?.extraInformation}
               className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
                placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" onChange={(v)=>dispatch(setAuthorExtraInformation(v.target.value))}/>

    <div className="col-span-2 text-center grid grid-cols-2">{t('containedNotes')}</div>
    {
        selectedAuthorsNotes&&selectedAuthorsNotes.map((note, index)=> <React.Fragment key={index+"Index"}>
            <div key={index}>#{index+1}</div>
            <div key={index+"title"}>{note.title}</div>
        </React.Fragment>)
    }
    </div>
}