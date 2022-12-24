import {Modal} from "./Modal";
import {NoteSearchModal} from "./NoteSearchModal";

export const AddNoteToConcert = ()=>{

    return <Modal headerText={"Note zu Konzert hinzufügen"} onCancel={()=>{}} onAccept={()=>{}}
                  onDelete={()=>{}} cancelText={"Abbrechen"} acceptText={"Hinzufügen"}>
        <NoteSearchModal/>
    </Modal>
}