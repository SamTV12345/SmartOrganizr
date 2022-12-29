import {ElementItem} from "../models/ElementItem";
import {Folder} from "../models/Folder";
import {NoteItem} from "../models/NoteItem";
import {TreeData} from "../components/Tree";
import {folderIcon, noteIcon} from "./Constants";

export const mapDtoToTreeData = (element: ElementItem)=> {
    if ('length' in element) {
        const folder = element as Folder
        return {
            keyNum: element.id,
            icon: folderIcon,
            name: element.name,
            creationDate: element.creationDate,
            length: folder.length,
            type: 'Folder',
            links: folder.links[0].href,
            description: '',
            children: []
        } as TreeData
    } else if ('numberOfPages' in element) {
        const note = element as NoteItem
        return {
            keyNum: note.id,
            icon: noteIcon,
            name: note.title,
            creationDate: element.creationDate,
            numberOfPages: note.numberOfPages,
            description: note.description,
            author: note.author,
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

export const handleNewElements = (event: TreeData, loadedChildren: ElementItem[]) => {
    event.children = loadedChildren.map(element => {
            return mapDtoToTreeData(element);
        })
        .sort((a, b) => a.name.localeCompare(b.name))
}

export const traverseTree = (event: TreeData, nodes: TreeData[]): TreeData[] =>
    nodes.map(node =>
        node.keyNum === event.keyNum ? event
            : !node.children?.length ? node
                : {
                    ...node, children: traverseTree(event, node.children)
                })

export const replaceNote = (event: TreeData, nodes: TreeData[]): TreeData[] =>
    nodes.map(node => node.keyNum === event.keyNum ? {
        keyNum: node.keyNum, author: event.author,
        type: 'Note',
        numberOfPages: event.numberOfPages,
        description: event.description,
        name: event.name,
        creationDate: node.creationDate,
        children: node.children,
        length: event.length,
        icon: node.icon,
        links: node.links
    } : !node.children?.length ?
        node : {...node, children: replaceNote(event, node.children)}
    )

export const replaceFolder = (event: TreeData, nodes: TreeData[]): TreeData[] =>
    nodes.map(node => node.keyNum === event.keyNum ? {
            keyNum: event.keyNum,
            icon: folderIcon,
            name: event.name,
            creationDate: node.creationDate,
            description: event.description,
            length: node.length,
            type: 'Folder',
            links: node.links,
            children: node.children
        } : !node.children?.length ?
            node : {...node, children: replaceNote(event, node.children)}
    )


//add child
export const addChild = (event: TreeData, nodes: TreeData[], parentId: number): TreeData[] => {
    return nodes.map(node => {
        //if other children are in this folder
        if (node.keyNum === parentId && node.children) {
            console.log(event)
            return {
                ...node,
                children: [...node.children, event].sort((c1, c2) => c1.name.localeCompare(c2.name))
            } satisfies TreeData
        }
        // if not other children are in this folder
        else if (node.keyNum === parentId && !node.children) {
            return {...node, children: [event]} satisfies TreeData
        } else {
            return {...node, children: addChild(event, node.children || [], parentId)} satisfies TreeData
        }
    })
}


export const deleteTopElements = (keyNum: number, nodes:TreeData[]):TreeData[]=>{
    return nodes.filter(node => node.keyNum !== keyNum)
}

export const deleteChild = (keyNum: number, nodes: TreeData[]): TreeData[] => {
    return nodes.map(node => {
        const children = node.children?.map(c => c.keyNum)
        if (children && children.includes(keyNum)) {
            return {...node, children: node.children?.filter(c => c.keyNum !== keyNum)} as TreeData
        } else {
            return {...node, children: deleteChild(keyNum, node.children || [])} as TreeData
        }
    })
}

export const addAsParent = (event:TreeData,nodes: TreeData[])=>{
    return [...nodes,event].sort((e,e1)=>e.name.localeCompare(e1.name))
}