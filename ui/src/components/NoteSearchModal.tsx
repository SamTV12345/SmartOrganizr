import {useTranslation} from "react-i18next";
import {ElementSearchBar} from "./ElementSearchBar";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {Waypoint} from "react-waypoint";
import {fixProtocol} from "../utils/Utilities";
import {Page} from "../models/Page";
import {ElementEmbeddedContainer} from "../models/ElementEmbeddedContainer";
import {NoteItem} from "../models/NoteItem";
import axios from "axios";
import {setNotesSearched} from "../store/CommonSlice";
import {useState} from "react";
import {ConcertDto} from "../models/ConcertDto";
import {apiURL} from "../Keycloak";
import {ConcertPutDto} from "../models/ConcertPutDto";

export const NoteSearchModal = () => {
    const {t} = useTranslation()
    const searchedElements = useAppSelector(state => state.commonReducer.elementsSearched)
    const dispatch = useAppDispatch()
    const [selectedNotes, setSelectedNotes] = useState<number[]>([])
    const concerts = useAppSelector(state=>state.concertReducer.concerts)
    const selectedConcert = useAppSelector(state=>state.concertReducer.selectedConcert)

    const loadNotes = async (link: string) => {
        if (searchedElements == null) {
            return
        }
        const notesInPage: Page<ElementEmbeddedContainer<NoteItem>> = await new Promise<Page<ElementEmbeddedContainer<NoteItem>>>(resolve => {
            axios.get(link)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (notesInPage !== undefined) {
            dispatch(setNotesSearched({
                _embedded: {
                    noteRepresentationModelList: [...searchedElements._embedded.noteRepresentationModelList, ...notesInPage._embedded.noteRepresentationModelList]
                },
                page: notesInPage.page,
                _links: notesInPage._links
            } as Page<ElementEmbeddedContainer<NoteItem>>))
        }
    }

    const updateConcert = ()=>{
        if(searchedElements===undefined){
            return
        }
        const originalConcert = concerts.find(c=>c.id===selectedConcert) as ConcertDto

        axios.put(apiURL+"/v1/concerts"+"/"+originalConcert.id+"/notes", selectedNotes)
            .then()
        console.log("Updating")
    }

    return <>
        <div className="flex justify-end">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                 className={`w-6 h-6 ${selectedNotes.length>0?'text-blue-600':''}`} onClick={()=>{
                        updateConcert()
                 }
            }>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
        </div>
        <table className="w-full table-fixed divide-gray-700 md:mx-auto md:mb-4" id="searchTable">
            <thead className="bg-gray-700">
            <tr className="">
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400 md:rounded-tl-2xl">
                    <div className="flex items-center justify-center">
                        {t('title')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400">
                    <div className="flex items-center justify-center">
                        {t('author')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400">
                    <div className="flex items-center justify-center">
                        {t('description')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
                <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400 md:rounded-tr-2xl">
                    <div className="flex items-center justify-center">
                        {t('superFolder')}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
                        </svg>
                    </div>
                </th>
            </tr>
            </thead>
            <tbody className="divide-y bg-gray-800 divide-gray-700">
            <tr key="searchbarElement" className="break-words">
                <td className="col-span-3 bg-gray-800" colSpan={4}>
                    <div className="flex justify-center">
                        <ElementSearchBar/>
                    </div>
                </td>
            </tr>
            {searchedElements && searchedElements._embedded && searchedElements._embedded.noteRepresentationModelList && searchedElements._embedded.noteRepresentationModelList.map((element, index) =>
                <tr key={element.id} className={`${selectedNotes.includes(element.id) ? 'bg-gray-900' : ''}`}
                    onClick={() => {
                        if (selectedNotes.includes(element.id)) {
                            setSelectedNotes(selectedNotes.filter(i => element.id != i));
                        } else {
                            setSelectedNotes([...selectedNotes, element.id]);
                        }
                    }}>
                    <td className="py-4 px-6 text-sm font-medium text-white border-inherit text-center break-word">{element.title}</td>
                    <td className="py-4 px-6 text-sm font-medium text-white border-inherit text-center break-word">{element.author.name}</td>
                    <td className="py-4 px-6 text-sm font-medium text-white border-inherit text-center break-word">{element.description}</td>
                    <td className="py-4 px-6 text-sm font-medium text-white border-inherit text-center break-word">{element.parent.name}
                        {searchedElements.page.size - index < 5 &&
                            searchedElements._links && searchedElements._links.next
                            && searchedElements._links.next.href
                            && <Waypoint onEnter={() => {
                                loadNotes(fixProtocol(searchedElements._links.next.href));
                            }}/>}
                    </td>
                </tr>
            )}
            </tbody>
        </table>
    </>
}