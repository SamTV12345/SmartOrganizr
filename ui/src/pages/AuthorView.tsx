import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {Author} from "../models/Author";
import {useTranslation} from "react-i18next";
import {CreateAuthorDialog} from "@/src/components/CreateAuthorDialog";
import {InfiniteData, useQueryClient} from "@tanstack/react-query";
import {$api} from "@/src/api/client";
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


export const AuthorView = ()=> {
    const {t} = useTranslation()
    const [selected, setSelected] = React.useState<{ [key: string]: boolean }>({})
    const queryClient = useQueryClient()
    const allChecked = Object.keys(selected).map(key => selected[key]).every(value => value)
    const atLeastOneChecked = Object.keys(selected).map(key => selected[key]).some(value => value)

    const [searchParams, setSearchParams] = useSearchParams();
    const authorName = searchParams.get('name')

    const {data,  isLoading, fetchNextPage, isFetching, hasNextPage, refetch } = $api.useInfiniteQuery(
        "get",
        "/v1/authors",
        { params: { query: { page: 0, ...(authorName ? { name: authorName } : {}) } } },
        {
            initialPageParam: 0,
            pageParamName: "page",
            getNextPageParam: (lastPage) => {
                const p = lastPage.page
                if (!p || p.number === undefined || p.size === undefined || p.totalElements === undefined) return undefined
                const next = p.number + 1
                return next * p.size >= p.totalElements ? undefined : next
            },
        }
    )

    type AuthorsQueryKey = ["get", "/v1/authors", { params: { query: { page: number; name?: string } } }]
    type AuthorsPage = NonNullable<typeof data>["pages"][number]

    const removeAuthorQuery = $api.useMutation("delete", "/v1/authors/{authorId}", {
        onMutate: ({ params: { path: { authorId } } }) => {
            const key: AuthorsQueryKey = [
                "get",
                "/v1/authors",
                { params: { query: { page: 0, ...(authorName ? { name: authorName } : {}) } } },
            ]
            queryClient.setQueryData<InfiniteData<AuthorsPage>>(key, (oldData) => {
                if (!oldData) return oldData
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        _embedded: {
                            ...page._embedded,
                            authorRepresentationModelList: page._embedded?.authorRepresentationModelList?.filter((a) => a.id !== authorId) ?? [],
                        },
                    })),
                }
            })
        },
    })

    useDebounce(()=>{
        searchParams.get("name")
        refetch()
    }, 1000, [searchParams])


    const observer = useRef<IntersectionObserver>(null);


    const authors = useMemo(() => {
        if (data === undefined) {
            return []
        }
        return data?.pages.reduce<Author[]>((acc, page) => {
            return [...acc, ...(page._embedded?.authorRepresentationModelList ?? []) as Author[]];
        }, []);
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
                                        removeAuthorQuery.mutate({ params: { path: { authorId: key } } })
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
                        {authors!.map((author) => <TableRow ref={lastElementRef} key={author.id} onClick={(e)=>{
                            if ("role" in e.target) {
                                if (e.target.role === "checkbox") {
                                    return
                                }
                            }
                                useAPIStore.setState({selectedAuthor: author})
                        }}>
                            <TableCell className="font-medium"><Checkbox checked={selected[author.id]}
                                                                         onCheckedChange={(e) => {
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
