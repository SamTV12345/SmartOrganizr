import React, {useState} from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {Page} from "../../models/Page";
import {AuthorEmbeddedContainer} from "../../models/AuthorEmbeddedContainer";
import {Author} from "../../models/Author";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import axios from "axios";
import {setElementAuthor, setElementSelectedAuthorName} from "../../ElementCreateSlice";
import {useTranslation} from "react-i18next";
import {FormInput} from "../form/FormInput";

export const NoteAuthorCreateSearchBar = ()=> {
    const dispatch = useAppDispatch()
    const [typed, setTyped] = useState<boolean>()
    const authorName = useAppSelector(state=>state.elementReducer.authorName)
    const selectedAuthorId = useAppSelector(state=>state.elementReducer.author)
    const [currentSearchAuthors, setCurrentSearchAuthors] = useState<Page<AuthorEmbeddedContainer<Author>>>()
    const {t} = useTranslation()

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
        if ( authorName && authorName.length > 0)
            loadAuthors(apiURL + `/v1/authors?page=0&name=${authorName}`)
    }, 1000, [authorName])

    return <>
        <FormInput id={'author'} label={t('author')} value={authorName} onChange={(v) => {
            !typed && setTyped(true)
            dispatch(setElementSelectedAuthorName(v))}}/>
        <div>
            <i className="fa fa-check" onClick={() => {
                if (selectedAuthorId !== -100) {
                    dispatch(setElementSelectedAuthorName(currentSearchAuthors?._embedded.authorRepresentationModelList.find(a => a.id === selectedAuthorId)?.name))
                    dispatch(setElementAuthor(currentSearchAuthors?._embedded.authorRepresentationModelList.find(a => a.id === selectedAuthorId)?.id))
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
        </ul>}
        </>
}