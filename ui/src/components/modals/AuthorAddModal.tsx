import {setCreatedAuthorExtraInformation, setCreatedAuthorName} from "../../ModalSlice";
import React from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {useTranslation} from "react-i18next";
import {FormInput} from "../form/FormInput";

export const AuthorAddModal = ()=>{
    const createdAuthor = useAppSelector(state=>state.modalReducer.createdAuthor)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()


    return <div className="grid grid-cols-2 gap-5">
        <FormInput id={'name'} label={t('name')} onChange={v=>dispatch(setCreatedAuthorName(v))} value={createdAuthor.name}/>

        <FormInput id={'extraInformation'} label={t('extraInformation')} onChange={(v)=>dispatch(setCreatedAuthorExtraInformation(v))} value={createdAuthor.extraInformation}/>
    </div>
}