import {useAppSelector} from "../store/hooks";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

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
  className={`flex items-center p-2 text-base font-normal rounded-lg text-white hover:bg-gray-700 h-20 ${highlightIfSelected("/dashboard")}`}>
      <i className="fa-solid fa-house fa-xl"></i>
      <span className="ml-3">{t('homepage')}</span>
  </a>
  </li>
    <li>
      <a onClick={() => navigate('/authors')}
         className={`flex items-center p-2 text-base font-normal rounded-lg text-white hover:bg-gray-700 h-20 ${highlightIfSelected("/devices")}`}>

        <i className="fa-solid fa-user-tie fa-xl"></i>

        <span className="flex-1 ml-3 whitespace-nowrap">{t('authors')}</span>
      </a>
    </li>
    <li>
      <a onClick={() => navigate('/folder')}
         className={`flex items-center p-2 text-base font-normal text-white rounded-lg hover:bg-gray-700  h-20 ${highlightIfSelected("/folder")}`}>
        <i className="fa-solid fa-folder fa-xl"></i>
        <span className="flex-1 ml-3 whitespace-nowrap">{t('folderView')}</span>
      </a>
    </li>
    <li>
      <a onClick={() => navigate('/notes')}
         className={`flex items-center p-2 text-base font-normal text-white rounded-lg hover:bg-gray-700  h-20 ${highlightIfSelected("/notes")}`}>
        <i className="fa-solid fa-note-sticky fa-xl"></i>
        <span className="flex-1 ml-3 whitespace-nowrap">{t('notesView')}</span>
      </a>
    </li>

    <li>
      <a onClick={() => navigate('/concerts')}
         className={`flex items-center p-2 text-base font-normal text-white rounded-lg hover:bg-gray-700  h-20 ${highlightIfSelected("/concerts")}`}>
        <i className="fa-solid fa-ticket fa-xl"></i>
        <span className="flex-1 ml-3 whitespace-nowrap">{t('concertView')}</span>
      </a>
    </li>
  </ul>
  </div>
  </aside>
}
