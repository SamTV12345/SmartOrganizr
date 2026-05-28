import { useQuery } from "@tanstack/react-query";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { UnreadSummary } from "@/src/models/ClubMessage";

export const useUnreadSummary = () => {
    return useQuery({
        queryKey: ["unread-summary"],
        queryFn: async () => axios.get<UnreadSummary>(`${apiURL}/v1/notifications/unread-summary`),
    });
};
