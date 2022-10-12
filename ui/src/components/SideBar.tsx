import {useAppSelector} from "../store/hooks";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {HomeIcon, NoteIcon} from "@primer/octicons-react";

export const SideBar  = ()=>{
  const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)
  const navigate = useNavigate()
  const {t} = useTranslation()

  const highlightIfSelected = (path:string)=>{
    if(window.location.href.includes(path)){
      return 'bg-gray-700'
    }
    return ''
  }

  return <aside className={`w-full h-full float-left ${sideBarCollapsed?'hidden': 'col-span-6 md:col-span-1'} z-10 w-full bg-gray-800 flex  border-none sticky`} aria-label="Sidebar">
  <div className="py-4 px-3 bg-gray-800 h-full w-full">
  <ul className="space-y-2">
  <li>
    <a onClick={()=>navigate("/")
}
  className={`flex items-center p-2 text-base font-normal rounded-lg text-white hover:bg-gray-700 ${highlightIfSelected("/dashboard")}`}>
      <HomeIcon className="w-6 h-6"/>
    <span className="ml-3">{t('homepage')}</span>
  </a>
  </li>
    <li>
      <a onClick={() => navigate('/authors')}
         className={`flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 ${highlightIfSelected("/devices")}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-6 h-6" fill="white">
          <path fillRule="evenodd"
                d="M9.923 5.302a3 3 0 10-3.847 0A2.713 2.713 0 005.9 5.5H2A.75.75 0 002 7h3.3l-.578 5.163-.362 2.997a.75.75 0 101.49.18L6.132 13h3.736l.282 2.34a.75.75 0 101.49-.18l-.362-2.997L10.7 7H14a.75.75 0 000-1.5h-3.899a2.697 2.697 0 00-.178-.198zM9.5 3a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-.3 4.073l.495 4.427h-3.39l.496-4.427a1.207 1.207 0 012.398 0z"></path>
        </svg>

        <span className="flex-1 ml-3 whitespace-nowrap">{t('authors')}</span>
      </a>
    </li>
    <li>
      <a onClick={() => navigate('/folders')}
         className={`flex items-center p-2 text-base font-normal text-white rounded-lg hover:bg-gray-700 ${highlightIfSelected("/folder")}`}>
        <NoteIcon className="w-6 h-6"/>

        <span className="flex-1 ml-3 whitespace-nowrap">{t('folderView')}</span>
      </a>
    </li>
  </ul>
  </div>
  </aside>
}
