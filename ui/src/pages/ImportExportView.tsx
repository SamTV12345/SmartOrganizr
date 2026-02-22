import {useEffect, useMemo, useState} from "react";
import {apiURL} from "../Keycloak";
import axios from "axios";
import {Page as Paging} from "../models/Page";
import {FolderEmbeddedContainer} from "../models/FolderEmbeddedContainer";
import {FolderItem} from "@/src/models/Folder";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Download, FolderOpen} from "lucide-react";

export const ImportExportView = () => {
    const [selectedFolder, setSelectedFolder] = useState<string>()
    const [loadedFolders, setLoadedFolders] = useState<Paging<FolderEmbeddedContainer<FolderItem>>>()

    useEffect(() => {
        axios.get(apiURL + "/v1/elements/folders" + "?page=0")
            .then(resp => setLoadedFolders(resp.data))
    }, [])

    const folders = useMemo(() => {
        return loadedFolders?._embedded?.elementRepresentationModelList ?? []
    }, [loadedFolders])

    const selectedFolderName = useMemo(() => {
        return folders.find(folder => folder.id === selectedFolder)?.name
    }, [folders, selectedFolder])

    const getPDFOfFolder = ()=>{
        if(!selectedFolder){
            return
        }
        window.open(`/public/${selectedFolder}/export`, '_blank');
    }

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8">
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-6">
                <h1 className="text-3xl font-semibold tracking-tight">Import/Export</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Exportiere einen Ordner als PDF für Druck, Teilen oder Offline-Nutzung.
                </p>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="size-5 text-primary"/>
                        Ordner exportieren
                    </CardTitle>
                    <CardDescription>
                        Wähle einen Ordner und exportiere den Inhalt als PDF.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Ordner</Label>
                        <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Ordner auswählen"/>
                            </SelectTrigger>
                            <SelectContent>
                                {folders.map(folder => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                        {folder.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={getPDFOfFolder} disabled={selectedFolder===undefined}>
                            <Download className="size-4"/>
                            PDF exportieren
                        </Button>
                        {selectedFolderName && (
                            <p className="text-muted-foreground text-sm">
                                Ausgewählt: <span className="text-foreground font-medium">{selectedFolderName}</span>
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}

