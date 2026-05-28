import { FC, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { PinboardPost } from "@/src/models/Pinboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { LayoutDashboard, Pencil, Pin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale/de";
import { useTranslation } from "react-i18next";

type Props = {
    clubId: string;
    canWrite: boolean;
};

const formatDate = (iso: string) => {
    try {
        return format(new Date(iso), "Pp", { locale: de });
    } catch {
        return "";
    }
};

export const ClubPinboardSection: FC<Props> = ({ clubId, canWrite }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [pinned, setPinned] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data } = useQuery({
        queryKey: ["club-pinboard", clubId],
        queryFn: async () => axios.get<PinboardPost[]>(`${apiURL}/v1/clubs/${clubId}/pinboard`),
    });
    const posts = data?.data ?? [];

    const resetForm = () => {
        setTitle("");
        setBody("");
        setPinned(false);
        setEditingId(null);
    };

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ["club-pinboard", clubId] });
    };

    const createMutation = useMutation({
        mutationFn: async () => axios.post(`${apiURL}/v1/clubs/${clubId}/pinboard`, { title, body, pinned }),
        onSuccess: async () => {
            resetForm();
            await invalidate();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (id: string) => axios.patch(`${apiURL}/v1/clubs/${clubId}/pinboard/${id}`, { title, body, pinned }),
        onSuccess: async () => {
            resetForm();
            await invalidate();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => axios.delete(`${apiURL}/v1/clubs/${clubId}/pinboard/${id}`),
        onSuccess: async () => {
            await invalidate();
        },
    });

    const startEdit = (post: PinboardPost) => {
        setEditingId(post.id);
        setTitle(post.title);
        setBody(post.body);
        setPinned(post.pinned);
    };

    const onSubmit = () => {
        if (!title.trim()) return;
        if (editingId) {
            updateMutation.mutate(editingId);
        } else {
            createMutation.mutate();
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4">
            {canWrite && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="size-5 text-accentDark" />
                            {editingId ? t("pinboard.edit") : t("pinboard.create")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2">
                            <Label htmlFor="pinboard-title">{t("pinboard.field.title")}</Label>
                            <Input id="pinboard-title" value={title} onChange={(event) => setTitle(event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pinboard-body">{t("pinboard.field.body")}</Label>
                            <Textarea id="pinboard-body" rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="pinboard-pinned" checked={pinned} onCheckedChange={(value) => setPinned(value === true)} />
                            <Label htmlFor="pinboard-pinned">{t("pinboard.pinned")}</Label>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={onSubmit} disabled={!title.trim() || isSaving}>
                                {t("save")}
                            </Button>
                            {editingId && (
                                <Button variant="outline" onClick={resetForm}>
                                    {t("cancel")}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("pinboard.empty")}</p>
            ) : (
                <div className="space-y-3">
                    {posts.map((post) => (
                        <Card key={post.id} className={post.pinned ? "border-accentDark" : ""}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {post.pinned && <Pin className="size-4 text-accentDark" />}
                                            {post.title}
                                        </CardTitle>
                                        <CardDescription>
                                            {post.authorName} · {formatDate(post.createdAt)}
                                        </CardDescription>
                                    </div>
                                    {canWrite && (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => startEdit(post)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                                                    <Trash2 className="size-4 text-red-500" />
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t("pinboard.delete")}</AlertDialogTitle>
                                                        <AlertDialogDescription>{t("pinboard.delete-confirm")}</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMutation.mutate(post.id)}>
                                                            {t("pinboard.delete")}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-sm">{post.body}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
