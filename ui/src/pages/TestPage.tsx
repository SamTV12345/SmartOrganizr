import {ElementItem} from "../models/ElementItem";
import {TreeNodeItem} from "../models/TreeNodeItem";
import {ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon} from "@primer/octicons-react";
import {useEffect, useState} from "react";
import {TreeData, TreeElement} from "../components/Tree";
import {Folder} from "../models/Folder";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setNodes} from "../store/CommonSlice";

export const TestPage = ()=>{
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)


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
                    icon: "pi pi-folder",
                    name: folder.name,
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
        loadFolder(apiURL + "/v1/elements/parentDecks")
    }, [])

    return <div>
           <TreeElement data={nodes} setData={setNodes}/>
    </div>
}