import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setElementDescription, setElementName} from "../ElementCreateSlice";
import {ParentFolderSearchBar} from "./searchBars/ParentFolderSearchBar";
import {useTranslation} from "react-i18next";
import {FormInput} from "./form/FormInput";

export const CreateFolder = ()=>{
    const name = useAppSelector(state => state.elementReducer.name)
    const description = useAppSelector(state=>state.elementReducer.description)
    const dispatch = useAppDispatch()
    const {t} = useTranslation()

    return <div className="col-span-2  grid grid-cols-2 gap-5">
        <div className="border-b border-gray-60 w-full col-span-2"/>
            <h2 className="text-2xl col-span-2">{t('createFolder')}</h2>
        <FormInput id={'name'} label={t('name')} value={name} onChange={(v)=>dispatch(setElementName(v))}/>
        <FormInput id={'description'} label={t('description')} value={description} onChange={(v)=>dispatch(setElementDescription(v))}/>
            <ParentFolderSearchBar/>
    </div>
}