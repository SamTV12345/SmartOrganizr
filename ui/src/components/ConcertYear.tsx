import {FC} from "react";
import {useTranslation} from "react-i18next";

interface ConcertYearProps {
    year: number,
    keyNum: string
}

export const ConcertYear: FC<ConcertYearProps> = ({year, keyNum}) => {
    const {t} = useTranslation()

    return <h1 className="text-4xl w-3/5 flex items-baseline" key={keyNum + "heading"}>{t('year')} {year}</h1>
}
