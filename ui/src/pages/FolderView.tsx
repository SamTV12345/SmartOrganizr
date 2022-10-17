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
import {
    addAsParent,
    addChild,
    deleteChild,
    deleteTopElements,
    mapDtoToTreeData,
    replaceFolder,
    replaceNote
} from "../utils/ElementUtils";
import {NoteItem} from "../models/NoteItem";
import {AddModal} from "../components/AddModal";
import {ElementAddModal} from "../components/ElementAddModal";

export const FolderView = ()=>{
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const element = useAppSelector(state=>state.modalReducer.selectedFolder)

    //Create element
    const elementType = useAppSelector(state=>state.elementReducer.type)
    const name        = useAppSelector(state=>state.elementReducer.name)
    const description = useAppSelector(state=>state.elementReducer.description)
    const parentId    = useAppSelector(state=>state.elementReducer.parent)
    const numberOfPages    = useAppSelector(state=>state.elementReducer.numberOfPages)
    const authorId    = useAppSelector(state=>state.elementReducer.author)

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


    const createElement =  async () => {
        if(elementType === 'Note') {
            const newElement = await new Promise<NoteItem>((resolve, reject) => {
                axios.post(apiURL + "/v1/elements/notes", {
                    title: name,
                    numberOfPages: numberOfPages,
                    description: description,
                    authorId,
                    parentId
                })
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if(newElement!==undefined){
                axios.get(apiURL+`/v1/elements/${newElement.id}/parent`)
                    .then(resp=>dispatch(setNodes(addChild(mapDtoToTreeData(newElement),nodes,resp.data))))
                    .catch(err=>console.log(err))
            }
        }
        else{
            const newFolder = await new Promise<Folder>((resolve, reject) => {
                axios.post(apiURL + "/v1/elements/folders", {
                    name,
                    description: description,
                    parentId
                })
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if(newFolder!==undefined){
                newFolder.length = 0
                newFolder.links = []
                // @ts-ignore
                newFolder.links[0] = newFolder._links
                console.log(newFolder)
                axios.get(apiURL+`/v1/elements/${newFolder.id}/parent`)
                    .then(resp=>{
                        console.log(resp)
                        if(resp.data===-100){
                            console.log("Hier123")
                            dispatch(setNodes(addAsParent(mapDtoToTreeData(newFolder), nodes)))
                        }
                        else {
                            dispatch(setNodes(addChild(mapDtoToTreeData(newFolder), nodes, resp.data)))
                        }
                    })
                    .catch(err=>console.log(err))
            }
        }
    }

    const deleteElement = ()=> {
        if(element) {
                axios.delete(apiURL + `/v1/elements/${element.id}`)
                    .then(() => {
                        dispatch(setNodes(deleteChild(element.id,deleteTopElements(element.id, nodes))))
                    })
                    .catch((error) => {
                        console.log(error)
                    })
        }
    }

    return <div>
        <div className="flex justify-end mr-5 mt-5 mb-5">
            <button data-modal-toggle="defaultModal" type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"  onClick={()=>dispatch(setOpenAddModal(true))}>
                <i className="fa-solid fa-plus"/>
            </button>
        </div>
        <AddModal headerText={"Neues Element"} onAccept={()=>{createElement()}} acceptText={"Erstellen"} children={<ElementAddModal/>}/>
        <Modal headerText="Element editieren" onAccept={()=>updateElement()} acceptText="Updaten" children={<NoteModal/>}
               cancelText={"Abbrechen"} onCancel={()=>{dispatch(setModalOpen(false))}} onDelete={deleteElement}/>
        <div className="border-0 w-full md:w-8/12  table-fixed md:mx-auto md:mt-4 md:mb-4 bg-gray-800 text-white p-6">
        <div className="mx-auto">
           <TreeElement data={nodes} setData={setNodes}/>
        </div>
    </div>
    </div>
}