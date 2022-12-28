import {FC} from "react";
import {useTranslation} from "react-i18next";

interface ConertYearProps {
    year: number,
    keyNum: string
}

export const ConcertYear:FC<ConertYearProps> = ({year})=>{
    const {t} = useTranslation()

    return <h1 className="text-4xl w-3/5">{t('year')} {year}</h1>
}