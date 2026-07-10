import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useQueryClient} from "@tanstack/react-query";
import {$api} from "@/src/api/client";
import {AddModal} from "./AddModal";
import {FormInput} from "../form/FormInput";
import {useAppDispatch} from "../../store/hooks";
import {setOpenAddModal} from "../../ModalSlice";

export const AddConcertModal = () => {
    const {t} = useTranslation()
    const dispatch = useAppDispatch()
    const queryClient = useQueryClient()
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [location, setLocation] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [hints, setHints] = useState("")

    const create = $api.useMutation("post", "/v1/concerts", {
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["get", "/v1/concerts"]})
            setTitle("")
            setDescription("")
            setLocation("")
            setDueDate("")
            setHints("")
            dispatch(setOpenAddModal(false))
        },
    })

    const createConcert = () => {
        if (title.trim() === "" || dueDate === "" || create.isPending) {
            return
        }
        create.mutate({
            body: {
                title,
                description,
                location,
                hints,
                dueDate: new Date(dueDate).toISOString(),
                noteIds: [],
            },
        })
    }

    return <AddModal headerText={t('addConcert')} onAccept={createConcert} acceptText={t('create')}>
        <div className="grid grid-cols-2 gap-4">
            <FormInput id="title" label={t('title')} value={title} onChange={setTitle}/>
            <FormInput id="description" label={t('description')} value={description} onChange={setDescription}/>
            <FormInput id="location" label={t('location')} value={location} onChange={setLocation}/>
            <FormInput id="dueDate" label={t('appearanceDate')} type="date" value={dueDate} onChange={setDueDate}/>
            <FormInput id="extraInfo" label={t('hints')} value={hints} onChange={setHints}/>
        </div>
    </AddModal>
}
