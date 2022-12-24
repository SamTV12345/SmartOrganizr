import {ConcertDto} from "../models/ConcertDto";
import {FC, useState} from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {concertActions} from "../store/slices/ConcertSlice";
import {AddNoteToConcert} from "./AddNoteToConcert";
import {setModalOpen} from "../ModalSlice";

interface ConcertItem {
    concert: ConcertDto,
    keyNum:string
}

export const ConcertItem:FC<ConcertItem> = ({concert, keyNum})=>{
    const [isNotesOpen, setNotesOpen] = useState<boolean>(false)
    const [isTipOpen, setTipOpen] = useState<boolean>(false)
    const [isAdditionalTipsOpen, setAdditionalTipsOpen] = useState<boolean>(false)
    const dispatch = useAppDispatch()
    const openModal = useAppSelector(state=>state.modalReducer.openModal)

    console.log(concert.noteInConcerts)
    return <div id="accordion-collapsed" className="mt-4 w-full" data-accordion="collapse" key={keyNum}>
        <input  className="text-xl" value={concert.title} onChange={(e)=>dispatch(concertActions.updateConcert({
            id: concert.id,
            dueDate: concert.dueDate,
            title: e.target.value,
            description:concert.description,
            noteInConcerts: concert.noteInConcerts,
            location: concert.location
        }))}/>
        <h3 id="accordion-collapse-heading-1"  onClick={()=>setNotesOpen(!isNotesOpen)}>
            <button type="button"
                    className="flex items-center justify-between w-full p-5 font-medium text-left text-gray-500 border border-b-0 border-gray-200 rounded-t-xl"
                    data-accordion-target="#accordion-collapse-body-1" aria-expanded="true"
                    aria-controls="accordion-collapse-body-1">
                <span>Enthaltene Stücke</span>
                <div onClick={()=>{
                    dispatch(concertActions.setSelectedConcert(concert.id))
                    dispatch(setModalOpen(true))}}>+</div>
                {openModal&&<AddNoteToConcert/>}
                <svg data-accordion-icon className={`w-6 h-6 shrink-0 ${isNotesOpen?'rotate-180':''}`} fill="currentColor" viewBox="0 0 20 20"
                     xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"></path>
                </svg>
            </button>
        </h3>
        <div id="accordion-collapse-body-1" className={isNotesOpen?'visible':'hidden'} aria-labelledby="accordion-collapse-heading-1">
            <div className="p-5 font-light border border-b-0">
                <ol>
                    {concert.noteInConcerts.map(note=><li className="list-decimal" key={note.noteId}>{note.noteInConcert.title}</li>)}
                </ol>
            </div>
        </div>
        <h2 id="accordion-collapse-heading-2" onClick={()=>setTipOpen(!isTipOpen)}>
            <button type="button"
                    className="flex items-center justify-between w-full p-5 font-medium text-left text-gray-500 border border-b-0 border-gray-200"
                    data-accordion-target="#accordion-collapse-body-2" aria-expanded="false"
                    aria-controls="accordion-collapse-body-2">
                <span>Hinweise</span>
                <svg data-accordion-icon className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 20 20"
                     xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"></path>
                </svg>
            </button>
        </h2>
        <div id="accordion-collapse-body-2" className={isTipOpen?'visible':'hidden'} aria-labelledby="accordion-collapse-heading-2">
                <div className="p-5 font-light border border-b-0 border-gray-200">
                    <div className="grid grid-cols-2">
                        <div>Datum</div>
                        <input type="datetime-local" value={new Date(concert.dueDate).toISOString().split('.')[0]} onChange={(e)=>dispatch(concertActions.updateConcert({
                            id: concert.id,
                            dueDate: e.target.value,
                            title: concert.title,
                            description:concert.description,
                            noteInConcerts: concert.noteInConcerts,
                            location: concert.location
                        }))}/>

                        <div>Ort</div>
                        <input value={concert.location} onChange={(e)=>dispatch(concertActions.updateConcert({
                            id: concert.id,
                            dueDate: concert.dueDate,
                            title: concert.title,
                            description:concert.description,
                            noteInConcerts: concert.noteInConcerts,
                            location: e.target.value
                        }))}/>

                        <div>Beschreibung</div>
                        <input value={concert.description} onChange={(e)=>dispatch(concertActions.updateConcert({
                            id: concert.id,
                            dueDate: concert.dueDate,
                            title: concert.title,
                            description:e.target.value,
                            noteInConcerts: concert.noteInConcerts,
                            location: concert.location
                        }))}/>

                        <div className="flex flex-row-reverse col-span-2">
                        <button className="bg-blue-700 text-white p-2 rounded">Speichern</button>
                        </div>
                    </div>
                </div>
        </div>
        <h2 id="accordion-collapse-heading-3" onClick={()=>setAdditionalTipsOpen(!isAdditionalTipsOpen)}>
            <button type="button"
                    className="flex items-center justify-between w-full p-5 font-medium text-left text-gray-500 border border-gray-200"
                    data-accordion-target="#accordion-collapse-body-3" aria-expanded="false"
                    aria-controls="accordion-collapse-body-3">
                <span>Weitere Hinweise</span>
                <svg data-accordion-icon className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 20 20"
                     xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"></path>
                </svg>
            </button>
        </h2>
        <div id="accordion-collapse-body-3"  className={isAdditionalTipsOpen?'visible':'hidden'} aria-labelledby="accordion-collapse-heading-3">
            <div className="p-5 font-light border border-t-0 border-gray-200">

            </div>
        </div>
    </div>

}