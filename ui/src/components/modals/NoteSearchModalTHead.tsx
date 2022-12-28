import {FC} from "react";
import {useTranslation} from "react-i18next";

type NoteSearchModalTHeadProps =  {
    translationkey: string
}

export const NoteSearchModalTHead:FC<NoteSearchModalTHeadProps> = ({translationkey})=>{
    const {t} = useTranslation()

    return <th className="py-3 px-6 text-xs font-medium tracking-wider text-left uppercase text-gray-400 md:rounded-tl-2xl">
    <div className="flex items-center justify-center">
        {t(translationkey)}
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
    viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
    d="M8 9l4-4 4 4m0 6l-4 4-4-4"/>
        </svg>
        </div>
        </th>
}