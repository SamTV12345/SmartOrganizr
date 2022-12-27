import {setSelectedFolderDescription, setSelectedFolderName, setSelectedFolderPage} from "../../ModalSlice";
import React from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {NoteAuthorSearchBar} from "../searchBars/NoteAuthorSearchBar";
import {useTranslation} from "react-i18next";

export const NoteModal = () => {
    const selectedFolder = useAppSelector(state => state.modalReducer.selectedFolder)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()

    return<div>
        <div className="grid grid-cols-2 gap-5">
        <div>{t('name')}</div>
        <input value={selectedFolder?.name}
               className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
               onChange={(v) => dispatch(setSelectedFolderName(v.target.value))}/>
        <div>{t('description')}</div>
        <input value={selectedFolder?.description}
               className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"
               onChange={(v) => dispatch(setSelectedFolderDescription(v.target.value))}/>
        <div className={`${selectedFolder?.type==='Folder'?'hidden':'visible'}`}>{t('numberOfPages')}</div>
        <input type={"number"} className={`${selectedFolder?.type==='Folder'?'hidden':'visible'}`+" border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 " +
            " placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"} value={selectedFolder?.numberOfPages}
               onChange={(v)=>dispatch(setSelectedFolderPage(v.target.value))}/>
    </div>
<NoteAuthorSearchBar/>
    </div>
}