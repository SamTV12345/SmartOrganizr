import {FC} from "react";

type TableDataProps = {
    content:any
    classname?:string
}

export const TableData:FC<TableDataProps> = ({content})=>{
    return  <td className="py-4 px-6 text-sm font-medium break-words text-white border-inherit text-center">{content}</td>
}