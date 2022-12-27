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

    return  <div className="grid grid-cols-2 mt-5 col-span-2">
        <div>{t('author')}</div>
        <div>
            <input value={authorName}
                   className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400
                    text-white focus:ring-blue-500 focus:border-blue-500" onChange={(v) => {
                !typed && setTyped(true)
                dispatch(setElementSelectedAuthorName(v.target.value))
            }}
            />
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
    </div>
}