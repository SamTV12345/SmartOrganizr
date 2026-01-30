import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { Loader } from "lucide-react";
import { t } from "i18next";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import { apiURL } from "@/src/Keycloak";
import { NoteDetail } from "@/src/models/NoteDetail";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const NoteDetailView = () => {
    const { id } = useParams();

    /* ----------------------------- Zod 4 schema ----------------------------- */

    const noteSchema = z.object({
        type: z.literal("note"),

        title: z.string().min(1, {
            message: t("fieldRequired")!,
        }),

        description: z.string().default(""),

        numberOfPages: z.number().refine(
            (v) => !Number.isNaN(v),
            { message: t("fieldRequired")! }
        ),

        authorId: z.string().min(1, {
            message: t("fieldRequired")!,
        }),

        parentId: z.string().min(1, {
            message: t("fieldRequired")!,
        }),

        extraInformation: z.string().default(""),
    });

    type NoteFormValues = z.infer<typeof noteSchema>;

    /* ----------------------------- React Query ----------------------------- */

    const { data, isLoading } = useQuery({
        queryKey: ["note", id],
        queryFn: async () => {
            const response = await axios.get<NoteDetail>(
                `${apiURL}/v1/elements/notes/${id}`
            );
            return response.data;
        },
        enabled: !!id,
    });

    /* ----------------------------- React Hook Form ----------------------------- */

    const form = useForm({
        resolver: standardSchemaResolver(noteSchema),
        defaultValues: {
            type: "note",
            title: "",
            description: "",
            numberOfPages: 0,
            authorId: "",
            parentId: "",
            extraInformation: "",
        },
    });

    const onSubmit = (values: NoteFormValues) => {
        console.log(values);
    };

    /* ----------------------------- Reset on load ----------------------------- */

    useEffect(() => {
        if (!data) return;

        form.reset({
            type: "note",
            title: data.currentNote?.name ?? "",
            description: data.currentNote?.description ?? "",
            numberOfPages: data.currentNote?.numberOfPages ?? 0,
            authorId: data.currentNote?.author.id ?? "",
            parentId: data.currentNote?.parent.id ?? "",
            extraInformation: "",
        });
    }, [data, form]);

    /* ----------------------------- Render ----------------------------- */

    if (isLoading) {
        return <Loader />;
    }

    return (
        <Card className="m-6">
            <CardHeader>
                <CardTitle>Musiknote {data?.currentNote?.name}</CardTitle>
                <CardDescription>
                    {data?.currentNote?.description}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                    >
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-2">
                                    <FormLabel>{t("title")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-2">
                                    <FormLabel>{t("description")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="numberOfPages"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-2">
                                    <FormLabel>{t("numberOfPages")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2">
                            <Label>Vorherige Musiknote</Label>
                            <Input
                                disabled
                                value={data?.previousNote?.name ?? ""}
                            />
                        </div>

                        <div className="grid grid-cols-2">
                            <Label>Nächste Musiknote</Label>
                            <Input
                                disabled
                                value={data?.nextNote?.name ?? ""}
                            />
                        </div>

                        <div className="grid grid-cols-2">
                            <Label>Stelle innerhalb des Ordners</Label>
                            <Input
                                disabled
                                type="number"
                                value={data?.index ?? 0}
                            />
                        </div>

                        <div className="grid grid-cols-2">
                            <Label>Name des Ordners</Label>
                            <Input
                                disabled
                                value={data?.currentNote?.parent.name ?? ""}
                            />
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};