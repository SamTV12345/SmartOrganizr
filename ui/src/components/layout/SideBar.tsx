import {useAppSelector} from "../../store/hooks";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {SideBarItem} from "./SideBarItem";
import {SidebarHeading} from "@/src/components/layout/SidebarHeading";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import {EventModel} from "@/src/models/EventModel";
import {apiURL} from "@/src/Keycloak";
import {Club} from "@/src/models/Club";



export const SideBar  = ()=>{
  const user = useKeycloak()
  const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)
  const {t} = useTranslation()

  const getClubs = async ()=>{
    return await axios.get<Club[]>(apiURL+'/v1/clubs/' + user.subject)
  }

  const {data} = useQuery({
    queryKey: ['clubs'],
    queryFn: getClubs
  })


  return <aside className={`w-full h-full float-left ${sideBarCollapsed?'hidden': 'col-span-6 md:col-span-1'} z-10 w-full bg-gray-800 flex  border-none sticky`} aria-label="Sidebar">
  <div className="bg-gray-800 h-full w-full">
  <ul className="">
    <SidebarHeading>{t('my-smartorganizr')}</SidebarHeading>
    <SideBarItem highlightPath={'/dashboard'} translationkey={t('dashboard')} icon={<i className="fa-solid fa-table-columns fa-xl"></i>}/>
    <SideBarItem highlightPath={'/myDates'} translationkey={t('my-dates')} icon={<i className="fa-solid fa-calendar fa-xl"></i>}/>
    <SideBarItem highlightPath={'/myMessages'} translationkey={t('my-messages')} icon={<i className="fa-solid fa-message fa-xl"></i>}/>
    <SideBarItem highlightPath={'/myPolls'} translationkey={t('my-polls')} icon={<i className="fa-solid fa-square-poll-horizontal fa-xl"></i>}/>
    <SideBarItem highlightPath={'/clubOverview'} translationkey={t('club-overview')} icon={<i className="fa-solid fa-drum fa-xl"></i>}/>
    <SideBarItem highlightPath={'/myRooms'} translationkey={t('my-rooms')} icon={<i className="fa-solid fa-door-open fa-xl"></i>}/>
    <SidebarHeading>{t('create-new')}</SidebarHeading>
    <SideBarItem highlightPath="/createClub" translationkey={t('create-club')} icon={<i className="fa-solid fa-drum fa-xl"></i>}></SideBarItem>
    <SidebarHeading>{t('my-clubs')}</SidebarHeading>
    {
      data?.data.map((d)=><SideBarItem highlightPath={"/clubs"+ "/"+d.id} translationkey={d.name} icon={<i className="fa-solid fa-drum fa-xl"></i>}/>)
    }

    <SidebarHeading>{t('my-profile')}</SidebarHeading>
    <SideBarItem highlightPath={'/noteManagement'} translationkey={t('noteManagement')} icon={<i className="fa-solid fa-bars-progress fa-xl"></i>}/>
  </ul>
  </div>
  </aside>
}
