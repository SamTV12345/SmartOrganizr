import { useQuery } from "@tanstack/react-query"
import { apiURL } from "../Keycloak"
import axios from "axios"
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {EventModel} from "@/src/models/EventModel";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

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
    <div className="p-5">
      <main className="flex flex-row gap-5">
        {
          data?.data.map((d)=>{
            return             <Card className="w-fit">
              <CardHeader className="w-96">
                <CardTitle>{d.summary}</CardTitle>
                <CardDescription>{d?.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2">
                  <label>Ort</label>
                  <span>{d.location}</span>
                  <label>Zeit</label>
                  <span>{d.startDate? `${new Date(d.startDate).toLocaleString()}`: ''}</span>
                </div>
              </CardContent>
            </Card>
          })
        }
      </main>
    </div>
  )
}
