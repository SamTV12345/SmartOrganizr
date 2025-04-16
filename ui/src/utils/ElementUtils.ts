import {ElementItem, isFolder, isNote} from "../models/ElementItem";
import {TreeData} from "../components/Tree";
import {FolderItem} from "@/src/models/Folder";

export const handleNewElements = (event: FolderItem, loadedChildren: ElementItem[])  => {
    return loadedChildren
        .map((element)=>{
            return {
                ...element,
                parent: event
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
}

export const traverseTree = (event: TreeData, nodes: TreeData[]): TreeData[] =>
    nodes.map(node =>
        node.id === event.id ? event
            : isNote(node) ? node
                : {
                    ...node, children: traverseTree(event, node.elements)
                })

export const replaceNote = (event: TreeData, nodes: TreeData[]): TreeData[] =>
    nodes.map(node => {
            return node.id === event.id ? event : isNote(node) ?
                node : {...node, children: replaceNote(event, node.elements)};
        }
    )

export const replaceFolder = (event: TreeData, nodes: TreeData[]): TreeData[] =>
    nodes.map(node => node.id === event.id ? event : isNote(node) ?
            node : {...node, children: replaceNote(event, node.elements)}
    )


//add child
export const addChild = (event: TreeData, nodes: TreeData[], parentId: string): TreeData[] => {
    return nodes.map(node => {
        //if other children are in this folder
        if (node.id === parentId && isFolder(node)) {
            return {
                ...node,
                elements: [...node.elements, event].sort((c1, c2) => c1.name.localeCompare(c2.name))
            } satisfies TreeData
        }
        // if not other children are in this folder
        else if (node.id === parentId && !node.id && isFolder(node)) {
            return {...node, elements: [event]} satisfies TreeData
        } else if (isFolder(node)) {
            return {...node, elements: addChild(event, node.elements || [], parentId)} satisfies TreeData
        }
        return node
    })
}


export const deleteTopElements = (keyNum: string, nodes:TreeData[]):TreeData[]=>{
    return nodes.filter(node => node.id !== keyNum)
}

export const deleteChild = (keyNum: string, nodes: ElementItem[]): TreeData[] => {
    return nodes.map(node => {
        if (isFolder(node)) {
            return {...node, children: node.elements?.filter(c => c.id !== keyNum)} as TreeData
        } else {
            return {...node, children: deleteChild(keyNum,  [])}
        }
    })
}

export const addAsParent = (event:TreeData,nodes: TreeData[])=>{
    return [...nodes,event].sort((e,e1)=>e.name.localeCompare(e1.name))
}
