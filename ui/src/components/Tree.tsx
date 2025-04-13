import React, {FC, useState} from "react";
import "./Tree.css"
import {ElementItem, isNote} from "../models/ElementItem";
import axios, {AxiosResponse} from "axios";
import {fixProtocol} from "../utils/Utilities";
import {setLoadedFolders, setNodes} from "../store/CommonSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {apiURL} from "../Keycloak";
import {setNotePDFUploadOpen, setSelectedFolder} from "../ModalSlice";
import {addChild, deleteChild, handleNewElements, traverseTree} from "../utils/ElementUtils";
import {UpdateFolderOrNote} from "@/src/components/UpdateFolderOrNote";
import {FolderItem} from "@/src/models/Folder";

export type TreeData = ElementItem

export type TreeDataExpanded =  {
    setData: (payload: TreeData[])=>{payload: TreeData[], type: "commonSlice/setNodes"}
}  & {
    element: ElementItem
}

interface TreeProps {
    data: TreeData[]
    setData: (payload: TreeData[])=>{payload: TreeData[], type: "commonSlice/setNodes"}
}

export const TreeElement:FC<TreeProps> = ({data, setData})=>{
    return <div>
        <ul>
            {data && data.map(tree=>{
                return <TreeNode element={tree} setData={setData} key={tree.id}/>
            })}
        </ul>
        </div>
}

const TreeNode:FC<TreeDataExpanded> = ({element, setData}) => {
    const [childVisible, setChildVisiblity] = useState(false);
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const loadedFolders = useAppSelector(state=>state.commonReducer.loadedFolders)
    const hasChild = element.type === 'folder'

    const onExpand = async (event: FolderItem) => {
        if (!loadedFolders.includes(event.id)) {
            dispatch(setLoadedFolders(event.id))
            const loadedChildren: ElementItem[] = await new Promise<ElementItem[]>(resolve => {
                axios.get(fixProtocol(event.links[0].href))
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if (loadedChildren === undefined) {
                return
            }
            const newItems = handleNewElements(event, loadedChildren);
            const eventWithChildren = {...event, elements: newItems}
            dispatch(setNodes(traverseTree(eventWithChildren,nodes)))
            }
    }


    const drag = (ev: React.DragEvent<HTMLDivElement>, id: TreeData)=>{
        ev.dataTransfer.setData("id",JSON.stringify(id))
    }

    const moveToFolder = async (element: TreeData, nodes: TreeData[], keyNum:string)=>{
        await new Promise<ElementItem[]>(() => {
            axios.patch(apiURL+`/v1/elements/${element.id}/${keyNum}`)
                .then(() => {
                    dispatch(setNodes(addChild(element, deleteChild(element.id, nodes), keyNum)))
                })
                .catch((error) => {
                    console.log(error)
                })
        })
    }

    const openPDFInNewTab= (base64URL:string)=>{
        const win = window.open()
        if(win===undefined||win===null) return
        win.document.write('<iframe src="' + base64URL  + '" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>');
    }

    return (
        <li className="d-tree-node ml-5 p-2" key={element.id}>
            <div className="flex gap-5"
                 draggable={true} onDragStart={(e)=>drag(e, element)}
                 onDragOver={(e)=>{
                     element.type=='folder'?e.preventDefault():''
                 }}
                 onDrop={(e)=>{
                     const  element= JSON.parse(e.dataTransfer.getData("id"))
                     if(element.keyNum!==element.id) {
                         e.preventDefault();
                         moveToFolder(element,nodes, element.id)
                     }
                 }}>
                {hasChild && (
                    <div
                        className={`d-inline d-tree-toggler ${
                            childVisible ? "active" : ""
                        }`}
                    >
                        <i className="fa-solid fa-chevron-right" onClick={()=>{
                            setChildVisiblity((v) => !v)
                            onExpand(element)
                        }}/>
                    </div>
                )}

                <div className="col d-tree-head">
                    <i className={` fa-folder mr-2`}/>
                    <span className="mr-2">{element.name}</span>
                    <UpdateFolderOrNote element={element} trigger={<i className="fa-solid fa-pencil ml-2"/>} />
                    {element.type==='note' &&
                        <i className="fa-solid fa-upload ml-2" onClick={()=>{
                        dispatch(setSelectedFolder(element))
                        dispatch(setNotePDFUploadOpen(true))
                    }}/>}
                    {isNote(element) && element.pdfAvailable &&
                            <i className="fa-solid fa-eye ml-2" onClick={()=>{
                                axios.get(apiURL+`/v1/elements/${element.id}/pdf`)
                                    .then((response:AxiosResponse<string>) => {
                                        openPDFInNewTab(response.data)
                                    }).catch((error) => {
                                    console.log(error)
                                })
                            }}/>
                    }
                    {
                        isNote(element) &&
                        <i className="fa-solid fa-copy ml-2" onClick={()=>{
                            const link = window.location.protocol + "//" + window.location.host + "/ui/noteManagement/notes/" + element.id
                            navigator.clipboard.writeText(link)
                        }}/>
                    }
                </div>
            </div>

            {hasChild && childVisible && (
                <div className="d-tree-content">
                    <ul className="d-flex d-tree-container flex-column ml-5 p-1">
                        <TreeElement data={element.elements}  setData={setData}/>
                    </ul>
                </div>
            )}
        </li>
    );
};
