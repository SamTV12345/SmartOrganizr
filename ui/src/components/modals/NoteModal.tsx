import {setSelectedFolderDescription, setSelectedFolderName, setSelectedFolderPage} from "../../ModalSlice";
import React from "react";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {NoteAuthorSearchBar} from "../searchBars/NoteAuthorSearchBar";
import {useTranslation} from "react-i18next";
import {FormInput} from "../form/FormInput";

export const NoteModal = () => {
    const selectedFolder = useAppSelector(state => state.modalReducer.selectedFolder)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()

    return<div>
        <div className="grid grid-cols-2 gap-5">
            <FormInput id={'name'} label={'Name'} value={selectedFolder?.name as string} onChange={(v) => dispatch(setSelectedFolderName(v))}/>
            <FormInput id={'description'} label={t('description')} value={selectedFolder?.description as string} onChange={(v) => dispatch(setSelectedFolderDescription(v))}/>
            <FormInput id={'parentFolder'} type={'number'} label={t('numberOfPages')} className={`${selectedFolder?.type==='Folder'?'hidden':'visible'}`} value={selectedFolder?.numberOfPages as number} onChange={(v)=>dispatch(setSelectedFolderPage(v))}/>
            <NoteAuthorSearchBar/>
    </div>

    </div>
}