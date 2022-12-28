import React, {FC} from "react";

type FormTextAreaProps = {
    onBlur?: (value: React.FocusEvent<HTMLTextAreaElement>) => void,
    onChange: (value: string) => void,
    value: string,
}

export const FormTextArea:FC<FormTextAreaProps> = ({onBlur, onChange, value}) => {
    return<textarea  onBlur={onBlur} value={value}
    className={"border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500"}
    onChange={(v)=>onChange(v.target.value)}/>
}