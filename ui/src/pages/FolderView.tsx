import {useEffect} from "react";
import {TreeData, TreeElement} from "../components/Tree";
import {Folder} from "../models/Folder";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setNodes} from "../store/CommonSlice";
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
import {ElementAddModal} from "../components/ElementAddModal";
import {choiceNote, folderIcon} from "../utils/Constants";
import {useTranslation} from "react-i18next";
import {AddModal} from "../components/modals/AddModal";
import {Modal} from "../components/modals/Modal";
import {NoteModal} from "../components/modals/NoteModal";
import {PlusIcon} from "../components/form/PlusIcon";
import {FileUploadModal} from "../components/modals/FileUploadModal";
import {CreateFolderOrNote} from "@/src/components/CreateFolderOrNote";

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

    const {t} = useTranslation(

    )
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
                    icon: folderIcon,
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
        if(nodes.length==0) {
            loadFolder(apiURL + "/v1/elements/parentDecks")
        }
    }, [])


    const updateElement = async ()=>{
        if(element===undefined){
            return
        }
        if(element.author!== undefined) {
            const updatedElement = await new Promise<NoteItem>((resolve) => {
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
            const updatedElement = await new Promise<Folder>((resolve) => {
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
        if(elementType === choiceNote) {
            const newElement = await new Promise<NoteItem>((resolve) => {
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
            const newFolder = await new Promise<Folder>((resolve) => {
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
                //@ts-ignore
                newFolder.links[0] = newFolder._links
                axios.get(apiURL+`/v1/elements/${newFolder.id}/parent`)
                    .then(resp=>{
                        if(resp.data===-100){
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
        <CreateFolderOrNote/>
        <FileUploadModal/>
        <div className="h-12"></div>
        <div className="border-0 w-full md:w-8/12  table-fixed md:mx-auto md:mt-8 md:mb-4 bg-gray-800 text-white p-6">
        <div className="mx-auto">
           <TreeElement data={nodes} setData={(d)=>setNodes(d)}/>
        </div>
    </div>
    </div>
}
