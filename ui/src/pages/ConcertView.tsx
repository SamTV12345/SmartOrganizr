import {apiURL} from "../Keycloak";
import axios from "axios";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {ConcertDto} from "../models/ConcertDto";
import {useEffect, useState} from "react";
import {concertActions} from "../store/slices/ConcertSlice";
import {ConcertYear} from "../components/ConcertYear";
import {ConcertItem} from "../components/ConcertItem";

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

    return <div className="h-3/6"><div className="ml-8 mt-4 mr-4">
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
    </div></div>
}