import {setElementParent, setElementParentName} from "../../ElementCreateSlice";
import {Waypoint} from "react-waypoint";
import {fixProtocol} from "../../utils/Utilities";
import {useState} from "react";
import {Page} from "../../models/Page";
import {FolderEmbeddedContainer} from "../../models/FolderEmbeddedContainer";
import {Folder} from "../../models/Folder";
import axios from "axios";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {useTranslation} from "react-i18next";

export const ParentFolderSearchBar = ()=>{
    const [currentFolder,setCurrentFolder] = useState<Page<FolderEmbeddedContainer<Folder>>>()
    const elementParentName = useAppSelector(state => state.elementReducer.searchParentName)
    const searchParentName = useAppSelector(state=>state.elementReducer.searchParentName)
    const [selectedId, setSelectedFolderId] = useState<number>(-100)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()
    useDebounce(()=>{
        if(elementParentName) {
            loadSearchedFolder(apiURL + `/v1/elements/folders?page=0&folderName=${elementParentName}`);
        }
    },1000,[elementParentName])

    const loadSearchedFolder = async(link:string)=> {
        const folders: Page<FolderEmbeddedContainer<Folder>> = await new Promise<Page<FolderEmbeddedContainer<Folder>>>(resolve => {
            axios.get(link)
                .then((resp) => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if(folders!==undefined){
            setCurrentFolder(folders)
        }
    }

    return <div className="col-span-2 grid grid-cols-2">
        <div>{t('superFolder')}</div>
    <div>
    <input className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" value={searchParentName}
    onChange={(v)=>dispatch(setElementParentName(v.target.value))}/>
    <i className="fa fa-check" onClick={()=>{
        if(selectedId!==-100 &&currentFolder?._embedded.elementRepresentationModelList){
            dispatch(setElementParentName(currentFolder._embedded.elementRepresentationModelList.find(a=>a.id===selectedId)?.name))
            dispatch(setElementParent(currentFolder._embedded.elementRepresentationModelList.find(a=>a.id===selectedId)?.id))
        }}}/>
    <ul>
        {currentFolder&&currentFolder._embedded && currentFolder._embedded.elementRepresentationModelList.map((folder,index)=>
            <li key={folder.id} onClick={()=>{setSelectedFolderId(folder.id)}} className={`${selectedId===folder.id?'bg-gray-600':''}`}>{folder.name}
                {currentFolder.page.size-index<10 &&
                    currentFolder._links && currentFolder._links.next
                    && currentFolder._links.next.href
                    && <Waypoint onEnter={()=>{
                        loadSearchedFolder(fixProtocol(currentFolder._links.next.href))
                    }}/>}</li>
        )}
    </ul>
</div>
    </div>
}