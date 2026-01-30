import React, {useState} from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {Page} from "../../models/Page";
import {AuthorEmbeddedContainer} from "../../models/AuthorEmbeddedContainer";
import {Author} from "../../models/Author";
import {useDebounce} from "../../utils/DebounceHook";
import {apiURL} from "../../Keycloak";
import axios from "axios";
import {setElementAuthor, setElementSelectedAuthorName} from "../../ElementCreateSlice";
import {useTranslation} from "react-i18next";
import {FormInput} from "../form/FormInput";
import {FormField} from "@/components/ui/form";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";

export const NoteAuthorCreateSearchBar = ()=> {
    const dispatch = useAppDispatch()
    const authorName = useAppSelector(state=>state.elementReducer.authorName)
    const [currentSearchAuthors, setCurrentSearchAuthors] = useState<Page<AuthorEmbeddedContainer<Author>>>()
    const [open, setOpen] = useState(false)
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

    return <FormField
        name="parentId"
        render={({ field }) => (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div>
                        <FormInput
                            id="author"
                            value={authorName}
                            label={t("author")}
                            onChange={(v) => {
                                dispatch(setElementSelectedAuthorName(v));
                                setOpen(true);
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
                            {currentSearchAuthors?._embedded?.authorRepresentationModelList.map(
                                (author) => (
                                    <CommandItem
                                        key={author.id}
                                        value={author.name}
                                        onSelect={() => {
                                            field.onChange(author.id);
                                            dispatch(
                                               setElementSelectedAuthorName(author.name)
                                            );
                                            setOpen(false);
                                        }}
                                    >
                                        {author.name}
                                    </CommandItem>
                                )
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>)}/>
}