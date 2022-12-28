import {concertActions} from "../../store/slices/ConcertSlice";
import {setModalOpen} from "../../ModalSlice";
import {AddNoteToConcert} from "../modals/AddNoteToConcert";
import React, {FC, ReactNode, useState} from "react";

type AccordeonType = {
    headerChildren?: ReactNode
    children: ReactNode,
    title: string,
    first?:boolean
}


export const AccordeonItem:FC<AccordeonType> = ({children, headerChildren, title, first})=> {
    const [accordeonOpen, setAccordeonOpen] = useState(false)
    return <>
        <h3 id="accordion-collapse-heading-1" onClick={() => setAccordeonOpen(!accordeonOpen)}>
        <button type="button"
                className={`flex items-center justify-between w-full p-5 font-medium text-left text-gray-500 border-none dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ${first?"rounded-t-xl":''}`}
                data-accordion-target="#accordion-collapse-body-1" aria-expanded="true"
                aria-controls="accordion-collapse-body-1">
            <span>{title}</span>
            {headerChildren}
            <svg data-accordion-icon className={`w-6 h-6 shrink-0 ${accordeonOpen ? 'rotate-180' : ''}`}
                 fill="currentColor" viewBox="0 0 20 20"
                 xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"></path>
            </svg>
        </button>
    </h3>
    <div id="accordion-collapse-body-1" className={accordeonOpen ? 'visible' : 'hidden'}
         aria-labelledby="accordion-collapse-heading-1">
        <div className="p-5 font-light">
            {children}
        </div>
    </div>
        </>
}