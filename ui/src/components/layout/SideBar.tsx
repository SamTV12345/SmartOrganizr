import {useAppSelector} from "../../store/hooks";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {SideBarItem} from "./SideBarItem";

export const SideBar  = ()=>{
  const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)
  const {t} = useTranslation()


  return <aside className={`w-full h-full float-left ${sideBarCollapsed?'hidden': 'col-span-6 md:col-span-1'} z-10 w-full bg-gray-800 flex  border-none sticky`} aria-label="Sidebar">
  <div className="py-4 px-3 bg-gray-800 h-full w-full">
  <ul className="space-y-2">

    <SideBarItem highlightPath={'/myManagement'} translationkey={t('myManagement')} icon={<i className="fa-solid fa-bars-progress fa-xl"></i>}/>
  </ul>
  </div>
  </aside>
}
