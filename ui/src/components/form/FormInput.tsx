import React, {FC, FocusEvent} from "react";

type FormInputProps = {
    id: string,
    label: string,
    value?: string|number,
    onChange: (value: string) => void,
    className?: string,
    type?: React.HTMLInputTypeAttribute,
    onBlur?: (value: FocusEvent<HTMLInputElement>) => void,
    onFocus?: (value: FocusEvent<HTMLInputElement>) => void,
}


export const FormInput:FC<FormInputProps> =({id,label,value,onChange, className, type, onBlur, onFocus})=>{
    return <>
        <label className="p-2.5">{label}</label>
     <input value={value} name={id} type={type} onBlur={onBlur} onFocus={onFocus}
           className={"border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 " + (className ?? "")}
            onChange={(v)=>onChange(v.target.value)}/>
        </>
}
