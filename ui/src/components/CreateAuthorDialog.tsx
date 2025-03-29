import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {Loader, PlusIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Author, AuthorPostDto} from "@/src/models/Author";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {setAuthorPage} from "@/src/store/CommonSlice";
import {mergeAuthorInList, mergeAuthors, mergeNewAuthorInList} from "@/src/utils/AuthorUtilList";
import {useAppDispatch, useAppSelector} from "@/src/store/hooks";
import {useMutation, UseMutationResult} from "@tanstack/react-query";


export function CreateAuthorDialog() {
    const {t} = useTranslation()
    const dispatch = useAppDispatch()
    const authorPage = useAppSelector(state=>state.commonReducer.authorPage)

    const createAuthor = async(author: AuthorPostDto)=>{
        const response = await axios.post(apiURL+`/v1/authors`, author)
        return response.data
    }
    const {mutate, isPending} = useMutation<Author, Error, AuthorPostDto>({
        mutationFn: createAuthor,
        onSuccess:(data)=>{
            dispatch(setAuthorPage(mergeAuthorInList(authorPage!, data)))
        }
    })

    const formSchema = z.object({
        name: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        extraInformation: z.string().optional(),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            extraInformation: ""
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutate(values)
    }

    return (

        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="float-right mr-5 mt-5"><PlusIcon/></Button>
            </DialogTrigger>
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
                            isPending? <Loader className="animate-spin"/>:
                            t('save')
                        }</Button>
                </DialogFooter>
            </form>
        </FormProvider>
            </DialogContent>
        </Dialog>

    )
}
