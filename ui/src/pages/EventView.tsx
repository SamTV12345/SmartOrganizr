import { useQuery } from "@tanstack/react-query"
import { apiURL } from "../Keycloak"
import axios from "axios"
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {EventModel} from "@/src/models/EventModel";
import {useTranslation} from "react-i18next";
import {EventCard} from "@/src/components/EventCard";

export const EventView = ()=> {
  const user = useKeycloak()
  const {t} = useTranslation()
  const getEvents = async ()=>{
    return await axios.get<EventModel[]>(apiURL+'/v1/events/' + user.subject, {
      params: {
        since: new Date().toISOString()
      }
    })
  }

  const {data} = useQuery({
    queryKey: ['events'],
    queryFn: getEvents
  })

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold">{t('event-current')}</h2>
      <main className="flex flex-row gap-5 overflow-y-auto pt-5 pb-5">
        {
          data?.data.map((d)=><EventCard event={d} key={d.uid}/>)
        }
      </main>
    </div>
  )
}
