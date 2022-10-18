import {setCreatedAuthorExtraInformation, setCreatedAuthorName} from "../ModalSlice";
import React from "react";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {useTranslation} from "react-i18next";

export const AuthorAddModal = ()=>{
    const createdAuthor = useAppSelector(state=>state.modalReducer.createdAuthor)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()


    return <div className="grid grid-cols-2 gap-5">
        <div>{t('name')}</div>
        <input value={createdAuthor.name}
    className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" onChange={(v)=>dispatch(setCreatedAuthorName(v.target.value))}/>
    <div>{t('extraInformation')}</div>
    <input value={createdAuthor.extraInformation}
    className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
           onChange={(v)=>dispatch(setCreatedAuthorExtraInformation(v.target.value))}/>
    </div>
}