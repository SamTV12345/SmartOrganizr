import {
    setSelectedAuthorName,
    setSelectedFolderAuthor,
    setSelectedFolderDescription,
    setSelectedFolderName,
    setSelectedFolderPage
} from "../ModalSlice";
import React, {useState} from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {useDebounce} from "../utils/DebounceHook";
import {Page} from "../models/Page";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import axios from "axios";
import {apiURL} from "../Keycloak";

export const NoteModal = () => {
    const selectedFolder = useAppSelector(state => state.modalReducer.selectedFolder)
    const dispatch = useAppDispatch()
    const [typed,setTyped] = useState<boolean>()
    const [currentSearchAuthors, setCurrentSearchAuthors] = useState<Page<AuthorEmbeddedContainer<Author>>>()
    const [selectedAuthorId,setSelectedAuthorId] =useState<number>(-100)

    const loadAuthors = async (link:string)=>{
        const authorsInResponse: Page<AuthorEmbeddedContainer<Author>> = await new Promise<Page<AuthorEmbeddedContainer<Author>>>(resolve=>{
            axios.get(link)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(authorsInResponse !== undefined){
            setCurrentSearchAuthors(authorsInResponse)
        }
    }

    useDebounce(()=>{
        if(selectedFolder&& selectedFolder.author && selectedFolder.author.name.length>0)
        loadAuthors(apiURL+`/v1/authors?page=0&name=${selectedFolder?.author?.name}`)
    },1000,[selectedFolder?.author?.name])
    return<div>
        <div className="grid grid-cols-2 gap-5">
        <div>Name</div>
        <input value={selectedFolder?.name}
               className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
               onChange={(v) => dispatch(setSelectedFolderName(v.target.value))}/>
        <div>Beschreibung</div>
        <input value={selectedFolder?.description}
               className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
               onChange={(v) => dispatch(setSelectedFolderDescription(v.target.value))}/>
        <div className={`${selectedFolder?.type==='Folder'?'hidden':'visible'}`}>Anzahl an Seiten</div>
        <input type={"number"} className={`${selectedFolder?.type==='Folder'?'hidden':'visible'}`+" border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 " +
            " placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"} value={selectedFolder?.numberOfPages}
               onChange={(v)=>dispatch(setSelectedFolderPage(v.target.value))}/>
    </div>
        <div className="grid grid-cols-2 mt-5">
            <h2 className="col-span-2 text-center font-medium">Autor</h2>
            <div>Author:</div>
            <div>
            <input value={selectedFolder?.author?.name}
                   className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400
                    text-white focus:ring-blue-500 focus:border-blue-500" onChange={(v)=>{
                        !typed&&setTyped(true)
                        dispatch(setSelectedAuthorName(v.target.value))
            }}
                    />
                <i className="fa fa-check" onClick={()=>{
                    if(selectedAuthorId!==-100){
                        dispatch(setSelectedFolderAuthor(currentSearchAuthors?._embedded.authorRepresentationModelList.find(a=>a.id===selectedAuthorId)))
                    }
                }}/>
            </div>
            <div/>
            {typed&&<ul>
                {currentSearchAuthors&& currentSearchAuthors._embedded &&
                    currentSearchAuthors._embedded.authorRepresentationModelList.map(a=>
                        <li key={a.id}
                            className={`${selectedAuthorId===a.id?'bg-gray-500 ':''}text-center`} onClick={()=>setSelectedAuthorId(a.id)}>{a.name}</li>)}
            </ul>}
        </div>
    </div>
}