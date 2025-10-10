import {View, Text, FlatList} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {apiClient, initApiClient} from "@/api/ApiClient";

export default function Home () {

    const { data, error, isLoading } = useQuery({
        queryKey: ['notes'],
        queryFn: async () => {
            if (!apiClient) {
                await initApiClient()
            }
            return apiClient.getAllNotes();
        }
    })

    console.log(data, error)

    return <View>
        </View>
}
