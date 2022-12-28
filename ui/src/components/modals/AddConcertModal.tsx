import {Modal} from "./Modal";
import {AddModal} from "./AddModal";
import {useState} from "react";
import {FormInput} from "../form/FormInput";
import axios from "axios";
import {apiURL} from "../../Keycloak";
import {ConcertDto} from "../../models/ConcertDto";
import {ConcertPutDto} from "../../models/ConcertPutDto";
import {useTranslation} from "react-i18next";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {concertActions} from "../../store/slices/ConcertSlice";

export const AddConcertModal = () => {
    const dispatch = useAppDispatch()
    const concerts = useAppSelector(state=>state.concertReducer.concerts)
    const {t} = useTranslation()
    const [title, setTitle] = useState<string>("")
    const [description, setDescription] = useState<string>("")
    const [location, setLocation] = useState<string>("")

    const [dueDate, setDueDate] = useState<string>('')
    const [hint, setHint] = useState<string>("")

    const createConcert = () => {
        axios.post(apiURL + "/v1/concerts", {
            title,
            description,
            dueDate,
            location: "test",
            noteInConcerts: [],
            hints: hint
        } satisfies Partial<ConcertDto>)
            .then(resp=>dispatch(concertActions.setConcerts([...concerts,resp.data]
                .sort((a,b)=>new Date(b.dueDate).getTime()-new Date(a.dueDate).getTime()))))
    }

    return <AddModal headerText={"Konzert hinzufügen"} onAccept={()=>{createConcert()}} acceptText={"Erstellen"}>
        <div className="grid grid-cols-2 gap-4">
            <FormInput id={"title"} label={t("title")} value={title} onChange={(c)=>setTitle(c)}/>
            <FormInput id={"description"} label={t("description")} value={description} onChange={(c)=>setDescription(c)}/>
            <FormInput id={"location"} label={t("location")} value={location} onChange={(c)=>setLocation(c)}/>
            <FormInput id={"dueDate"} label={t("appearanceDate")}  type={"date"} value={dueDate} onChange={(c)=>setDueDate(c)}/>
            <FormInput id={"extraInfo"} label={t("hints")} value={hint} onChange={(c)=>setHint(c)}/>
        </div>
    </AddModal>
}