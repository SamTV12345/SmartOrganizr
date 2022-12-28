import {FC, ReactNode} from "react";

type AccordeonType = {
    children: ReactNode,
    keyNum: string
}

export const Accordeon:FC<AccordeonType> = ({children, keyNum})=>{
   return <div id="accordion-collapsed" className="mt-4 w-full bg-gray-600 bg-white dark:bg-gray-900 text-white p-2" data-accordion="collapse" key={keyNum}>
       {children}
   </div>
}