import {TreeElement} from "../components/Tree";
import axios from "axios";
import {apiURL} from "../Keycloak";
import {FileUploadModal} from "../components/modals/FileUploadModal";
import {CreateFolderOrNote} from "@/src/components/CreateFolderOrNote";
import {useQuery} from "@tanstack/react-query";
import {FolderItem} from "@/src/models/Folder";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Loader2} from "lucide-react";

export const FolderView = ()=>{
    const {data, isLoading} = useQuery<FolderItem[]>({
        enabled: true,
        queryKey: ['folders'],
        queryFn: async () => {
            const response = await axios.get(apiURL + "/v1/elements/parentDecks")
            return response.data
        },
        staleTime: 1000 * 60 * 10,
        refetchOnMount: false
    })


    if (isLoading || !data) {
        return <div className="flex justify-center items-center h-screen">
            <Loader2 className="size-8 animate-spin text-muted-foreground"/>
        </div>
    }

    return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-10">
        <CreateFolderOrNote/>
        <FileUploadModal/>
        <Card className="mx-auto w-full md:w-10/12">
            <CardHeader>
                <CardTitle>Ordnerstruktur</CardTitle>
            </CardHeader>
            <CardContent>
                <TreeElement data={data} />
            </CardContent>
        </Card>
    </main>
}
