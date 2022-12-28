import {FC} from "react";
import {useTranslation} from "react-i18next";
import {TrashIcon} from "./icons/TrashIcon";
import {apiURL} from "../Keycloak";
import axios from "axios";
import {concertActions} from "../store/slices/ConcertSlice";
import {useAppDispatch} from "../store/hooks";

interface ConertYearProps {
    year: number,
    keyNum: string,
    concertId: string
}

export const ConcertYear:FC<ConertYearProps> = ({year, concertId,keyNum})=>{
    const {t} = useTranslation()
    const dispatch = useAppDispatch()

    const deleteConcert = ()=>{
        axios.delete(apiURL+"/v1/concerts/"+concertId)
            .then(()=>{
                console.log("Concert deleted")
                dispatch(concertActions.removeConcert(concertId))
            })
    }

    return <h1 className="text-4xl w-3/5 flex items-baseline" key={keyNum+ "heading"}>{t('year')} {year} <TrashIcon onClick={()=>{deleteConcert()}}/></h1>
}