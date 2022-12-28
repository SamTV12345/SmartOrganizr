import {apiURL} from "../Keycloak";
import axios from "axios";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {ConcertDto} from "../models/ConcertDto";
import {useEffect, useState} from "react";
import {concertActions} from "../store/slices/ConcertSlice";
import {ConcertYear} from "../components/ConcertYear";
import {ConcertItem} from "../components/ConcertItem";
import {setModalOpen, setOpenAddModal} from "../ModalSlice";
import {AddConcertModal} from "../components/modals/AddConcertModal";

export const ConcertView = ()=>{
    const concertsOfUser = useAppSelector(state=>state.concertReducer.concerts)
    const dispatch = useAppDispatch()
    let currentYear=0

    useEffect(()=>{
    retrieveConcertsOfUser()
    }, [])



    const retrieveConcertsOfUser = ()=>{
        axios.get(apiURL+"/v1/concerts")
            .then(resp=>dispatch(concertActions.setConcerts(resp.data)))
            .catch(error=>console.log(error))
    }

    return <div className="md:ml-8 mt-4 md:mr-4">
        <AddConcertModal/>
        <div id="menubar" className="justify-end flex" onClick={()=>{
            dispatch(setOpenAddModal(true))
        }
        }><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        </div>
        {
           concertsOfUser.map((c)=>{
               const currentDate = new Date(c.dueDate)

               if(currentDate.getUTCFullYear()!==currentYear){

                   currentYear = currentDate.getFullYear()
                   return <>
                        <ConcertYear year={currentDate.getFullYear()} keyNum={c.id+"year"}/>
                       <ConcertItem concert={c} keyNum={c.id}/>
                   </>
               }
               else{
                   return <ConcertItem concert={c} keyNum={c.id}/>
               }
           })
        }
    </div>
}