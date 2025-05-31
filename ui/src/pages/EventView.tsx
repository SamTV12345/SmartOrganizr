import { useQuery } from "@tanstack/react-query"
import { apiURL } from "../Keycloak"
import axios from "axios"
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {EventModel} from "@/src/models/EventModel";



export const EventView = ()=> {
  const user = useKeycloak()
  const getEvents = async ()=>{
    return await axios.get<EventModel[]>(apiURL+'/v1/events/' + user.subject)
  }

  const {data} = useQuery({
    queryKey: ['events'],
    queryFn: getEvents
  })

  return (
    <div>
      <main className="flex flex-row">
        {
          data?.data.map((d)=>{
            return <div>{d.url}</div>
          })
        }
      </main>
    </div>
  )
}
