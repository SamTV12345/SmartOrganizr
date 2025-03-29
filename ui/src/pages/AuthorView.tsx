import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {AuthorEmbeddedContainer} from "../models/AuthorEmbeddedContainer";
import {Author} from "../models/Author";
import {Page} from "../models/Page";
import axios from "axios";
import {apiURL, links} from "../Keycloak";
import {useTranslation} from "react-i18next";
import {CreateAuthorDialog} from "@/src/components/CreateAuthorDialog";
import {InfiniteData, useInfiniteQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {Loader, Loader2, Trash} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {useSearchParams} from "react-router-dom";
import {UpdateAuthorDialog} from "@/src/components/UpdateAuthorDialog";
import {useDebounce} from "@/src/utils/DebounceHook";
import {useAPIStore} from "@/src/store/zustand";


const createNextLink = ({pageParam}: {pageParam: number}, link: string, searchParams:  URLSearchParams) => {
    const url = new URL(link)
    if (pageParam) {
        url.searchParams.set('page', pageParam.toString())
    }
    if (searchParams.get('name')) {
        url.searchParams.set('name', searchParams.get('name')!)
    }

    return url.toString()
}

export const AuthorView = ()=> {
    const {t} = useTranslation()
    const [selected, setSelected] = React.useState<{ [key: string]: boolean }>({})
    const queryClient = useQueryClient()
    const allChecked = Object.keys(selected).map(key => selected[key]).every(value => value)
    const atLeastOneChecked = Object.keys(selected).map(key => selected[key]).some(value => value)
    const {data,  isLoading, fetchNextPage, isFetching, hasNextPage, refetch } = useInfiniteQuery<Page<AuthorEmbeddedContainer<Author>>>({
        queryKey: ['authors'],
        initialPageParam: 0,
        queryFn: async ({pageParam}) => {
            // @ts-ignore
            const response = await axios.get(createNextLink({pageParam}, links.author.href, searchParams))
            return response.data
        },
        getNextPageParam: (lastPage) => {
            if (lastPage._links && lastPage._links.next) {
                return new URL(lastPage._links.next.href).searchParams.get("page")
            }
            return undefined
        },
        enabled: true
    })
    const removeAuthorQuery = useMutation({
        mutationFn: (author: Author) => {
            queryClient.setQueryData(['authors'], (oldData: InfiniteData<Page<AuthorEmbeddedContainer<Author>>, unknown>) => {
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => {
                        return {
                            ...page,
                            _embedded: {
                                ...page._embedded,
                                authorRepresentationModelList: page._embedded.authorRepresentationModelList.filter((a) => a.id !== author.id)
                            }
                        }
                    })
                }
            })
            return axios.delete(`${apiURL}/v1/authors/${author.id}`)
        },
    })

    const [searchParams, setSearchParams] = useSearchParams();

    const authorName = searchParams.get('name')

    useDebounce(()=>{
        searchParams.get("name")
        refetch()
    }, 1000, [searchParams])


    const observer = useRef<IntersectionObserver>(null);


    const authors = useMemo(() => {
        if (data === undefined) {
            return []
        }
        return data?.pages.reduce((acc, page) => {
            return [...acc, ...page._embedded.authorRepresentationModelList];
        }, [] as Author[]);
    }, [data]);


    const lastElementRef = useCallback(
        (node: HTMLTableRowElement) => {
            if (isLoading) return;

            if (observer.current) observer.current.disconnect();

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetching) {
                    fetchNextPage();
                }
            });

            if (node) observer.current.observe(node);
        },
        [fetchNextPage, hasNextPage, isFetching, isLoading]
    );



    useEffect(() => {
        if (isLoading) {
            return
        }

        if (data) {
            const map: { [key: string]: boolean } = {}
            authors!.forEach((author) => {
                map[author.id] = false
            });
            setSelected(map)
        }

    }, [data, isLoading]);


    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">
            <Loader className="animate-spin"/>
        </div>
    }


    return <div>
        <CreateAuthorDialog/>
        <UpdateAuthorDialog/>
        <div className="w-4/6 mx-auto">
            <div className="flex justify-between">
                <Input placeholder="Name eines Komponisten eingeben" className="mt-5 w-2/6" value={authorName?? undefined} onChange={(e)=>{
                    setSearchParams({name: e.target.value})
                }}/>
                <AlertDialog>
                    <AlertDialogTrigger   className="mt-auto" disabled={!atLeastOneChecked}><Button disabled={!atLeastOneChecked} variant="destructive"><Trash/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('are-you-sure')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('are-you-sure-author-description')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-900" onClick={()=>{
                                Object.keys(selected).forEach(key => {
                                    if (selected[key]) {
                                        removeAuthorQuery.mutate(authors!.find(author => author.id === key) as Author)
                                    }
                                })
                            }}>{t('continue')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="rounded-md border mt-5">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-20"><Checkbox checked={allChecked} onCheckedChange={() => {
                                const newSelected = {...selected}
                                Object.keys(newSelected).forEach(key => {
                                    newSelected[key] = !allChecked
                                })
                                setSelected(newSelected)
                            }}/></TableHead>
                            <TableHead className="w-36">Name</TableHead>
                            <TableHead className="w-36">Extra Information</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {authors!.map((author) => <TableRow ref={lastElementRef} key={author.id} onClick={()=>{
                            useAPIStore.setState({selectedAuthor: author})
                        }}>
                            <TableCell className="font-medium"><Checkbox checked={selected[author.id]}
                                                                         onCheckedChange={() => {
                                                                             setSelected((prevState) => ({
                                                                                 ...prevState,
                                                                                 [author.id]: !prevState[author.id],
                                                                             }))
                                                                         }}/></TableCell>
                            <TableCell>{author.name}</TableCell>
                            <TableCell>{author.extraInformation}</TableCell>
                        </TableRow>)
                        }
                        {
                            isLoading && <Loader2 className="animate-spin"/>
                        }
                    </TableBody>
                </Table>
            </div>

        </div>
    </div>
}
