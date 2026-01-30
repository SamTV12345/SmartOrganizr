import {setElementParentName} from "../../ElementCreateSlice";
import {useState} from "react";
import {Page} from "../../models/Page";
import {FolderEmbeddedContainer} from "../../models/FolderEmbeddedContainer";
import axios from "axios";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {useTranslation} from "react-i18next";
import {FolderItem} from "@/src/models/Folder";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {FormField} from "@/components/ui/form";
import {FormInput} from "@/src/components/form/FormInput";

export const ParentFolderSearchBar = ()=>{
    const [currentFolder,setCurrentFolder] = useState<Page<FolderEmbeddedContainer<FolderItem>>>()
    const elementParentName = useAppSelector(state => state.elementReducer.searchParentName)
    const searchParentName = useAppSelector(state=>state.elementReducer.searchParentName)
    const [open, setOpen] = useState(false)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()
    useDebounce(()=>{
        if(elementParentName) {
            loadSearchedFolder(apiURL + `/v1/elements/folders?page=0&folderName=${elementParentName}`);
        }
    },1000,[elementParentName])

    const loadSearchedFolder = async(link:string)=> {
        const folders: Page<FolderEmbeddedContainer<FolderItem>> = await new Promise<Page<FolderEmbeddedContainer<FolderItem>>>(resolve => {
            axios.get(link)
                .then((resp) => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if(folders!==undefined){
            setCurrentFolder(folders)
        }
    }

    return <FormField name="parentId" render={({field})=>
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div>
                    <FormInput
                        id="parentFolder"
                        value={searchParentName}
                        label={t("superFolder")}
                        onChange={(v) => {
                            dispatch(setElementParentName(v));
                            if (!open) setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                    />
                </div>
            </PopoverTrigger>

            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command shouldFilter={false}>
                    <CommandList className="max-h-64 overflow-y-auto">
                        <CommandEmpty>{t("noResults")}</CommandEmpty>

                        <CommandGroup>
                            {currentFolder?._embedded?.elementRepresentationModelList.map(
                                (folder) => (
                                    <CommandItem
                                        key={folder.id}
                                        value={folder.name}
                                        onSelect={() => {
                                            field.onChange(folder.id);
                                            dispatch(
                                                setElementParentName(folder.name)
                                            );
                                            setOpen(false);
                                        }}
                                    >
                                        {folder.name}
                                    </CommandItem>
                                )
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>}/>
}