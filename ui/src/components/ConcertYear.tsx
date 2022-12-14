import {FC} from "react";

interface ConertYearProps {
    year: number,
    keyNum: string
}

export const ConcertYear:FC<ConertYearProps> = ({year})=>{

    return <h1 className="text-4xl w-3/5">Year {year}</h1>
}