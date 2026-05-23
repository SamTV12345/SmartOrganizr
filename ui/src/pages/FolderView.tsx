import {TreeElement} from "../components/Tree";
import {$api} from "@/src/api/client";
import {FileUploadModal} from "../components/modals/FileUploadModal";
import {CreateFolderOrNote} from "@/src/components/CreateFolderOrNote";
import {FolderItem} from "@/src/models/Folder";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Loader2} from "lucide-react";

export const FolderView = ()=>{
    const {data, isLoading} = $api.useQuery("get", "/v1/elements/parentDecks", undefined, {
        staleTime: 1000 * 60 * 10,
        refetchOnMount: false,
    })

    const folders = data ?? []


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
                <TreeElement data={folders} />
            </CardContent>
        </Card>
    </main>
}
