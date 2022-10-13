import {Dispatch, FC, SetStateAction, useState} from "react";
import "./Tree.css"
import {ElementItem} from "../models/ElementItem";
import axios from "axios";
import {fixLinkProtocol} from "../utils/Utilities";
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

    const onExpand = async (event: TreeData) => {
        if (event.children?.length==0 && event.length > 0) {
            const loadedChildren: ElementItem[] = await new Promise<ElementItem[]>(resolve => {
                axios.get(fixLinkProtocol(event.links))
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })

            if (loadedChildren === undefined) {
                return
            }
            
            const mappedChildren = loadedChildren.map(element => {
                if ('length' in element) {
                    const folder = element as Folder
                    return {
                        keyNum: element.id,
                        icon: "pi pi-folder",
                        name: element.name,
                        length: folder.length,
                        type: 'Folder',
                        links: folder.links[0].href,
                        children: []
                        } as TreeData
                    }
                else if ('numberOfPages' in element) {
                    const note = element as NoteItem

                    return {
                        keyNum: note.id,
                        icon: "pi pi-folder",
                        name: note.title,
                        length: note.numberOfPages,
                        type: 'Note',
                        } as TreeData
                    }
                else {
                    return {
                        keyNum: 123,
                        name: "??",
                        length: 0,
                        type: "??",
                        } as TreeData
                    }
                }
            )

            const test = replaceChildren(event.keyNum, mappedChildren, nodes)
            dispatch(setNodes(test))
        }
    }

    const replaceChildren = (keyNum: number, newChildren: TreeData[], nodes: TreeData[]): TreeData[] => {
        return nodes.map(node => {
            if (node.keyNum === keyNum) {
                return {...node, children: newChildren} as TreeData
            } else {
                return {...node, children: replaceChildren(keyNum, newChildren, node.children || [])} as TreeData
            }
        })
    }


    /*const traverseTree = (event: TreeData, completeTree: TreeData[], destination: TreeData[]) => {
        completeTree.forEach(node => {
            if (node.keyNum === event.keyNum) {
                destination.push(event)
            } else if (node.children) {
                traverseTree(event, node.children)
            }
        })
    }*/

    /* const traverseTree = (event: TreeData, currentNodes: TreeData[], temp: TreeData[]) => {
        console.log(event.children)
        currentNodes.forEach(node => {
            if (node.keyNum === event.keyNum) {
                node = event;
                temp.push(node)
            } else {
                temp.push({...node, children: []})
                if (node.children && node.children.length > 0) {
                    node.children.forEach(nodeInLoop => {
                        traverseTree(event, [nodeInLoop], nodeInLoop.children || [])
                    })
                }
            }
        })
    } */


    const traverseTree2 = (currentNode: TreeData[])=>{
        currentNode.forEach(node=> {
            if(node.children && node.children.length>0) {
                console.log(node.children)
                node.children.forEach(node1 =>{
                traverseTree2([node1])
                })
                console.log(node)
                return
            }
            }
        )
    }

    return (
        <li className="d-tree-node border-0" key={keyNum}>
            <div className="flex gap-5" onClick={(e) => setChildVisiblity((v) => !v)}>
                {hasChild && (
                    <div
                        className={`d-inline d-tree-toggler ${
                            childVisible ? "active" : ""
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" className="h-6"
                             onClick={()=>onExpand({keyNum,icon,children,name,length,type,links})}>
                            <path d="M246.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-9.2-9.2-22.9-11.9-34.9-6.9s-19.8 16.6-19.8 29.6l0 256c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l128-128z"/></svg>
                    </div>
                )}

                <div className="col d-tree-head">
                    <i className={` ${icon}`}> </i>
                    {name}
                </div>
            </div>

            {hasChild && childVisible && (
                <div className="d-tree-content">
                    <ul className="d-flex d-tree-container flex-column">
                        <TreeElement data={children as TreeData[]}  setData={setData}/>
                    </ul>
                </div>
            )}
        </li>
    );
};