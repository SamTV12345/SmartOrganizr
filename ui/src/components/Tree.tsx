import React, {Dispatch, FC, SetStateAction, useState} from "react";
import "./Tree.css"
import {ElementItem} from "../models/ElementItem";
import axios from "axios";
import {fixProtocol} from "../utils/Utilities";
import {Folder} from "../models/Folder";
import {setLoadedFolders, setNodes} from "../store/CommonSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {apiURL} from "../Keycloak";
import {setModalOpen, setSelectedFolder} from "../ModalSlice";
import {Author} from "../models/Author";
import {addChild, deleteChild, handleNewElements, traverseTree} from "../utils/ElementUtils";

export interface TreeData {
    creationDate: Date,
    keyNum:number,
    icon:string,
    name:string,
    length:number,
    author?: Author
    type: string,
    links: string,
    description: string,
    numberOfPages?:number,
    children?: TreeData[]
}

export interface TreeDataExpanded {
    creationDate: Date,
    keyNum:number,
    icon:string,
    name:string,
    length:number,
    type: string,
    links: string,
    author?: Author
    description:string,
    children?: TreeData[],
    numberOfPages?:number,
    nodes: TreeData[]
    setData: Dispatch<SetStateAction<TreeData[]>>
}

interface TreeProps {
    data: TreeData[]
    setData: Dispatch<SetStateAction<TreeData[]>>
}

export const TreeElement:FC<TreeProps> = ({data})=>{
    return <div>
        <ul>
            {data && data.map(tree=>{
                return <TreeNode name={tree.name} setData={setNodes} key={tree.keyNum+"tree"} author={tree.author}
                                 icon={tree.icon} keyNum={tree.keyNum} numberOfPages={tree.numberOfPages}
                                 children={tree.children} length={data.length}
                                 links={tree.links} type={tree.type} nodes={data} description={tree.description} creationDate={tree.creationDate}/>
            })}
        </ul>
        </div>
}

const TreeNode:FC<TreeDataExpanded> = ({ keyNum,icon,children,author
                                           ,name, length,description,numberOfPages,
                                           setData,type,links,creationDate }) => {
    const [childVisible, setChildVisiblity] = useState(false);
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const loadedFolders = useAppSelector(state=>state.commonReducer.loadedFolders)
    const hasChild = type==='Folder' && length>0



    const onExpand = async (event: TreeData) => {
        console.log(event)
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
        // @ts-ignore
        ev.dataTransfer.setData("id",JSON.stringify(id))
    }

    const moveToFolder = async (element: TreeData, nodes: TreeData[], keyNum:number)=>{
        await new Promise<ElementItem[]>(resolve => {
            axios.patch(apiURL+`/v1/elements/${element.keyNum}/${keyNum}`)
                .then(resp => {
                    dispatch(setNodes(addChild(element, deleteChild(element.keyNum, nodes), keyNum)))
                })
                .catch((error) => {
                    console.log(error)
                })
        })
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