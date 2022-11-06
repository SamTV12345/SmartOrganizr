import {setElementDescription, setElementName, setElementNumberOfPages} from "../ElementCreateSlice";
import {useAppDispatch, useAppSelector} from "../store/hooks";
import {ParentFolderSearchBar} from "./ParentFolderSearchBar";
import {NoteAuthorCreateSearchBar} from "./NoteAuthorCreateSearchBar";
import {useTranslation} from "react-i18next";

export const CreateNote = ()=>{
    const name = useAppSelector(state=>state.elementReducer.name)
    const description = useAppSelector(state=>state.elementReducer.description)
    const numberOfPages = useAppSelector(state=>state.elementReducer.numberOfPages)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()

    return <div className="grid grid-cols-2 col-span-2 gap-5">
        <div>{t('title')}</div>
        <input value={name} onChange={(v)=>dispatch(setElementName(v.target.value))} className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"/>
        <div>{t("description")}</div>
        <input value={description} onChange={(v)=>dispatch(setElementDescription(v.target.value))} className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"/>
        <div>{t('numberOfPages')}</div>
        <input value={numberOfPages} type={"number"} onChange={(v)=>dispatch(setElementNumberOfPages(v.target.value))} className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600
    placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"/>
        <ParentFolderSearchBar/>
        <NoteAuthorCreateSearchBar/>
    </div>
}