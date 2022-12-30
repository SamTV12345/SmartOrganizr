import {ChangeEvent, FC} from "react";

type DropdownProps = {
    value:string | number | readonly string[] | undefined,
    onChange: (e:ChangeEvent<HTMLSelectElement>)=>void,
    children: React.ReactElement|React.ReactElement[]|undefined
}


export const Dropdown:FC<DropdownProps> = ({value,onChange, children})=>{
    return <select value={value} onChange={onChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
        <option value="" selected disabled hidden>Choose here</option>
        {children}
    </select>
}