import {View, Text, FlatList, StyleSheet, TextInput} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {apiClient, initApiClient} from "@/api/ApiClient";
import {Note, NoteResponse} from "@/api/types";

export default function Home () {
    const [noteName, setNoteName] = useState("")

    const { data, error, isLoading } = useQuery({
        queryKey: ['notes', noteName],
        queryFn: async () => {
            if (!apiClient) {
                await initApiClient()
            }
            return apiClient!.getAllNotes(noteName);
        }
    })

    return <View>
        <TextInput
            style={styles.input} onChangeText={setNoteName}/>
        <FlatList<Note> data={data?._embedded.noteRepresentationModelList ?? []} renderItem={(note)=>{
            return  <View>
                <Text style={{textAlign: 'center'}}>{note.item.name}</Text>
            </View>
        }}/>
        </View>
}


const styles = StyleSheet.create({
    input: {
        width: "100%",
        maxWidth: 350,
        height: 48,
        borderColor: "#9a8c98",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        fontSize: 16,
        marginBottom: 20,
    },
})
