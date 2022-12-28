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
import {PlusIcon} from "../components/form/PlusIcon";

export const ConcertView = ()=>{
    const concertsOfUser = useAppSelector(state=>state.concertReducer.concerts)
    const dispatch = useAppDispatch()
    let currentYear=0

    useEffect(()=>{
        if(concertsOfUser.length===0) {
            retrieveConcertsOfUser()
        }
    }, [])



    const retrieveConcertsOfUser = ()=>{
        axios.get(apiURL+"/v1/concerts")
            .then(resp=>dispatch(concertActions.setConcerts(resp.data)))
            .catch(error=>console.log(error))
    }

    return <div className="md:ml-8 mt-4 md:mr-4">
        <AddConcertModal/>
        <PlusIcon onClick={()=>dispatch(setOpenAddModal(true))}/>
        {
           concertsOfUser.map((c)=>{
               const currentDate = new Date(c.dueDate)

               if(currentDate.getUTCFullYear()!==currentYear){

                   currentYear = currentDate.getFullYear()
                   return <>
                        <ConcertYear year={currentDate.getFullYear()} keyNum={c.id+"year"} concertId={c.id}/>
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