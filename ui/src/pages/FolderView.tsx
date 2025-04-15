import {TreeElement} from "../components/Tree";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {FileUploadModal} from "../components/modals/FileUploadModal";
import {CreateFolderOrNote} from "@/src/components/CreateFolderOrNote";
import {useQuery} from "@tanstack/react-query";
import {FolderItem} from "@/src/models/Folder";

export const FolderView = ()=>{
    const {data, isLoading} = useQuery<FolderItem[]>({
        enabled: true,
        queryKey: ['folders'],
        queryFn: async () => {
            const response = await axios.get(apiURL + "/v1/elements/parentDecks")
            return response.data
        },
    })


    if (isLoading || !data) {
        return <div className="flex justify-center items-center h-screen">
            <i className="fa fa-spinner fa-spin fa-3x"/>
        </div>
    }

    console.log("DAta is", data)

    return <div>
        <CreateFolderOrNote/>
        <FileUploadModal/>
        <div className="h-12"></div>
        <div className="border-0 w-full md:w-8/12  table-fixed md:mx-auto md:mt-8 md:mb-4 bg-gray-800 text-white p-6">
        <div className="mx-auto">
           <TreeElement data={data} />
        </div>
    </div>
    </div>
}
