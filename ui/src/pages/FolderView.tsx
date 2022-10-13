import {useEffect, useState} from "react";
import axios from "axios";
import {Folder} from "../models/Folder";
import {apiURL} from "../Keycloak";
import {Column, TreeTable, TreeTableEventParams} from "primereact";
import TreeNode from "primereact/treenode";
import {ElementItem} from "../models/ElementItem";
import {NoteItem} from "../models/NoteItem";
import "./FolderView.css"
import "../css/md-dark-deeppurple/theme.css"
import {fixLinkProtocol} from "../utils/Utilities";

export const FolderView = () => {
    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedNode, setSelectedNode] = useState<number>(1000)

    useEffect(() => console.log(selectedNode), [selectedNode])
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
                    key: folder.id,
                    data: {
                        icon: <i className="pi pi-folder" aria-hidden="true"/>,
                        name: folder.name,
                        length: folder.length,
                        type: 'Folder',
                        links: folder.links[0].href
                    },
                    leaf: folder.length == 0

                }
            })
            setFirst(folders.length)
            setNodes(dataOfFolder)
        }
    }


    useEffect(() => {
        setLoading(false)
        setTotalRecords(1000)
        loadFolder(apiURL + "/v1/elements/parentDecks")
    }, [])


    const onExpand = async (event: TreeTableEventParams) => {
        if (!event.node.children && event.node.data.length > 0) {

            const loadedChildren: ElementItem[] = await new Promise<ElementItem[]>(resolve => {
                axios.get(fixLinkProtocol(event.node.data.links))
                    .then(resp => resolve(resp.data))
                    .catch((error) => {
                        console.log(error)
                    })
            })
            if (loadedChildren !== undefined) {
                event.node.children = loadedChildren.map(element => {
                    if ('length' in element) {
                        const folder = element as Folder
                        return {
                            key: element.id,
                            data: {
                                icon: <i className="pi pi-folder" aria-hidden="true"/>,
                                name: element.name,
                                length: folder.length,
                                type: 'Folder',
                                links: folder.links[0].href
                            },
                            leaf: folder.length == 0
                        }

                    } else if ('numberOfPages' in element) {
                        const note = element as NoteItem

                        return {
                            key: note.id,
                            data: {
                                icon: <i className="pi pi-file" aria-hidden="true"/>,
                                name: note.title,
                                length: note.numberOfPages,
                                type: 'Note',
                            },
                            leaf: true
                        }
                    } else {
                        return {
                            key: "???",
                            data: {
                                name: "??",
                                length: "??",
                                type: "??",
                            },
                            leaf: true
                        }
                    }
                })

                let _nodes = nodes.map(node => {
                    if (node.key === event.node.key) {
                        node = event.node;
                    }

                    return node;
                })
                setNodes(_nodes)
                setLoading(false)
            }
        }
    }

    return (
        <div className="w-full md:w-8/12 md:mx-auto md:mt-4 md:mb-4">
            <TreeTable value={nodes} lazy totalRecords={totalRecords} id="folderTable"
                       first={first} rows={rows} onExpand={onExpand} loading={loading} reorderableColumns={true}
                       selectionMode="single"
                       onSelectionChange={e => setSelectedNode(e.value as unknown as number)}
                       className="hover:bg-gray-700 font-medium">
                <Column field="icon" header="Typ" expander/>
                <Column field="name" className="text-left" header="Name"></Column>
                <Column field="length" header="Größe/Anzahl Seiten" className="text-left"></Column>
            </TreeTable>
        </div>
    )
}