import {FC} from "react";

interface NoteSearchModalTDProps {
        children: React.ReactElement|string|React.ReactElement[]| undefined
}

export const NoteSearchModalTD:FC<NoteSearchModalTDProps> = ({children}) => {
    return <td className="py-4 px-6 text-sm font-medium text-white border-inherit text-center break-word">{children}</td>

}
