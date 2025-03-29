import React, {FC, useState} from "react";
import "./Tree.css"
import {ElementItem} from "../models/ElementItem";
import axios, {AxiosResponse} from "axios";
import {fixProtocol} from "../utils/Utilities";
import {Folder} from "../models/Folder";
import {setLoadedFolders, setNodes} from "../store/CommonSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {apiURL} from "../Keycloak";
import {setModalOpen, setNotePDFUploadOpen, setSelectedFolder} from "../ModalSlice";
import {Author} from "../models/Author";
import {addChild, deleteChild, handleNewElements, traverseTree} from "../utils/ElementUtils";
import {choiceFolder} from "../utils/Constants";

export interface TreeData {
    creationDate: Date,
    keyNum: string,
    icon:string,
    name:string,
    length:number,
    pdfAvailable?:boolean,
    author?: Author
    type: string,
    links: string,
    description: string,
    numberOfPages?:number,
    children?: TreeData[]
}

export interface TreeDataExpanded {
    creationDate: Date,
    keyNum:string,
    icon:string,
    name:string,
    length:number,
    type: string,
    links: string,
    author?: Author
    description:string,
    children?: TreeData[],
    numberOfPages?:number,
    pdfAvailable?:boolean,
    nodes: TreeData[]
    setData: (payload: TreeData[])=>{payload: TreeData[], type: "commonSlice/setNodes"}
}

interface TreeProps {
    data: TreeData[]
    setData: (payload: TreeData[])=>{payload: TreeData[], type: "commonSlice/setNodes"}
}

export const TreeElement:FC<TreeProps> = ({data})=>{
    return <div>
        <ul>
            {data && data.map(tree=>{
                return <TreeNode name={tree.name} setData={setNodes} key={tree.keyNum+"tree"} author={tree.author}
                                 icon={tree.icon} keyNum={tree.keyNum} numberOfPages={tree.numberOfPages}
                                 children={tree.children} length={data.length} pdfAvailable={tree.pdfAvailable}
                                 links={tree.links} type={tree.type} nodes={data} description={tree.description} creationDate={tree.creationDate}/>
            })}
        </ul>
        </div>
}

const TreeNode:FC<TreeDataExpanded> = ({ keyNum,icon,children,author
                                           ,name, length,description,numberOfPages,
                                           setData,type,links,creationDate,pdfAvailable }) => {
    const [childVisible, setChildVisiblity] = useState(false);
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const loadedFolders = useAppSelector(state=>state.commonReducer.loadedFolders)
    const hasChild = type===choiceFolder && length>0

    const onExpand = async (event: TreeData) => {
        if (!loadedFolders.includes(event.keyNum)) {
            dispatch(setLoadedFolders(event.keyNum))
            const loadedChildren: ElementItem[] = await new Promise<ElementItem[]>(resolve => {
                axios.get(fixProtocol(event.links))
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if (loadedChildren === undefined) {
                return
            }
            handleNewElements(event, loadedChildren);
            dispatch(setNodes(traverseTree(event,nodes)))
            }
    }


    const drag = (ev: React.DragEvent<HTMLDivElement>, id: TreeData)=>{
        ev.dataTransfer.setData("id",JSON.stringify(id))
    }

    const moveToFolder = async (element: TreeData, nodes: TreeData[], keyNum:string)=>{
        await new Promise<ElementItem[]>(() => {
            axios.patch(apiURL+`/v1/elements/${element.keyNum}/${keyNum}`)
                .then(() => {
                    dispatch(setNodes(addChild(element, deleteChild(element.keyNum, nodes), keyNum)))
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
        <li className="d-tree-node ml-5 p-2" key={keyNum}>
            <div className="flex gap-5"
                 draggable={true} onDragStart={(e)=>drag(e,{keyNum,icon,children,author,name,length,type,links} as TreeData)}
                 onDragOver={(e)=>{
                     type=='Folder'?e.preventDefault():''
                 }}
                 onDrop={(e)=>{
                     const  element= JSON.parse(e.dataTransfer.getData("id"))
                     if(element.keyNum!==keyNum) {
                         e.preventDefault();
                         moveToFolder(element,nodes, keyNum)
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
                            onExpand({keyNum,icon,numberOfPages,
                                creationDate,description,children,author,name,length,type,links})
                        }}/>
                    </div>
                )}

                <div className="col d-tree-head">
                    <i className={` ${icon} mr-2`}/>
                    <span className="mr-2">{name}</span>
                    <i className="fa-solid fa-pen" onClick={()=>{
                        dispatch(setSelectedFolder({id: keyNum, length,numberOfPages,author,description,name,type} as ElementItem))
                        dispatch(setModalOpen(true))
                    }}/>
                    {type==='Note' &&
                        <i className="fa-solid fa-upload ml-2" onClick={()=>{
                        dispatch(setSelectedFolder({id: keyNum, length,numberOfPages,author,description,name,type} as ElementItem))
                        dispatch(setNotePDFUploadOpen(true))
                    }}/>}
                    {pdfAvailable &&
                            <i className="fa-solid fa-eye ml-2" onClick={()=>{
                                axios.get(apiURL+`/v1/elements/${keyNum}/pdf`)
                                    .then((response:AxiosResponse<string>) => {
                                        openPDFInNewTab(response.data)
                                    }).catch((error) => {
                                    console.log(error)
                                })
                            }}/>
                    }
                </div>
            </div>

            {hasChild && childVisible && (
                <div className="d-tree-content">
                    <ul className="d-flex d-tree-container flex-column ml-5 p-1">
                        <TreeElement data={children as TreeData[]}  setData={setData}/>
                    </ul>
                </div>
            )}
        </li>
    );
};
