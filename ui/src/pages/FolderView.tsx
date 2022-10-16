import {useEffect} from "react";
import {TreeData, TreeElement} from "../components/Tree";
import {Folder} from "../models/Folder";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setNodes} from "../store/CommonSlice";
import {Modal} from "../components/Modal";
import {NoteModal} from "../components/NoteModal";
import {setModalOpen} from "../ModalSlice";
import {ElementItem} from "../models/ElementItem";

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
            const updatedElement = await new Promise<ElementItem>((resolve, reject) => {
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
                console.log(updatedElement)
            }
        }
        else{
            const updatedElement = await new Promise<Folder>((resolve, reject) => {
                axios.patch(apiURL + "/v1/elements/folders", {
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
                console.log(updatedElement)
            }
        }
    }

    return <div className="border-0 w-full md:w-8/12  table-fixed md:mx-auto md:mt-4 md:mb-4 bg-gray-800 text-white p-6">
        <Modal headerText="Element editieren" onAccept={()=>updateElement()} acceptText="Updaten" children={<NoteModal/>}
               cancelText={"Abbrechen"} onCancel={()=>{dispatch(setModalOpen(false))}} onDelete={()=>{}}/>
        <div className="mx-auto">
           <TreeElement data={nodes} setData={setNodes}/>
        </div>
    </div>
}