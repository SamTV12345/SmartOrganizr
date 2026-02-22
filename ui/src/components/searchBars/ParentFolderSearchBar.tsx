import {setElementParentName} from "../../ElementCreateSlice";
import {useMemo, useState} from "react";
import {Page} from "../../models/Page";
import {FolderEmbeddedContainer} from "../../models/FolderEmbeddedContainer";
import axios from "axios";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {useTranslation} from "react-i18next";
import {FolderItem} from "@/src/models/Folder";
import {FormField, FormLabel} from "@/components/ui/form";
import {
    Combobox,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList
} from "@/components/ui/combobox";
import {useFormContext} from "react-hook-form";

type FolderOption = {
    value: string
    label: string
}

export const ParentFolderSearchBar = ()=>{
    const [currentFolder,setCurrentFolder] = useState<Page<FolderEmbeddedContainer<FolderItem>>>()
    const {control, setValue} = useFormContext()
    const elementParentName = useAppSelector(state => state.elementReducer.searchParentName)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()
    useDebounce(()=>{
        if(elementParentName) {
            loadSearchedFolder(apiURL + `/v1/elements/folders?page=0&folderName=${elementParentName}`);
        }
    },1000,[elementParentName])

    const folderOptions: FolderOption[] = useMemo(
        () =>
            currentFolder?._embedded?.elementRepresentationModelList.map((folder) => ({
                value: folder.id,
                label: folder.name,
            })) ?? [],
        [currentFolder]
    );

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

    return <FormField control={control} name="parentId" render={({field})=>{
        const selectedFolder = folderOptions.find((option) => option.value === field.value) ?? null;

        const handleFolderSelect = (option: FolderOption | null) => {
            if (!option) return;
            const id = option.value;
            const name = option.label;
            field.onChange(id);
            setValue("parentId", id, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
            });
            dispatch(setElementParentName(name));
        };

        return <div className="space-y-2">
            <FormLabel>{t("superFolder")}</FormLabel>
            <Combobox
                items={folderOptions}
                itemToStringLabel={(item: FolderOption) => item.label}
                itemToStringValue={(item: FolderOption) => item.value}
                onValueChange={(option) => {
                    console.log(option)
                    handleFolderSelect(option);
                }}
                onInputValueChange={(value) => {
                    dispatch(setElementParentName(value));
                }}
            >
                <ComboboxInput
                    className="w-full"
                    showTrigger
                    showClear
                    placeholder={String(t("superFolder"))}
                />
                <ComboboxContent>
                    <ComboboxList>
                        <ComboboxCollection>
                            {(option: FolderOption) => (
                                <ComboboxItem key={option.value} value={option}>
                                    {option.label}
                                </ComboboxItem>
                            )}
                        </ComboboxCollection>
                        <ComboboxEmpty>{String(t("noResults"))}</ComboboxEmpty>
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>;
    }}/>
}
