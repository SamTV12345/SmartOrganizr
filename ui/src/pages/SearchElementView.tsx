import {useTranslation} from "react-i18next";
import {ElementSearchBar} from "../components/searchBars/ElementSearchBar";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {fixProtocol} from "../utils/Utilities";
import {Page} from "../models/Page";
import {ElementEmbeddedContainer} from "../models/ElementEmbeddedContainer";
import {NoteItem} from "../models/NoteItem";
import axios from "axios";
import {setNotesSearched} from "../store/CommonSlice";
import {TableData} from "../components/table/TableData";
import {Waypoint} from "react-waypoint";

export const SearchElementView = ()=>{
    const {t} = useTranslation()
    const searchedElements = useAppSelector(state=>state.commonReducer.elementsSearched)
    const dispatch = useAppDispatch()

    const loadNotes = async (link:string)=>{
        if(searchedElements==null){
            return
        }
        const notesInPage: Page<ElementEmbeddedContainer<NoteItem>> = await new Promise<Page<ElementEmbeddedContainer<NoteItem>>>(resolve=>{
            axios.get(link)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(notesInPage !== undefined){
            dispatch(setNotesSearched({
                _embedded: {
                    noteRepresentationModelList:[...searchedElements._embedded.noteRepresentationModelList,...notesInPage._embedded.noteRepresentationModelList]
                },
                page: notesInPage.page,
                _links: notesInPage._links
            } as Page<ElementEmbeddedContainer<NoteItem>>))
        }
    }

    return <table className="w-full md:w-8/12  divide-y table-fixed divide-gray-700 md:mx-auto md:mt-4 md:mb-4 border-collapse" id="searchTable">
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
        <tr key="searchbarElement">
            <td className="col-span-3 bg-gray-800" colSpan={4}>
                <div className="flex justify-center">
                    <ElementSearchBar/>
                </div>
            </td>
        </tr>
        {searchedElements&& searchedElements._embedded&& searchedElements._embedded.noteRepresentationModelList&& searchedElements._embedded.noteRepresentationModelList.map((element, index)=>
                <tr key={element.id}>
                    <TableData content={element.name}/>
                    <TableData content={element.author.name}/>
                    <TableData content={element.description}/>
                    <TableData content={
                        <>
                            {element.parent.name}
                            {searchedElements.page.size-index<5 &&
                                searchedElements._links && searchedElements._links.next
                                && searchedElements._links.next.href
                                && <Waypoint onEnter={()=>{
                                    loadNotes(fixProtocol(searchedElements._links.next.href))
                                }}/>}
                        </>
                    }/>
        </tr>
        )
        }
        </tbody>
    </table>
}
