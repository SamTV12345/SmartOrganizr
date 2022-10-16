import {useEffect} from "react";
import {TreeData, TreeElement} from "../components/Tree";
import {Folder} from "../models/Folder";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setNodes} from "../store/CommonSlice";
import {Modal} from "../components/Modal";
import {NoteModal} from "../components/NoteModal";
import {setModalOpen, setOpenAddModal} from "../ModalSlice";
import {replaceFolder, replaceNote} from "../utils/ElementUtils";
import {NoteItem} from "../models/NoteItem";
import {AddModal} from "../components/AddModal";
import {ElementAddModal} from "../components/ElementAddModal";

export const FolderView = ()=>{
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const element = useAppSelector(state=>state.modalReducer.selectedFolder)

    const loadFolder = async (link: string) => {
        const folders: Folder[] = await new Promise<Folder[]>(resolve => {
            axios.get(link)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (folders !== undefined) {
            const dataOfFolder = folders.map(folder => {
                return {
                    keyNum: folder.id,
                    icon: "fa fa-folder",
                    name: folder.name,
                    creationDate: folder.creationDate,
                    description: '',
                    length: folder.length,
                    type: 'Folder',
                    links: folder.links[0].href,
                    children: []
                    } as TreeData
                }
            )
            dispatch(setNodes(dataOfFolder))
        }
    }

    useEffect(() => {
        loadFolder(apiURL + "/v1/elements/parentDecks")
    }, [])


    const updateElement = async ()=>{
        if(element===undefined){
            return
        }
        if(element.author!== undefined) {
            const updatedElement = await new Promise<NoteItem>((resolve, reject) => {
                axios.patch(apiURL + "/v1/elements/notes", {
                    id: element.id,
                    title: element.name,
                    numberOfPages: element.numberOfPages,
                    description: element.description,
                    authorId: element.author?.id
                })
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if (updatedElement !== undefined) {
                const event = {
                    children: undefined,
                    icon: '',
                    length: updatedElement.numberOfPages as number,
                    name: updatedElement.title,
                    links: "",
                    creationDate: updatedElement.creationDate,
                    description: updatedElement.description,
                    type: 'Note',
                    numberOfPages: updatedElement.numberOfPages,
                    author: updatedElement.author,
                    keyNum: updatedElement.id
                }
                dispatch(setNodes(replaceNote(event,nodes)))
            }
        }
        else{
            const updatedElement = await new Promise<Folder>((resolve, reject) => {
                axios.patch(apiURL + "/v1/elements/folders", {
                     folderId: element.id,
                     name:element.name,
                     description:element.description
                })
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if (updatedElement !== undefined) {
                const event = {
                    children: undefined,
                    icon: '',
                    name: updatedElement.name,
                    links: "",
                    length:0,
                    creationDate: updatedElement.creationDate,
                    description: updatedElement.description,
                    type: 'Folder',
                    keyNum: updatedElement.id
                }
                dispatch(setNodes(replaceFolder(event, nodes)))
            }
        }
    }

    return <div>
        <div className="flex justify-end mr-5 mt-5 mb-5">
            <button data-modal-toggle="defaultModal" type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"  onClick={()=>dispatch(setOpenAddModal(true))}>
                <i className="fa-solid fa-plus"/>
            </button>
        </div>
        <AddModal headerText={"Neues Element"} onAccept={()=>{}} acceptText={"Erstellen"} children={<ElementAddModal/>}/>
        <Modal headerText="Element editieren" onAccept={()=>updateElement()} acceptText="Updaten" children={<NoteModal/>}
               cancelText={"Abbrechen"} onCancel={()=>{dispatch(setModalOpen(false))}} onDelete={()=>{}}/>
        <div className="border-0 w-full md:w-8/12  table-fixed md:mx-auto md:mt-4 md:mb-4 bg-gray-800 text-white p-6">
        <div className="mx-auto">
           <TreeElement data={nodes} setData={setNodes}/>
        </div>
    </div>
    </div>
}