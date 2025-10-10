import {View, Text, FlatList} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {apiClient, initApiClient} from "@/api/ApiClient";
import {Note, NoteResponse} from "@/api/types";

export default function Home () {

    const { data, error, isLoading } = useQuery({
        queryKey: ['notes'],
        queryFn: async () => {
            if (!apiClient) {
                await initApiClient()
            }
            return apiClient!.getAllNotes();
        }
    })

    return <View>
        <FlatList<Note> data={data?._embedded.noteRepresentationModelList ?? []} renderItem={(note)=>{
            return  <View
                key={note.item.id}
                style={{
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 14,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 3,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#222" }}>
                    {note.item.name}
                </Text>
            </View>
        }}/>
        </View>
}
