import {Modal} from "./Modal";
import {AddModal} from "./AddModal";
import {useState} from "react";
import {FormInput} from "../form/FormInput";

export const AddConcertModal = () => {
    const [title, setTitle] = useState<string>("")
    const [description, setDescription] = useState<string>("")
    const [dueDate, setDueDate] = useState<string>('')


    return <AddModal headerText={"Konzert hinzufügen"} onAccept={()=>{}} acceptText={"Erstellen"}>
        <div className="grid grid-cols-2 gap-4">
            <FormInput id={"titel"} label={"Titel"} value={title} onChange={(c)=>setTitle(c)}/>
            <FormInput id={"description"} label={"Beschreibung"} value={description} onChange={(c)=>setDescription(c)}/>
            <FormInput id={"dueDate"} label={"Fälligkeitsdatum"} value={dueDate} onChange={(c)=>setDueDate(c)}/>
        </div>
    </AddModal>
}