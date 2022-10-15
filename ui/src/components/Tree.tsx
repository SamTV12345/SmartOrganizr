import React, {Dispatch, FC, SetStateAction, useEffect, useState} from "react";
import "./Tree.css"
import {ElementItem} from "../models/ElementItem";
import axios from "axios";
import {fixProtocol} from "../utils/Utilities";
import {Folder} from "../models/Folder";
import {NoteItem} from "../models/NoteItem";
import {setNodes} from "../store/CommonSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";

export interface TreeData {
    keyNum:number,
    icon:string,
    name:string,
    length:number,
    type: string,
    links: string,
    children?: TreeData[]
}

export interface TreeDataExpanded {
    keyNum:number,
    icon:string,
    name:string,
    length:number,
    type: string,
    links: string,
    children?: TreeData[],
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
                return <TreeNode name={tree.name} setData={setNodes} key={tree.keyNum+"tree"}
                                 icon={tree.icon} keyNum={tree.keyNum}
                                 children={tree.children} length={data.length}
                                 links={tree.links} type={tree.type} nodes={data}/>
            })}
        </ul>
        </div>
}

const TreeNode:FC<TreeDataExpanded> = ({ keyNum,icon,children
                                           ,name, length,
                                           setData,type,links }) => {
    const [childVisible, setChildVisiblity] = useState(false);
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)

    const hasChild = type==='Folder' && length>0

    function handleNewElements(event: TreeData, loadedChildren: ElementItem[]) {
        event.children = loadedChildren.map(element => {
                if ('length' in element) {
                    const folder = element as Folder
                    return {
                        keyNum: element.id,
                        icon: "fa-solid  fa-folder",
                        name: element.name,
                        length: folder.length,
                        type: 'Folder',
                        links: folder.links[0].href,
                        children: []
                    } as TreeData
                } else if ('numberOfPages' in element) {
                    const note = element as NoteItem

                    return {
                        keyNum: note.id,
                        icon: "fa fa-sheet-plastic",
                        name: note.title,
                        length: note.numberOfPages,
                        type: 'Note',
                    } as TreeData
                } else {
                    return {
                        keyNum: 123,
                        name: "??",
                        length: 0,
                        type: "??",
                    } as TreeData
                }
            }
        )
    }

    const onExpand = async (event: TreeData) => {
        if (event.children?.length==0 && event.length > 0) {
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


    /**
     * Traverses the tree and adds the new nodes.
     * @param event
     * @param nodes
     */
    const traverseTree = (event: TreeData, nodes: TreeData[]): TreeData[] =>
        nodes.map(node =>
            node.keyNum === event.keyNum ? event
                : !node.children?.length ? node
                    : { ...node, children: traverseTree(event, node.children)
        })



    const drag = (ev: React.DragEvent<HTMLDivElement>, id: TreeData)=>{
        // @ts-ignore
        ev.dataTransfer.setData("id",JSON.stringify(id))
    }

    //delete child
    const deleteChild = (keyNum:number, nodes:TreeData[]):TreeData[] =>{
        return nodes.map(node => {
                const children = node.children?.map(c=>c.keyNum)
                if(children && children.includes(keyNum)){
                    console.log("Remove")
                    return {...node, children: node.children?.filter(c=>c.keyNum!==keyNum)} as TreeData
                }
                else {
                    return {...node, children: deleteChild(keyNum, node.children || [])} as TreeData
                }
        })
    }

    //add child
    const addChild = (event: TreeData, nodes: TreeData[], parentId:number):TreeData[] =>{
        return nodes.map(node => {
            //if other children are in this folder
            if(node.keyNum === parentId && node.children){
                console.log("add with children")
                return {...node, children: [...node.children,event]} as TreeData
            }
            // if not other children are in this folder
            else if(node.keyNum === parentId && !node.children){
                console.log("add with no children")
                return {...node, children: [event]} as TreeData
            }
            else {
                return {...node, children: addChild(event, node.children || [],parentId)} as TreeData
            }
        })
    }

    return (
        <li className="d-tree-node ml-5 p-2" key={keyNum}>
            <div className="flex gap-5" onClick={(e) => setChildVisiblity((v) => !v)}
                 draggable={true} onDragStart={(e)=>drag(e,{keyNum,icon,children,name,length,type,links} as TreeData)}
                 onDragOver={(e)=>{
                     type=='Folder'?e.preventDefault():''
                 }}
                 onDrop={(e)=>{
                     const  element= JSON.parse(e.dataTransfer.getData("id"))
                     if(element.keyNum!==keyNum) {
                         e.preventDefault();
                         dispatch(setNodes(addChild(element, deleteChild(element.keyNum, nodes), keyNum)))
                     }
                 }}>
                {hasChild && (
                    <div
                        className={`d-inline d-tree-toggler ${
                            childVisible ? "active" : ""
                        }`}
                    >
                        <i className="fa-solid fa-chevron-right" onClick={()=>onExpand({keyNum,icon,children,name,length,type,links})}/>
                    </div>
                )}

                <div className="col d-tree-head">
                    <i className={` ${icon} mr-4`}> </i>
                    {name}
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