import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import {useParams} from "react-router-dom";
import {Loader} from "lucide-react";
import {apiURL} from "@/src/Keycloak";
import {NoteDetail} from "@/src/models/NoteDetail";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {FormProvider, useForm} from "react-hook-form";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {z} from "zod";
import {t} from "i18next";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/components/ui/input";
import {useEffect} from "react";
import {Label} from "@/components/ui/label";

export const NoteDetailView  =()=>{
    const params = useParams()

    const {id} = params

    const {data, isLoading} = useQuery({
        queryKey: ['note', id],
        queryFn: async () => {
            const response = await axios.get<NoteDetail>(`${apiURL}/v1/elements/notes/${id}`)
            return response.data
        },
        enabled: !!id
    })
    const noteSchema = z.object({
        type: z.literal("note"),

        title: z
            .string()
            .min(1, { message: t("fieldRequired")! }),

        description: z.string().optional(),

        numberOfPages: z.coerce
            .number()
            .refine((v) => !Number.isNaN(v), {
                message: t("fieldRequired")!,
            }),

        authorId: z
            .string()
            .min(1, { message: t("fieldRequired")! }),

        parentId: z
            .string()
            .min(1, { message: t("fieldRequired")! }),

        extraInformation: z.string().optional(),
    });

    const onSubmit = ()=>{
        console.log("submit")
    }


    const form = useForm<z.infer<typeof noteSchema>>({
        resolver: zodResolver(noteSchema),
    })

    useEffect(() => {
        form.reset({
            type: "note",
            title: data?.currentNote?.name,
            description: data?.currentNote?.description,
            numberOfPages: data?.currentNote?.numberOfPages,
            authorId: data?.currentNote?.author.id,
            parentId: data?.currentNote?.parent.id,
            extraInformation: "",
        })
    }, [data]);


    return <>
        {isLoading ? <Loader/>:
            <Card className="m-6">
                <CardHeader>
                    <CardTitle>Musiknote {data?.currentNote?.name}</CardTitle>
                    <CardDescription>{data?.currentNote?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <FormProvider {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-2">
                                    <FormLabel>{t('title')}</FormLabel>
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
                                        <FormLabel>{t('description')}</FormLabel>
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
                                        <FormLabel>{t('numberOfPages')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2">
                                <Label htmlFor="picture">Vorherige Musiknote</Label>
                                <Input disabled value={data?.previousNote?.name}  />
                            </div>
                            <div className="grid grid-cols-2">
                                <Label htmlFor="picture">Nächste Musiknote</Label>
                                <Input disabled value={data?.nextNote?.name}  />
                            </div>
                            <div className="grid grid-cols-2">
                                <Label htmlFor="picture">Stelle innerhalb des Ordners</Label>
                                <Input disabled value={data?.index} type="number"  />
                            </div>
                            <div className="grid grid-cols-2">
                                <Label htmlFor="picture">Name des Ordners</Label>
                                <Input disabled value={data?.currentNote?.parent.name}  />
                            </div>
                        </form>
                    </FormProvider>
                </CardContent>
            </Card>
        }
    </>
}