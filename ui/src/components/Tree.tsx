import React, { FC, useMemo, useState } from "react";
import "./Tree.css";
import { ElementItem, isNote } from "../models/ElementItem";
import axios, { AxiosResponse } from "axios";
import { fixProtocol } from "../utils/Utilities";
import { setLoadedFolders } from "../store/CommonSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { apiURL } from "../Keycloak";
import { setNotePDFUploadOpen, setSelectedFolder } from "../ModalSlice";
import {
    addChild,
    deleteChild,
    handleNewElements,
    traverseTree,
} from "../utils/ElementUtils";
import { UpdateFolderOrNote } from "@/src/components/UpdateFolderOrNote";
import { FolderItem } from "@/src/models/Folder";
import { useQueryClient } from "@tanstack/react-query";

export type TreeData = ElementItem;

type TreeNodeProps = {
    element: ElementItem;
    depth: number;
    expandedIds: Set<string>;
    onToggleFolder: (folder: FolderItem) => void;
};

interface TreeProps {
    data: TreeData[];
}

const collectFolderIds = (nodes: ElementItem[]): string[] => {
    const ids: string[] = [];
    for (const node of nodes) {
        if (node.type === "folder") {
            ids.push(node.id);
            ids.push(...collectFolderIds(node.elements ?? []));
        }
    }
    return ids;
};

export const TreeElement: FC<TreeProps> = ({ data }) => {
    const dispatch = useAppDispatch();
    const loadedFolders = useAppSelector((state) => state.commonReducer.loadedFolders);
    const queryClient = useQueryClient();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const allKnownFolderIds = useMemo(() => collectFolderIds(data), [data]);

    const onToggleFolder = async (event: FolderItem) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(event.id)) {
                next.delete(event.id);
            } else {
                next.add(event.id);
            }
            return next;
        });

        if (!loadedFolders.includes(event.id)) {
            dispatch(setLoadedFolders(event.id));
            try {
                const response = await axios.get<ElementItem[]>(fixProtocol(event.links[0].href));
                const newItems = handleNewElements(event, response.data);
                const eventWithChildren = { ...event, elements: newItems };
                queryClient.setQueryData(["folders"], (loadedNodes: ElementItem[]) =>
                    traverseTree(eventWithChildren, loadedNodes)
                );
            } catch (error) {
                console.log(error);
            }
        }
    };

    return (
        <div className="tree-shell">
            <div className="tree-toolbar">
                <button
                    type="button"
                    className="tree-toolbar-button"
                    onClick={() => setExpandedIds(new Set(allKnownFolderIds))}
                >
                    Alles aufklappen
                </button>
                <button
                    type="button"
                    className="tree-toolbar-button"
                    onClick={() => setExpandedIds(new Set())}
                >
                    Alles einklappen
                </button>
            </div>
            <div className="tree-scroll-container">
                <ul className="d-tree-container">
                    {data?.map((tree) => (
                        <TreeNode
                            element={tree}
                            key={tree.id}
                            depth={0}
                            expandedIds={expandedIds}
                            onToggleFolder={onToggleFolder}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

const TreeNode: FC<TreeNodeProps> = ({
    element,
    depth,
    expandedIds,
    onToggleFolder,
}) => {
    const dispatch = useAppDispatch();
    const hasChild = element.type === "folder";
    const queryClient = useQueryClient();
    const isExpanded = hasChild && expandedIds.has(element.id);


    const drag = (ev: React.DragEvent<HTMLDivElement>, id: TreeData) => {
        ev.dataTransfer.setData("id", JSON.stringify(id));
    };

    const moveToFolder = async (element: TreeData, keyNum: string) => {
        await new Promise<ElementItem[]>(() => {
            axios
                .patch(apiURL + `/v1/elements/${element.id}/${keyNum}`)
                .then(() => {
                    queryClient.setQueryData(["folders"], (folders: ElementItem[]) => {
                        return addChild(
                            element,
                            deleteChild(element.id, folders),
                            keyNum
                        );
                    });
                })
                .catch((error) => {
                    console.log(error);
                });
        });
    };

    const openPDFInNewTab = (base64URL: string) => {
        const win = window.open();
        if (win === undefined || win === null) return;
        win.document.write(
            '<iframe src="' +
                base64URL +
                '" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>'
        );
    };

    return (
        <li className="d-tree-node" key={element.id} style={{ "--depth": depth } as React.CSSProperties}>
            <div
                className={`tree-row ${hasChild ? "tree-row-folder" : ""}`}
                draggable={true}
                onDragStart={(e) => drag(e, element)}
                onDragOver={(e) => {
                    if (element.type === "folder") {
                        e.preventDefault();
                    }
                }}
                onDrop={(e) => {
                    const parsedElement = JSON.parse(e.dataTransfer.getData("id"));
                    if (parsedElement.id !== element.id) {
                        e.preventDefault();
                        moveToFolder(parsedElement, element.id);
                    }
                }}
                onClick={() => {
                    if (hasChild) {
                        onToggleFolder(element);
                    }
                }}
            >
                <button
                    type="button"
                    className={`tree-toggle ${isExpanded ? "active" : ""}`}
                    disabled={!hasChild}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChild) {
                            onToggleFolder(element);
                        }
                    }}
                >
                    {hasChild ? <i className="fa-solid fa-chevron-right" /> : null}
                </button>
                <div className="tree-label">
                    <i className={`fa-solid ${isNote(element) ? "fa-music" : "fa-folder"} mr-2`} />
                    <span className="tree-name">{element.name}</span>
                </div>
                <div
                    className="tree-actions"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <UpdateFolderOrNote
                        onDelete={(elementId) => {
                            queryClient.setQueryData(["folders"], (folders: ElementItem[]) => {
                                return deleteChild(elementId, folders);
                            });
                        }}
                        element={element}
                        trigger={<i className="fa-solid fa-pencil ml-2" />}
                    />
                    {isNote(element) && (
                        <i
                            className="fa-solid fa-upload ml-2"
                            onClick={() => {
                                dispatch(setSelectedFolder(element));
                                dispatch(setNotePDFUploadOpen(true));
                            }}
                        />
                    )}
                    {isNote(element) && element.pdfAvailable && (
                        <i
                            className="fa-solid fa-eye ml-2"
                            onClick={() => {
                                axios
                                    .get(apiURL + `/v1/elements/${element.id}/pdf`)
                                    .then((response: AxiosResponse<string>) => {
                                        openPDFInNewTab(response.data);
                                    })
                                    .catch((error) => {
                                        console.log(error);
                                    });
                            }}
                        />
                    )}
                    {isNote(element) && (
                        <i
                            className="fa-solid fa-copy ml-2"
                            onClick={() => {
                                const link =
                                    window.location.protocol +
                                    "//" +
                                    window.location.host +
                                    "/ui/noteManagement/notes/" +
                                    element.id;
                                navigator.clipboard.writeText(link);
                            }}
                        />
                    )}
                </div>
            </div>

            {hasChild && isExpanded && (
                <div className="d-tree-content">
                    <ul className="d-tree-container">
                        {element.elements?.map((child) => (
                            <TreeNode
                                key={child.id}
                                element={child}
                                depth={depth + 1}
                                expandedIds={expandedIds}
                                onToggleFolder={onToggleFolder}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
};
