import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {Loader, PlusIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Author} from "@/src/models/Author";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {InfiniteData, useMutation, useQueryClient} from "@tanstack/react-query";
import {AuthorPatchDto} from "@/src/models/AuthorPatchDto";
import {Page} from "@/src/models/Page";
import {AuthorEmbeddedContainer} from "@/src/models/AuthorEmbeddedContainer";
import {useAPIStore} from "@/src/store/zustand";
import {useEffect} from "react";

export function UpdateAuthorDialog() {
    const {t} = useTranslation()
    const queryClient = useQueryClient()
    const selectedAuthor = useAPIStore(state=>state.selectedAuthor)

    const updateAuthorQuery = useMutation({
        mutationKey: ['updateAuthor'],
        mutationFn: async (author: Author) => {
            return axios.patch(apiURL + `/v1/authors/${author.id}`, {name: author.name, extraInformation: author.extraInformation} as AuthorPatchDto)
        },
        onSuccess: async (data, variables) => {
            console.log(data, variables)
            queryClient.setQueryData(['authors'], (oldData: InfiniteData<Page<AuthorEmbeddedContainer<Author>>, unknown>) => {
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => {
                        return {
                            ...page,
                            _embedded: {
                                ...page._embedded,
                                authorRepresentationModelList: page._embedded.authorRepresentationModelList.map((author)=>{
                                    if (author.id === variables.id) {
                                        return {
                                            ...author,
                                            name: data.data.name,
                                            extraInformation: data.data.extraInformation
                                        }
                                    }
                                    return author
                                })
                            }
                        }
                    })
                }
            })
        }
    })

    const formSchema = z.object({
        id: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        name: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        extraInformation: z.string().optional(),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    })

    useEffect(() => {
        if (selectedAuthor) {
            form.reset({
                id: selectedAuthor.id,
                name: selectedAuthor.name,
                extraInformation: selectedAuthor.extraInformation,
            });
        }
    }, [selectedAuthor, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        updateAuthorQuery.mutate(values)
    }

    return (
        <Dialog open={!!selectedAuthor} onOpenChange={()=>{
            useAPIStore.setState({selectedAuthor: undefined})
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <DialogHeader>
                            <DialogTitle>{t('add-authors')}</DialogTitle>
                            <DialogDescription>
                                {t('add-authors-description')}
                            </DialogDescription>
                        </DialogHeader>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Amadeus" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="extraInformation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('extraInformation')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Mozart" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose>
                                <Button type="button" variant="secondary" >{t('cancel')}</Button>
                            </DialogClose>
                            <Button type="submit" >{
                                updateAuthorQuery.isPending? <Loader className="animate-spin"/>:
                                    t('save')
                            }</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>

    )
}
