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
import {choiceFolder} from "../../utils/Constants";
import {useTranslation} from "react-i18next";

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
        if (selectedFolder && selectedFolder.author && selectedFolder.author.name.length > 0)
            loadAuthors(apiURL + `/v1/authors?page=0&name=${selectedFolder?.author?.name}`)
    }, 1000, [selectedFolder?.author?.name])

    return selectedFolder?.type !== choiceFolder? <div className="grid grid-cols-2 mt-5 col-span-2">
        <div>{t('author')}</div>
        <div>
            <input value={selectedFolder?.author?.name}
                   className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400
                    text-white focus:ring-blue-500 focus:border-blue-500" onChange={(v) => {
                !typed && setTyped(true)
                dispatch(setSelectedAuthorName(v.target.value))
            }}
            />
            <i className="fa fa-check" onClick={() => {
                if (selectedAuthorId !== -100) {
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
        </ul>}
    </div>:<div></div>
}