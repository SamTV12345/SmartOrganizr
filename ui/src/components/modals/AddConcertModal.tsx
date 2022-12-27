import {Modal} from "./Modal";
import {AddModal} from "./AddModal";
import {useState} from "react";

export const AddConcertModal = () => {
    const [title, setTitle] = useState<string>("")
    const [description, setDescription] = useState<string>("")
    const [dueDate, setDueDate] = useState<string>('')


    return <AddModal headerText={"Konzert hinzufügen"} onAccept={()=>{}} acceptText={"Erstellen"}>
        <div className="grid grid-cols-2 gap-4">
            <div>Titel</div>
            <input type="text" onChange={(c)=>setTitle(c.target.value)} value={title}/>

            <div>Beschreibung</div>
            <input type="text" onChange={(c)=>setDescription(c.target.value)} value={description}/>

            <div>Datum</div>
            <input type="date" onChange={(c)=>setDueDate(c.target.value)} value={dueDate}/>
        </div>
    </AddModal>
}