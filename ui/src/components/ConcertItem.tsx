import {FC, DragEvent, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useQueryClient} from "@tanstack/react-query";
import {$api} from "@/src/api/client";
import {Button} from "@/components/ui/button";
import {ConcertDto} from "../models/ConcertDto";
import {Accordeon} from "./layout/Accordeon";
import {AccordeonItem} from "./layout/AccordeonItem";
import {FormInput} from "./form/FormInput";
import {FormTextArea} from "./form/FormTextArea";
import {TrashIcon} from "./icons/TrashIcon";

type ProgramNote = {
    id: string,
    name: string,
}

interface ConcertItemProps {
    concert: ConcertDto,
    keyNum: string
}

// NotePicker is the "add note to concert" control: a search input backed by
// the local half of the works autocomplete endpoint.
const NotePicker: FC<{ existingIds: string[], onPick: (note: ProgramNote) => void }> = ({existingIds, onPick}) => {
    const {t} = useTranslation()
    const [term, setTerm] = useState("")
    const {data} = $api.useQuery("get", "/v1/autocomplete/works", {
        params: {query: {q: term}},
    }, {enabled: term.length >= 2})
    const results = (data?.local ?? []).filter(w => w.id && !existingIds.includes(w.id))

    return <div className="mb-4">
        <FormInput id="noteSearch" label={t('addNoteToConcert')} value={term} onChange={setTerm}/>
        {term.length >= 2 && <ul className="mt-2 flex flex-col items-start gap-1">
            {results.map(w => <li key={w.id}>
                <Button variant="outline" size="sm" onClick={() => {
                    onPick({id: w.id!, name: w.name ?? ""})
                    setTerm("")
                }}>{w.name}</Button>
            </li>)}
            {results.length === 0 && <li className="text-sm text-gray-400">{t('noNotesFound')}</li>}
        </ul>}
    </div>
}

export const ConcertItem: FC<ConcertItemProps> = ({concert, keyNum}) => {
    const {t} = useTranslation()
    const queryClient = useQueryClient()

    const [title, setTitle] = useState(concert.title)
    const [description, setDescription] = useState(concert.description)
    const [location, setLocation] = useState(concert.location)
    const [hints, setHints] = useState(concert.hints)
    const [dueDate, setDueDate] = useState(new Date(concert.dueDate).toISOString().split('T')[0])
    const [notes, setNotes] = useState<ProgramNote[]>([])
    const [draggedId, setDraggedId] = useState<string | null>(null)

    // The list endpoint stays lean, so the note program comes from the detail endpoint.
    const {data: detail} = $api.useQuery("get", "/v1/concerts/{concertId}", {
        params: {path: {concertId: concert.id}},
    })
    useEffect(() => {
        if (detail) {
            setNotes((detail.noteInConcerts ?? []).map(n => ({id: n.noteInConcert.id, name: n.noteInConcert.name})))
        }
    }, [detail])

    const invalidateConcerts = () => {
        queryClient.invalidateQueries({queryKey: ["get", "/v1/concerts"]})
        queryClient.invalidateQueries({queryKey: ["get", "/v1/concerts/{concertId}"]})
    }

    const update = $api.useMutation("put", "/v1/concerts/{concertId}", {onSuccess: invalidateConcerts})
    const remove = $api.useMutation("delete", "/v1/concerts/{concertId}", {onSuccess: invalidateConcerts})

    // The update endpoint has replace semantics: it always carries all fields
    // plus the complete ordered note id list.
    const saveConcert = (noteIds: string[]) => {
        update.mutate({
            params: {path: {concertId: concert.id}},
            body: {
                title,
                description,
                location,
                hints,
                dueDate: new Date(dueDate).toISOString(),
                noteIds,
            },
        })
    }

    const noteIds = notes.map(n => n.id)

    const onNoteDrop = (e: DragEvent<HTMLDivElement>, target: ProgramNote) => {
        e.preventDefault()
        if (!draggedId || draggedId === target.id) {
            return
        }
        const reordered = notes.filter(n => n.id !== draggedId)
        const dragged = notes.find(n => n.id === draggedId)!
        reordered.splice(reordered.findIndex(n => n.id === target.id), 0, dragged)
        setNotes(reordered)
        setDraggedId(null)
    }

    return <Accordeon keyNum={keyNum}>
        <div className="flex items-center gap-2 pb-2">
            <div className="grow">
                <FormInput className="text-xl" id="title" label={t('concert')} value={title}
                           onChange={setTitle}
                           onBlur={() => saveConcert(noteIds)}/>
            </div>
            <span title={t('deleteConcert')}>
                <TrashIcon onClick={() => remove.mutate({params: {path: {concertId: concert.id}}})}/>
            </span>
        </div>
        <AccordeonItem title={t('containedNotes')} first>
            <NotePicker existingIds={noteIds} onPick={(note) => {
                const nextNotes = [...notes, note]
                setNotes(nextNotes)
                saveConcert(nextNotes.map(n => n.id))
            }}/>
            <div className="grid grid-cols-1 gap-4">
                {notes.length === 0 && <div className="text-sm text-gray-400">{t('noNotesInConcert')}</div>}
                {notes.map(note => <div key={note.id} className="flex items-center gap-2" draggable
                                        onDragStart={(e) => {
                                            setDraggedId(note.id)
                                            e.dataTransfer.effectAllowed = "move"
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault()
                                            e.dataTransfer.dropEffect = "move"
                                        }}
                                        onDrop={(e) => onNoteDrop(e, note)}>
                    {note.name}
                    <TrashIcon onClick={() => {
                        const nextNotes = notes.filter(n => n.id !== note.id)
                        setNotes(nextNotes)
                        saveConcert(nextNotes.map(n => n.id))
                    }}/>
                </div>)}
            </div>
            <div className="flex flex-row-reverse mt-4">
                <Button disabled={update.isPending} onClick={() => saveConcert(noteIds)}>{t('save')}</Button>
            </div>
        </AccordeonItem>

        <AccordeonItem title={t('hints')}>
            <div className="grid grid-cols-2 gap-4">
                <FormInput id="date" type="date" label={t('appearanceDate')} value={dueDate} onChange={setDueDate}/>
                <FormInput id="location" label={t('location')} value={location} onChange={setLocation}/>
                <FormInput id="description" label={t('description')} value={description} onChange={setDescription}/>
                <div className="flex flex-row-reverse col-span-2">
                    <Button disabled={update.isPending} onClick={() => saveConcert(noteIds)}>{t('save')}</Button>
                </div>
            </div>
        </AccordeonItem>

        <AccordeonItem title={t('furtherHints')}>
            <FormTextArea value={hints} onChange={setHints}/>
            <div className="flex flex-row-reverse mt-4">
                <Button disabled={update.isPending} onClick={() => saveConcert(noteIds)}>{t('save')}</Button>
            </div>
        </AccordeonItem>
    </Accordeon>
}
