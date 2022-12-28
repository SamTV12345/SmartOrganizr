import {ConcertDto} from "../models/ConcertDto";
import React, {FC, useState} from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {concertActions} from "../store/slices/ConcertSlice";
import {AddNoteToConcert} from "./modals/AddNoteToConcert";
import {setModalOpen} from "../ModalSlice";
import {Accordeon} from "./layout/Accordeon";
import {FormInput} from "./form/FormInput";
import {apiURL} from "../Keycloak";
import axios from "axios";
import {AccordeonItem} from "./layout/AccordeonItem";
import {TrashIcon} from "./icons/TrashIcon";
import {FormTextArea} from "./form/FormTextArea";

interface ConcertItem {
    concert: ConcertDto,
    keyNum: string
}

export const ConcertItem: FC<ConcertItem> = ({concert, keyNum}) => {
    const dispatch = useAppDispatch()
    const openModal = useAppSelector(state => state.modalReducer.openModal)

    return <Accordeon keyNum={keyNum}>
        <div className="grid grid-cols-2 pb-2">
            <FormInput className="text-xl" value={concert.title} onBlur={() => {
                axios.put(apiURL + "/v1/concerts/" + concert.id, concert)
                    .then(() => {

                    })
            }} onChange={(e) => dispatch(concertActions.updateConcert({
                id: concert.id,
                dueDate: concert.dueDate,
                title: e,
                description: concert.description,
                noteInConcerts: concert.noteInConcerts,
                location: concert.location,
                hints: concert.hints
            }))} id={"title"} label={"Konzert"}/>
        </div>
        <AccordeonItem title={"Enthaltene Stücke"} first>
            <div className="grid place-items-end" onClick={() => {
                dispatch(concertActions.setSelectedConcert(concert.id))
                dispatch(setModalOpen(true))
            }}>+
            </div>
            {openModal && <AddNoteToConcert/>}
            <div className="grid grid-cols-1 gap-4">
                {concert.noteInConcerts.map(note => <div className="flex"
                                                        key={note.noteInConcert.id+"inplace"}>{note.noteInConcert.title}
                <TrashIcon onClick={()=>{
                    axios.delete(apiURL + "/v1/concerts/" + concert.id + "/" + note.noteInConcert.id)
                        .then(()=>{
                            dispatch(concertActions.removeNoteFromConcert({concertId: concert.id, noteId: note.noteInConcert.id}))
                        })
                }}/>
                </div>)}
            </div>
        </AccordeonItem>

        <AccordeonItem title={"Hinweise"}>
            <div className="grid grid-cols-2 gap-4">

                <FormInput id={"date"} type={"date"} label={"Datum"} value={new Date(concert.dueDate).toISOString().split('T')[0]}
                           onChange={(e) => dispatch(concertActions.updateConcert({
                    id: concert.id,
                    dueDate: e,
                    title: concert.title,
                    description: concert.description,
                    noteInConcerts: concert.noteInConcerts,
                    location: concert.location,
                               hints: concert.hints
                           }))}/>
                <FormInput id={"location"} label={"Ort"} value={concert.location}
                           onChange={(e) => dispatch(concertActions.updateConcert({
                    id: concert.id,
                    dueDate: concert.dueDate,
                    title: concert.title,
                    description: concert.description,
                    noteInConcerts: concert.noteInConcerts,
                    location: e,
                               hints: concert.hints
                           }))}/>

                <FormInput id={"description"} label={"Beschreibung"} value={concert.description}
                           onChange={(e) => dispatch(concertActions.updateConcert({
                    id: concert.id,
                    dueDate: concert.dueDate,
                    title: concert.title,
                    description: e,
                    noteInConcerts: concert.noteInConcerts,
                    location: concert.location,
                               hints: concert.hints
                           }))}/>

                <div className="flex flex-row-reverse col-span-2">
                    <button className="bg-blue-700 text-white p-2 rounded" onClick={() => {
                        axios.put(apiURL + "/v1/concerts/" + concert.id, concert)
                            .then(() => {

                            })
                    }}>Speichern</button>
                </div>
            </div>
        </AccordeonItem>

        <AccordeonItem title={"Weitere Hinweise"}>
            <FormTextArea value={concert.hints} onChange={(v)=>{
                dispatch(concertActions.updateConcert({
                    id: concert.id,
                    dueDate: concert.dueDate,
                    title: concert.title,
                    description: concert.description,
                    noteInConcerts: concert.noteInConcerts,
                    location: concert.location,
                    hints: v
                }))
            }} />

            <div className="flex flex-row-reverse col-span-2 mt-4">
                <button className="bg-blue-700 text-white p-2 rounded" onClick={() => {
                    axios.put(apiURL + "/v1/concerts/" + concert.id, concert)
                        .then(() => {
                        })
                }}>Speichern</button>
            </div>
        </AccordeonItem>
    </Accordeon>

}