import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FC} from "react";
import * as path from "path";

type SideBarItemProps = {
    highlightPath:string,
    translationkey: string,
    icon:React.ReactElement
}

export const SideBarItem:FC<SideBarItemProps>  =({highlightPath,translationkey,icon})=>{
    const navigate = useNavigate()

    const highlightIfSelected = (path:string)=>{
        if(window.location.href.includes(path)){
            return 'bg-gray-700 border-black!'
        }
        return ''
    }
    return   <li className="w-full">
        <a  onClick={()=>navigate(highlightPath)
        }
           className={`flex items-center justify-between  w-full text-base font-normal text-md text-white  border-transparent border-l-6 hover:bg-gray-700 pt-2 pb-2   ${highlightIfSelected(highlightPath)}`}>
            <span className="ml-3 text-[14px]">{translationkey}</span>
            <span className="mr-5">{icon}</span>
        </a>
    </li>
}
