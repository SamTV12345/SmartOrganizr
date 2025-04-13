import {setSelectedAuthorName, setSelectedFolderAuthor} from "../../ModalSlice";
import React, {useState} from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {Page} from "../../models/Page";
import {AuthorEmbeddedContainer} from "../../models/AuthorEmbeddedContainer";
import {Author} from "../../models/Author";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import axios from "axios";
import {setElementAuthor} from "../../ElementCreateSlice";
import {useTranslation} from "react-i18next";
import {FormInput} from "../form/FormInput";
import {isNote} from "@/src/models/ElementItem";

export const NoteAuthorSearchBar = ()=> {
    const dispatch = useAppDispatch()
    const {t} =useTranslation()
    const selectedFolder = useAppSelector(state => state.modalReducer.selectedFolder)
    const [typed, setTyped] = useState<boolean>()
    const selectedAuthorId = useAppSelector(state=>state.elementReducer.author)
    const [currentSearchAuthors, setCurrentSearchAuthors] = useState<Page<AuthorEmbeddedContainer<Author>>>()


    const loadAuthors = async (link: string) => {
        const authorsInResponse: Page<AuthorEmbeddedContainer<Author>> = await new Promise<Page<AuthorEmbeddedContainer<Author>>>(resolve => {
            axios.get(link)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (authorsInResponse !== undefined) {
            setCurrentSearchAuthors(authorsInResponse)
        }
    }

    useDebounce(() => {
        if (selectedFolder && isNote(selectedFolder))
            loadAuthors(apiURL + `/v1/authors?page=0&name=${selectedFolder?.author?.name}`)
    }, 1000, [selectedFolder])

    return selectedFolder?.type !== 'folder'?
        <>
            <FormInput id={'author'} label={t('author')} value={selectedFolder?.author?.name as string} onChange={(v) => {
                !typed && setTyped(true)
                dispatch(setSelectedAuthorName(v))
            }}/>
        <div>
            <i className="fa fa-check" onClick={() => {
                if (selectedAuthorId !== "") {
                    dispatch(setSelectedFolderAuthor(currentSearchAuthors?._embedded.authorRepresentationModelList.find(a => a.id === selectedAuthorId)))
                }
            }}/>
        </div>
        <div/>
        {typed && <ul>
            {currentSearchAuthors && currentSearchAuthors._embedded &&
                currentSearchAuthors._embedded.authorRepresentationModelList.map(a =>
                    <li key={a.id}
                        className={`${selectedAuthorId === a.id ? 'bg-gray-500 ' : ''}text-center`}
                        onClick={() => dispatch(setElementAuthor(a.id))}>{a.name}</li>)}
        </ul>}</>
    :<div></div>
}