import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent, DialogFooter, DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {Check, ChevronsUpDown, Loader, Pencil, PlusIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {undefined, z} from "zod";
import {FormProvider, useForm, useWatch} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {setNodes} from "@/src/store/CommonSlice";
import {useAppDispatch, useAppSelector} from "@/src/store/hooks";
import {useMutation} from "@tanstack/react-query";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import { cn } from "./NavigationButton";
import {Page} from "@/src/models/Page";
import {FolderEmbeddedContainer} from "@/src/models/FolderEmbeddedContainer";
import {FolderItem, FolderPostDto} from "@/src/models/Folder";
import {replaceFolder, replaceNote} from "@/src/utils/ElementUtils";
import {NoteItem, NotePostDto, NotePutDto} from "@/src/models/NoteItem";
import {AuthorEmbeddedContainer} from "@/src/models/AuthorEmbeddedContainer";
import {Author} from "@/src/models/Author";
import React, {useEffect, useMemo} from "react";
import {ElementItem, isFolder, isNote} from "@/src/models/ElementItem";


export type UpdateFolderOrNoteProps = {
    element: ElementItem,
    trigger: React.ReactNode
}

export function UpdateFolderOrNote(props: UpdateFolderOrNoteProps) {
    const {t} = useTranslation()
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)

    const updateFolder = async(folder: FolderPostDto)=>{
        const response = await axios.post(apiURL+`/v1/elements/folders`, folder)
        return response.data
    }

    const updateNote = async(note: NotePutDto)=>{
        const response = await axios.patch(apiURL+`/v1/elements/notes/${props.element.id}`, note)
        return response.data
    }

    const searchFolder = async(folderName: string)=>{
        const response = await axios.get(apiURL+`/v1/elements/folders`, {
            params: {
                folderName,
                page: 0
            }
        })
        return response.data
    }

    const searchAuthor = async(folderName: string)=>{
        const response = await axios.get(apiURL+`/v1/authors`, {
            params: {
                name: folderName,
                page: 0
            }
        })
        return response.data
    }

    const createFolderMutation = useMutation<FolderItem, Error, FolderPostDto>({
        mutationFn: updateFolder,
        onSuccess:(data)=>{
            if (data.parent) {
                dispatch(setNodes(replaceFolder(data, nodes)))
            } else {
                dispatch(setNodes(replaceFolder(data, nodes)))
            }
        }
    })

    const createNoteMutation = useMutation<NoteItem, Error, NotePutDto>({
        mutationFn: updateNote,
        onSuccess:(data)=>{
            if (data.parent) {
                dispatch(setNodes(replaceNote(data, nodes)))
            } else {
                dispatch(setNodes(replaceNote(data, nodes)))
            }
        }
    })

    const searchAuthorsByName = useMutation<Page<AuthorEmbeddedContainer<Author>>, Error, string>({
        mutationFn: searchAuthor,
    })

    const searchFoldersByName = useMutation<Page<FolderEmbeddedContainer<FolderItem>>, Error, string>({
        mutationFn: searchFolder,
    })

    const folderSchema = z.object({
        name: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        description: z.string().optional(),
        type: z.literal("folder"),
        parentId: z.string().optional(),
    })

    const noteSchema = z.object({
        type: z.literal("note"),
        name: z.string(),
        description: z.string({required_error: t('fieldRequired')!}).optional(),
        numberOfPages: z.coerce.number({required_error: t('fieldRequired')!}),
        authorId: z.string({required_error: t('fieldRequired')!}),
        parentId: z.string({required_error: t('fieldRequired')!}),
        extraInformation: z.string().optional(),
    })

    const schema = z.union([folderSchema, noteSchema]);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            description: "",
            parentId: "",
            type: 'folder'
        },
    })

    const watchType = useWatch({name: 'type', control: form.control})

    function onSubmit(values: z.infer<typeof schema>) {
        if ("type" in values && values.type === "folder") {
            createFolderMutation.mutate(values)
        } else {
            createNoteMutation.mutate(values)
        }
    }
    const selectableFolderItems = useMemo(()=>{
        if (props.element.parent) {
            return [props.element.parent]
        } else {
            return searchFoldersByName.data?._embedded.elementRepresentationModelList || []
        }
    }, [searchFoldersByName])


    const selectableAuthorItems = useMemo(()=>{
        if (isFolder(props.element)) {
            return [] as Author[]
        } else {
           return [props.element.author, ...searchAuthorsByName.data?._embedded.authorRepresentationModelList || []]
        }
    }, [searchAuthorsByName])


    useEffect(() => {
        if (isNote(props.element)) {
            form.reset({
                authorId: props.element.author!.id,
                description: props.element.description,
                name: props.element.name!,
                numberOfPages: props.element.numberOfPages!,
                parentId: props.element.parent.id!,
                type: props.element.type
            })
        } else {
            form.reset({
                description: props.element.description,
                name: props.element.name!,
                parentId: props.element.parent?.id!,
                type:  props.element.type
            })
        }


    }, [props]);


    return (
        <Dialog>
            <DialogTrigger asChild>
                {props.trigger}
            </DialogTrigger>

            <DialogContent className="">
                <DialogTitle className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                    Ordner oder Musiknote erstellen
                </DialogTitle>


                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="type"
                            disabled
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormControl>
                                        <RadioGroup
                                            disabled
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="grid grid-cols-2"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="folder" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Ordner
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="note" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Musiknote
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('title')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('description')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {
                            watchType === 'note' &&                         <FormField
                                control={form.control}
                                name="numberOfPages"
                                render={({ field }) => (
                                    <FormItem className="grid-cols-2">
                                        <FormLabel>{t('numberOfPages')}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }

                        {
                            watchType === 'note' &&                         <FormField
                                control={form.control}
                                name="extraInformation"
                                render={({ field }) => (
                                    <FormItem className="grid-cols-2">
                                        <FormLabel>{t('extraInformation')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }

                        {watchType === 'note' && <FormField
                            control={form.control}
                            name="authorId"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>Author</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? selectableAuthorItems.find(
                                                            (language) => language.id === field.value
                                                        )?.name
                                                        : "Ordner auswählen"}
                                                    <ChevronsUpDown className="opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[220px] p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Author suchen..."
                                                    className="h-9"
                                                    onValueChange={(e)=>{
                                                        searchAuthorsByName.mutate(e)
                                                    }}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No framework found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {selectableAuthorItems.map((language) => (
                                                            <CommandItem
                                                                value={language.name}
                                                                key={language.id}
                                                                onSelect={() => {
                                                                    form.setValue("authorId", language.id)
                                                                }}
                                                            >
                                                                {language.name}
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto",
                                                                        language.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>)}/>}

                        <FormField
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>Ordner</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? selectableFolderItems.find(
                                                            (language) => language.id === field.value
                                                        )?.name
                                                        : "Ordner auswählen"}
                                                    <ChevronsUpDown className="opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[220px] p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Search framework..."
                                                    className="h-9"
                                                    onValueChange={(e)=>{
                                                        searchFoldersByName.mutate(e)
                                                    }}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No framework found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {selectableFolderItems.map((language) => (
                                                            <CommandItem
                                                                value={language.name}
                                                                key={language.id}
                                                                onSelect={() => {
                                                                    form.setValue("parentId", language.id)
                                                                }}
                                                            >
                                                                {language.name}
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto",
                                                                        language.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>)}/>
                        <DialogFooter>
                            <DialogClose>
                                <Button type="button" variant="secondary" >{t('cancel')}</Button>
                            </DialogClose>
                            <Button type="submit" >{
                                (createFolderMutation.isPending || createNoteMutation.isPending) ? <Loader className="animate-spin"/>:
                                    t('save')
                            }</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>

    )
}
