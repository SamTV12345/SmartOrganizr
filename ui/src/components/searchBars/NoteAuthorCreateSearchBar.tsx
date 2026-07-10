import React, {useMemo, useState} from "react";
import {useAppDispatch} from "../../store/hooks";
import {Page} from "../../models/Page";
import {AuthorEmbeddedContainer} from "../../models/AuthorEmbeddedContainer";
import {Author} from "../../models/Author";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import { http as axios } from "@/src/api/client";
import {setElementSelectedAuthorName} from "../../ElementCreateSlice";
import {useTranslation} from "react-i18next";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
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

type AuthorOption = {
    value: string
    label: string
}

type NoteAuthorCreateSearchBarProps = {
    /** Form field that stores the picked author's id. */
    idField?: string
    /** Form field that stores the (possibly free-typed) author name. */
    nameField?: string
    /** i18n key for the field label. */
    labelKey?: string
    /** Sync the ElementCreateSlice (only the composer field does). */
    syncRedux?: boolean
}

export const NoteAuthorCreateSearchBar = ({
    idField = "authorId",
    nameField = "authorName",
    labelKey = "author",
    syncRedux = true,
}: NoteAuthorCreateSearchBarProps = {})=> {
    const dispatch = useAppDispatch()
    const {control, setValue, watch} = useFormContext()
    const authorName = (watch(nameField) as string | undefined) ?? ""
    const [currentSearchAuthors, setCurrentSearchAuthors] = useState<Page<AuthorEmbeddedContainer<Author>>>()
    const {t} = useTranslation()

    const syncSelectedName = (name: string) => {
        if (syncRedux) {
            dispatch(setElementSelectedAuthorName(name));
        }
    };

    const loadAuthors = async (link: string) => {
        const authorsInResponse: Page<AuthorEmbeddedContainer<Author>> = await new Promise<Page<AuthorEmbeddedContainer<Author>>>(resolve => {
            axios.get(link)
                .then(resp => resolve(resp.data))
                .catch((error) => {
                    console.log(error)
                })
        })
        if (authorsInResponse !== undefined) {
            setCurrentSearchAuthors(authorsInResponse)
        }
    }

    useDebounce(() => {
        if ( authorName && authorName.length > 0) {
            loadAuthors(apiURL + `/v1/authors?page=0&name=${authorName}`)
            return;
        }
        setCurrentSearchAuthors(undefined);
    }, 1000, [authorName])

    const authorOptions: AuthorOption[] = useMemo(
        () =>
            currentSearchAuthors?._embedded?.authorRepresentationModelList.map((author) => ({
                value: author.id,
                label: author.name,
            })) ?? [],
        [currentSearchAuthors]
    );

    return <FormField
        control={control}
        name={idField}
        render={({ field }) => {
            const selectedAuthor = authorOptions.find((option) => option.value === field.value) ?? null;

            const handleAuthorSelect = (option: AuthorOption | null) => {
                if (!option) return;
                const id = option.value;
                const name = option.label;
                field.onChange(id);
                setValue(idField, id, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                });
                setValue(nameField, name, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                });
                syncSelectedName(name);
            };

            return <FormItem>
                <FormLabel>{t(labelKey)}</FormLabel>
                <FormControl>
                    <Combobox
                        items={authorOptions}
                        value={selectedAuthor}
                        itemToStringLabel={(item: AuthorOption) => item.label}
                        itemToStringValue={(item: AuthorOption) => item.value}
                        onValueChange={(option) => {
                            handleAuthorSelect(option as AuthorOption | null);
                        }}
                        inputValue={authorName ?? ""}
                        onInputValueChange={(value) => {
                            const nextValue = value ?? "";
                            setValue(nameField, nextValue, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                            });
                            setValue(idField, "", {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                            });
                            syncSelectedName(nextValue);
                        }}
                    >
                        <ComboboxInput
                            className="w-full"
                            showTrigger
                            showClear
                            placeholder={String(t(labelKey))}
                        />
                        <ComboboxContent>
                            <ComboboxList>
                                <ComboboxCollection>
                                    {(option: AuthorOption) => (
                                        <ComboboxItem key={option.value} value={option}>
                                            {option.label}
                                        </ComboboxItem>
                                    )}
                                </ComboboxCollection>
                                <ComboboxEmpty>{String(t("noResults"))}</ComboboxEmpty>
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </FormControl>
                <FormMessage />
            </FormItem>;
        }}/>
}
