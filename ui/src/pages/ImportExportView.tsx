import {useMemo, useState} from "react";
import {$api, http as axios} from "@/src/api/client";
import {apiURL} from "@/src/Keycloak";
import {FolderItem} from "@/src/models/Folder";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Download, FolderOpen} from "lucide-react";
import {useTranslation} from "react-i18next";

export const ImportExportView = () => {
    const {t} = useTranslation()
    const [selectedFolder, setSelectedFolder] = useState<string>()

    const { data: loadedFolders } = $api.useQuery("get", "/v1/elements/folders", {
        params: { query: { page: 0 } },
    })

    const folders = useMemo(() => {
        return loadedFolders?._embedded?.elementRepresentationModelList ?? []
    }, [loadedFolders])

    const selectedFolderName = useMemo(() => {
        return folders.find(folder => folder.id === selectedFolder)?.name
    }, [folders, selectedFolder])

    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)

    const getPDFOfFolder = async () => {
        if (!selectedFolder) {
            return
        }
        setExporting(true)
        setExportError(null)
        try {
            const response = await axios.get<Blob>(`${apiURL}/v1/elements/${selectedFolder}/export`, {responseType: "blob"})
            const url = URL.createObjectURL(new Blob([response.data], {type: "application/pdf"}))
            const link = document.createElement("a")
            link.href = url
            link.download = `${selectedFolderName ?? "export"}.pdf`
            link.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            const err = e as Error & { response?: { status: number } }
            setExportError(err.response?.status === 404
                ? t("importExport.noPdfInFolder")
                : t("importExport.exportFailed"))
        } finally {
            setExporting(false)
        }
    }

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6 md:py-8">
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-6">
                <h1 className="text-3xl font-semibold tracking-tight">{t("io")}</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    {t("importExport.subtitle")}
                </p>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="size-5 text-primary"/>
                        {t("importExport.exportFolder")}
                    </CardTitle>
                    <CardDescription>
                        {t("importExport.exportFolderHint")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>{t("folders")}</Label>
                        <Select value={selectedFolder} onValueChange={(v) => setSelectedFolder(v ?? undefined)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("importExport.folderPlaceholder")}/>
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
                        <Button onClick={getPDFOfFolder} disabled={selectedFolder===undefined || exporting}>
                            <Download className="size-4"/>
                            {exporting ? t("importExport.exporting") : t("importExport.exportPdf")}
                        </Button>
                        {selectedFolderName && (
                            <p className="text-muted-foreground text-sm">
                                {t("importExport.selected")} <span className="text-foreground font-medium">{selectedFolderName}</span>
                            </p>
                        )}
                    </div>
                    {exportError && (
                        <p className="text-sm text-red-500">{exportError}</p>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}

