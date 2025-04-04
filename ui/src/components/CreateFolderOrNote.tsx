import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent, DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import {Check, ChevronsUpDown, Loader, PlusIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Author, AuthorPostDto} from "@/src/models/Author";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {setAuthorPage, setNodes} from "@/src/store/CommonSlice";
import {mergeAuthorInList} from "@/src/utils/AuthorUtilList";
import {useAppDispatch, useAppSelector} from "@/src/store/hooks";
import {useMutation} from "@tanstack/react-query";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {useState} from "react";
import {FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
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
import {Folder, FolderPostDto} from "@/src/models/Folder";
import {addAsParent, addChild, mapDtoToTreeData} from "@/src/utils/ElementUtils";
import {NoteItem, NotePostDto} from "@/src/models/NoteItem";

export function CreateFolderOrNote() {
    const {t} = useTranslation()
    const dispatch = useAppDispatch()
    const nodes = useAppSelector(state=>state.commonReducer.nodes)
    const [folderSelected, setFolderSelected] = useState(true)
    const [folderSearch, setFolderSearch] = useState<Page<FolderEmbeddedContainer<Folder>>>()

    const createFolder = async(folder: FolderPostDto)=>{
        const response = await axios.post(apiURL+`/v1/elements/folders`, folder)
        return response.data
    }

    const createNote = async(note: NotePostDto)=>{
        const response = await axios.post(apiURL+`/v1/elements/folders`, note)
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

    const createFolderMutation = useMutation<Folder, Error, FolderPostDto>({
        mutationFn: createFolder,
        onSuccess:(data)=>{
            if (data.parent != undefined || data.parent != null) {
                dispatch(setNodes(addChild(mapDtoToTreeData(data), nodes, data.parent.id)))
            } else {
                dispatch(setNodes(addAsParent(mapDtoToTreeData(data), nodes)))
            }
        }
    })

    const createNoteMutation = useMutation<NoteItem, Error, NotePostDto>({
        mutationFn: createNote,
        onSuccess:(data)=>{
            if (data.parent != undefined || data.parent != null) {
                dispatch(setNodes(addChild(mapDtoToTreeData(data), nodes, data.parent.id)))
            } else {
                dispatch(setNodes(addAsParent(mapDtoToTreeData(data), nodes)))
            }
        }
    })

    const searchFoldersByName = useMutation<Page<FolderEmbeddedContainer<Folder>>, Error, string>({
        mutationFn: searchFolder,
        onSuccess:(data)=>{
            setFolderSearch(data)
        }
    })

    const folderSchema = z.object({
        name: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        description: z.string().optional(),
        parentId: z.string()
    })

    const noteSchema = z.object({
        title: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        description: z.string().optional(),
        numberOfPages: z.number(),
        authorId: z.string(),
        parentId: z.string(),
        extraInformation: z.string().optional(),
    })

    const schema = z.union([folderSchema, noteSchema]);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            extraInformation: ""
        },
    })

    function onSubmit(values: z.infer<typeof schema>) {
        if ("name" in values) {
            createFolderMutation.mutate(values)
        } else {
            createNoteMutation.mutate(values)
        }
    }

    return (

        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="float-right mr-5 mt-5"><PlusIcon/></Button>
            </DialogTrigger>

            <DialogContent className="">
                <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                    Add folder or note
                </h2>
                <RadioGroup defaultValue="folder" className="flex">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="folder" id="folder" onClick={()=>{
                            setFolderSelected(true)
                        }} />
                        <Label htmlFor="folder">Ordner</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="note" id="note"  onClick={()=>{
                            setFolderSelected(false)
                        }} />
                        <Label htmlFor="note">Note</Label>
                    </div>
                </RadioGroup>

                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {folderSelected &&<FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />}
                        {!folderSelected &&<FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('title')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />}
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
                                                        ? searchFoldersByName.data?._embedded.elementRepresentationModelList.find(
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
                                                        {searchFoldersByName.data?._embedded.elementRepresentationModelList.map((language) => (
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
                                createFolderMutation.isPending? <Loader className="animate-spin"/>:
                                    t('save')
                            }</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>

    )
}
