import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FC} from "react";

type SideBarItemProps = {
    highlightPath:string,
    translationkey: string,
    icon:React.ReactElement
}

export const SideBarItem:FC<SideBarItemProps>  =({highlightPath,translationkey,icon})=>{
    const navigate = useNavigate()
    const {t} = useTranslation()

    const highlightIfSelected = (path:string)=>{
        if(window.location.href.includes(path)){
            return 'bg-gray-700'
        }
        return ''
    }
    return   <li>
        <a onClick={()=>navigate(highlightPath)
        }
           className={`flex items-center p-2 text-base font-normal rounded-lg text-white hover:bg-gray-700 h-20 ${highlightIfSelected("/dashboard")}`}>
            {icon}
            <span className="ml-3">{translationkey}</span>
        </a>
    </li>
}