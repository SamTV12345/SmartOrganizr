import React, {FC, FocusEvent} from "react";

type FormInputProps = {
    id: string,
    label: string,
    value: string|number,
    onChange: (value: string) => void,
    className?: string,
    type?: React.HTMLInputTypeAttribute,
    onBlur?: (value: FocusEvent<HTMLInputElement>) => void,
}


export const FormInput:FC<FormInputProps> =({id,label,value,onChange, className, type, onBlur})=>{
    return <>
        <label className="p-2.5">{label}</label>
     <input value={value} name={id} type={type} onBlur={onBlur}
           className={"border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" + className}
            onChange={(v)=>onChange(v.target.value)}/>
        </>
}