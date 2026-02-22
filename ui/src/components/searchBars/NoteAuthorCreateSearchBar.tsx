import React, {useMemo, useState} from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {Page} from "../../models/Page";
import {AuthorEmbeddedContainer} from "../../models/AuthorEmbeddedContainer";
import {Author} from "../../models/Author";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import axios from "axios";
import {setElementSelectedAuthorName} from "../../ElementCreateSlice";
import {useTranslation} from "react-i18next";
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

type AuthorOption = {
    value: string
    label: string
}

export const NoteAuthorCreateSearchBar = ()=> {
    const dispatch = useAppDispatch()
    const authorName = useAppSelector(state=>state.elementReducer.authorName)
    const {control, setValue} = useFormContext()
    const [currentSearchAuthors, setCurrentSearchAuthors] = useState<Page<AuthorEmbeddedContainer<Author>>>()
    const {t} = useTranslation()

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
        if ( authorName && authorName.length > 0)
            loadAuthors(apiURL + `/v1/authors?page=0&name=${authorName}`)
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
        name="authorId"
        render={({ field }) => {
            const selectedAuthor = authorOptions.find((option) => option.value === field.value) ?? null;

            const handleAuthorSelect = (option: AuthorOption | null) => {
                if (!option) return;
                const id = option.value;
                const name = option.label;
                field.onChange(id);
                setValue("authorId", id, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                });
                dispatch(setElementSelectedAuthorName(name));
            };

            return <div className="space-y-2">
                <FormLabel>{t("author")}</FormLabel>
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
                        dispatch(setElementSelectedAuthorName(value));
                    }}
                >
                    <ComboboxInput
                        className="w-full"
                        showTrigger
                        showClear
                        placeholder={String(t("author"))}
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
            </div>;
        }}/>
}
