import { ChangeEvent, FC, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http as axios, uploadWithProgress } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { ClubFile } from "@/src/models/ClubFile";
import { formatBytes } from "@/src/utils/formatBytes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, FolderKanban, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "@/src/hooks/useDateFormat";

type Props = {
    clubId: string;
    canWrite: boolean;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ClubFilesSection: FC<Props> = ({ clubId, canWrite }) => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);

    const { data } = useQuery({
        queryKey: ["club-files", clubId],
        queryFn: async () => axios.get<ClubFile[]>(`${apiURL}/v1/clubs/${clubId}/files`),
    });
    const files = data?.data ?? [];

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ["club-files", clubId] });
    };

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            // A 25 MB upload used to show a bare "…" with no sign of progress.
            await uploadWithProgress(`${apiURL}/v1/clubs/${clubId}/files`, formData, setProgress);
        },
        onSuccess: async () => {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            await invalidate();
        },
        onSettled: () => setProgress(null),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => axios.delete(`${apiURL}/v1/clubs/${clubId}/files/${id}`),
        onSuccess: async () => {
            await invalidate();
        },
    });

    const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setError(t("files.too-large"));
            event.target.value = "";
            return;
        }
        setError(null);
        uploadMutation.reset();
        setProgress(0);
        uploadMutation.mutate(file);
    };

    const onDownload = async (file: ClubFile) => {
        const response = await axios.get(`${apiURL}/v1/clubs/${clubId}/files/${file.id}`, { responseType: "blob" });
        const downloadURL = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = downloadURL;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(downloadURL);
    };

    return (
        <div className="space-y-4">
            {canWrite && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderKanban className="size-5 text-accentDark" />
                            {t("files.upload")}
                        </CardTitle>
                        <CardDescription>{t("files.title")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input ref={fileInputRef} type="file" onChange={onFileSelected} disabled={uploadMutation.isPending} />
                        {uploadMutation.isPending && (
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-sm">
                                    {t("files.uploading", { percent: progress ?? 0 })}
                                </p>
                                <div className="bg-muted h-1.5 w-full overflow-hidden rounded">
                                    <div
                                        className="bg-primary h-full transition-all"
                                        style={{ width: `${progress ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {uploadMutation.isError && (
                            <p className="text-sm text-red-500">{t("files.upload-failed")}</p>
                        )}
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </CardContent>
                </Card>
            )}

            {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("files.empty")}</p>
            ) : (
                <Card>
                    <CardContent className="space-y-2 pt-6">
                        {files.map((file) => (
                            <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(file.sizeBytes)} · {file.uploadedBy} · {formatDateTime(file.createdAt)}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => onDownload(file)}>
                                        <Download className="size-4" />
                                    </Button>
                                    {canWrite && (
                                        <AlertDialog>
                                            <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                                                <Trash2 className="size-4 text-red-500" />
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t("files.delete")}</AlertDialogTitle>
                                                    <AlertDialogDescription>{t("files.delete-confirm")}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteMutation.mutate(file.id)}>
                                                        {t("files.delete")}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
