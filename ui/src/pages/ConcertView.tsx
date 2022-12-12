import {apiURL} from "../Keycloak";
import axios from "axios";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {ConcertDto} from "../models/ConcertDto";
import {useEffect} from "react";
import {concertActions} from "../store/slices/ConcertSlice";

export const ConcertView = ()=>{
    const concertsOfUser = useAppSelector(state=>state.concertReducer)
    const dispatch = useAppDispatch()

    useEffect(()=>{
    retrieveConcertsOfUser()
    }, [])



    const retrieveConcertsOfUser = ()=>{
        axios.get(apiURL+"/v1/concerts")
            .then(resp=>dispatch(concertActions.setConcerts(resp.data)))
            .catch(error=>console.log(error))
    }

    return <div className="flex h-screen"><div className="mx-auto mt-4"> test</div></div>
}