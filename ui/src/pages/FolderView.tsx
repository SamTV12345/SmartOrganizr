import {useEffect} from "react";
import {TreeData, TreeElement} from "../components/Tree";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setNodes} from "../store/CommonSlice";
import {FileUploadModal} from "../components/modals/FileUploadModal";
import {CreateFolderOrNote} from "@/src/components/CreateFolderOrNote";
import {FolderItem} from "@/src/models/Folder";

export const FolderView = ()=>{
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const loadFolder = async (link: string) => {
        const folders: FolderItem[] = await new Promise<FolderItem[]>(resolve => {
            axios.get(link)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (folders !== undefined) {
            dispatch(setNodes(folders))
        }
    }

    useEffect(() => {
        if(nodes.length==0) {
            loadFolder(apiURL + "/v1/elements/parentDecks")
        }
    }, [])

    return <div>
        <CreateFolderOrNote/>
        <FileUploadModal/>
        <div className="h-12"></div>
        <div className="border-0 w-full md:w-8/12  table-fixed md:mx-auto md:mt-8 md:mb-4 bg-gray-800 text-white p-6">
        <div className="mx-auto">
           <TreeElement data={nodes} setData={(d)=>setNodes(d)}/>
        </div>
    </div>
    </div>
}
