import {useTranslation} from "react-i18next";
import {ElementSearchBar} from "../components/searchBars/ElementSearchBar";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {fixProtocol} from "../utils/Utilities";
import {Page} from "../models/Page";
import {ElementEmbeddedContainer} from "../models/ElementEmbeddedContainer";
import {NoteItem} from "../models/NoteItem";
import axios from "axios";
import {setNotesSearched} from "../store/CommonSlice";
import {Waypoint} from "react-waypoint";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ExternalLink, Music2} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";

export const SearchElementView = ()=>{
    const {t} = useTranslation()
    const searchedElements = useAppSelector(state=>state.commonReducer.elementsSearched)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    const loadNotes = async (link:string)=>{
        if(searchedElements==null){
            return
        }
        const notesInPage: Page<ElementEmbeddedContainer<NoteItem>> = await new Promise<Page<ElementEmbeddedContainer<NoteItem>>>(resolve=>{
            axios.get(link)
                .then(resp=>resolve(resp.data))
                .catch((error)=>{
                    console.log(error)
                })})
        if(notesInPage !== undefined){
            dispatch(setNotesSearched({
                _embedded: {
                    noteRepresentationModelList:[...searchedElements._embedded.noteRepresentationModelList,...notesInPage._embedded.noteRepresentationModelList]
                },
                page: notesInPage.page,
                _links: notesInPage._links
            } as Page<ElementEmbeddedContainer<NoteItem>>))
        }
    }

    const notes = searchedElements?._embedded?.noteRepresentationModelList ?? []

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-6">
                <h1 className="text-3xl font-semibold tracking-tight">{t("search")}</h1>
                <p className="text-muted-foreground mt-2 text-sm">Suche in deinen Noten, Autor*innen und Ordnern.</p>
            </section>

            <Card>
                <CardHeader className="space-y-3">
                    <CardTitle className="flex items-center gap-2">
                        <Music2 className="size-5 text-primary"/>
                        Notensuche
                    </CardTitle>
                    <CardDescription>Filtere sofort nach Titel. Weitere Ergebnisse werden automatisch nachgeladen.</CardDescription>
                    <ElementSearchBar/>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("title")}</TableHead>
                                <TableHead>{t("author")}</TableHead>
                                <TableHead>{t("description")}</TableHead>
                                <TableHead>{t("superFolder")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                        Keine Ergebnisse.
                                    </TableCell>
                                </TableRow>
                            )}
                            {notes.map((element, index)=>
                                <TableRow key={element.id} className="cursor-pointer" onClick={() => navigate(`/noteManagement/notes/${element.id}`)}>
                                    <TableCell className="max-w-[260px] truncate">
                                        <Button
                                            variant="ghost"
                                            className="h-auto w-full justify-start px-0 font-medium"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                navigate(`/noteManagement/notes/${element.id}`)
                                            }}
                                        >
                                            {element.name}
                                            <ExternalLink className="ml-2 size-3.5"/>
                                        </Button>
                                    </TableCell>
                                    <TableCell className="max-w-[220px] truncate">{element.author?.name}</TableCell>
                                    <TableCell className="max-w-[340px] truncate">{element.description}</TableCell>
                                    <TableCell className="max-w-[240px] truncate">
                                        {element.parent?.name}
                                        {searchedElements?.page && searchedElements.page.size-index<5 &&
                                            searchedElements._links?.next?.href &&
                                            <Waypoint onEnter={()=>{
                                                loadNotes(fixProtocol(searchedElements._links.next.href))
                                            }}/>}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}
