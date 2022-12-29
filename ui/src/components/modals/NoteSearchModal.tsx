import {useTranslation} from "react-i18next";
import {ElementSearchBar} from "../searchBars/ElementSearchBar";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {Waypoint} from "react-waypoint";
import {fixProtocol} from "../../utils/Utilities";
import {Page} from "../../models/Page";
import {ElementEmbeddedContainer} from "../../models/ElementEmbeddedContainer";
import {NoteItem} from "../../models/NoteItem";
import axios from "axios";
import {setNotesSearched} from "../../store/CommonSlice";
import {useState} from "react";
import {ConcertDto} from "../../models/ConcertDto";
import {apiURL} from "../../Keycloak";
import {concertActions} from "../../store/slices/ConcertSlice";
import {NoteInConcert} from "../../models/NoteInConcert";
import {NoteSearchModalTHead} from "./NoteSearchModalTHead";
import {NoteSearchModalTD} from "./NoteSearchModalTD";

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

        const notesToAdd = searchedElements._embedded.noteRepresentationModelList.filter(n=>selectedNotes.includes(n.id))
            .map(n=> {
                return {
                    noteInConcert:n,
                    placeInConcert:2
                } satisfies NoteInConcert
            })

         const uniqueArray =    [...new Map([...originalConcert.noteInConcerts, ...notesToAdd].map(item => [item.noteInConcert.id, item])).values()]
        axios.put(apiURL+"/v1/concerts"+"/"+originalConcert.id+"/notes", selectedNotes)
            .then(()=>dispatch(concertActions.updateConcert({
                id: originalConcert.id,
                noteInConcerts: uniqueArray,
                dueDate: originalConcert.dueDate,
                title: originalConcert.title,
                location: originalConcert.location,
                description: originalConcert.description,
                hints: originalConcert.hints
            })))
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
            <tr className="" key="head-notes">
            <NoteSearchModalTHead translationkey={'title'}/>
                <NoteSearchModalTHead translationkey={'author'}/>
                <NoteSearchModalTHead translationkey={'description'}/>
                <NoteSearchModalTHead translationkey={'superFolder'}/>
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
            <tr key={element.id+"tr"} className={`${selectedNotes.includes(element.id) ? 'bg-gray-900' : ''}`}
                    onClick={() => {
                        if (selectedNotes.includes(element.id)) {
                            setSelectedNotes(selectedNotes.filter(i => element.id != i));
                        } else {
                            setSelectedNotes([...selectedNotes, element.id]);
                        }
                    }}>
                    <NoteSearchModalTD children={element.title}/>
                    <NoteSearchModalTD children={element.author.name}/>
                    <NoteSearchModalTD children={element.description}/>
                    <NoteSearchModalTD children={element.parent.name}
                                       {...(searchedElements.page.size - index < 5) && searchedElements._links && searchedElements._links.next
                                           && searchedElements._links.next.href
                                           && <Waypoint onEnter={() => {
                                               loadNotes(fixProtocol(searchedElements._links.next.href));
                                           }}/>
                                       }
                    />
                </tr>
            )}
            </tbody>
        </table>
    </>
}