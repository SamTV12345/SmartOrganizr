import { Tabs } from 'expo-router';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {QueryClientProvider, QueryClient} from "@tanstack/react-query";
import {ApiClient, apiClient, setApiClient} from "@/api/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {LOGIN_URL} from "@/api/constants";

const queryclient = new QueryClient();


export default function RedirectLayout() {


    return (
        <QueryClientProvider client={queryclient}><Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Noten',
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
                }}
            />
        </Tabs>
        </QueryClientProvider>
    );
}
