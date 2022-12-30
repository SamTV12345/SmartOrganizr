import {Dropdown} from "../components/form/Dropdown";
import {useEffect, useState} from "react";
import {Folder} from "../models/Folder";
import {apiURL} from "../Keycloak";
import axios from "axios";
import {Page as Paging} from "../models/Page";
import {FolderEmbeddedContainer} from "../models/FolderEmbeddedContainer";

export const ImportExportView = () => {
    const [selectedFolder, setSelectedFolder] = useState<number>()
    const [loadedFolders, setLoadedFolders] = useState<Paging<FolderEmbeddedContainer<Folder>>>()

    useEffect(() => {
        axios.get(apiURL + "/v1/elements/folders" + "?page=0")
            .then(resp => setLoadedFolders(resp.data))
    }, [])


    function downloadPDF(pdf:string, selectedFolder:Folder) {
        const linkSource = `data:application/pdf;base64,${pdf}`;
        const downloadLink = document.createElement("a");
        const fileName = selectedFolder.id+".pdf";

        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
    }

    const getPDFOfFolder = ()=>{
            axios.get(apiURL + "/v1/elements/"+selectedFolder+"/export")
            .then(resp => downloadPDF(resp.data, loadedFolders?._embedded.elementRepresentationModelList.find(f=>f.id===selectedFolder) as Folder))
    }

    return <div className="p-6">
            <h1 className="text-2xl">Export</h1>
            <h2 className="text-xl">Export Data as QR-Code</h2>

            <div className="grid grid-cols-[20%_10%_10%] gap-4">
                    <Dropdown value={selectedFolder} onChange={(e) => setSelectedFolder(Number(e.target.value))}>
                        {loadedFolders && loadedFolders._embedded &&
                            loadedFolders?._embedded.elementRepresentationModelList.map(folder => <option value={folder.id}
                                                                                                          key={folder.id}>{folder.name}</option>)}
                    </Dropdown>
                <button onClick={()=>getPDFOfFolder()} disabled={selectedFolder===undefined} className="bg-blue-500 disabled:bg-red-500 rounded ">Anfordern</button>
            </div>
        </div>
}