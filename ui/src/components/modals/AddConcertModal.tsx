import {Modal} from "./Modal";
import {AddModal} from "./AddModal";
import {useState} from "react";
import {FormInput} from "../form/FormInput";
import axios from "axios";
import {apiURL} from "../../Keycloak";

export const AddConcertModal = () => {
    const [title, setTitle] = useState<string>("")
    const [description, setDescription] = useState<string>("")
    const [dueDate, setDueDate] = useState<string>('')

    const createConcert = () => {
        axios.post(apiURL + "/v1/concerts", {
            title,
            description,
            dueDate,
            location: "test",
            noteInConcerts: []
        })
    }

    return <AddModal headerText={"Konzert hinzufügen"} onAccept={()=>{createConcert()}} acceptText={"Erstellen"}>
        <div className="grid grid-cols-2 gap-4">
            <FormInput id={"titel"} label={"Titel"} value={title} onChange={(c)=>setTitle(c)}/>
            <FormInput id={"description"} label={"Beschreibung"} value={description} onChange={(c)=>setDescription(c)}/>
            <FormInput id={"dueDate"} label={"Fälligkeitsdatum"}  type={"date"} value={dueDate} onChange={(c)=>setDueDate(c)}/>
        </div>
    </AddModal>
}