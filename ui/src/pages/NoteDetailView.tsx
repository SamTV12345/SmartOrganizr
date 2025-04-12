import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import {useParams} from "react-router-dom";
import {Loader} from "lucide-react";
import {apiURL} from "@/src/Keycloak";

export const NoteDetailView  =()=>{
    const params = useParams()

    const {id} = params

    const {data, isLoading} = useQuery({
        queryKey: ['note', id],
        queryFn: async () => {
            const response = await axios.get(`${apiURL}/v1/elements/notes/${id}`)
            return response.data
        },
        enabled: !!id
    })


    return <>
        {isLoading ? <Loader/>:
            <div>
                <h1>{data?.title}</h1>
                <p>{data?.description}</p>
                <p>{data?.author}</p>
                <p>{data?.creationDate}</p>
                <p>{data?.numberOfPages}</p>
            </div>
        }
    </>
}