import {getNetworkStateAsync} from "expo-network";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ACCESS_TOKEN, LOGIN_URL, PUBLIC_CONFIG_KEY} from "@/api/constants";
import {ConfigModel, Note} from "@/api/types";
import {ConfigModelValidation} from "@/api/validation";

export class  ApiClient {
    private readonly baseUrl: string;
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getPublicConfigUrl(): Promise<ConfigModel>  {
        const networkState = await getNetworkStateAsync()
        if (!networkState.isConnected) {
            const config = await AsyncStorage.getItem(PUBLIC_CONFIG_KEY)
            if (!config) {
                throw new Error("No internet connection and no cached configuration available.");
            }
            const configModel  = JSON.parse(config)
            return configModel!
        } else {
            const data = await fetch(`${this.baseUrl}/public`)
            if (!data.ok) {
                throw new Error('Network response was not ok');
            }
            const configModel: ConfigModel = await data.json()
            ConfigModelValidation.parse(configModel)

            await AsyncStorage.setItem(PUBLIC_CONFIG_KEY, JSON.stringify(configModel))
            return configModel
        }
    }

    async getAllNotes(): Promise<Note> {
        const response = await fetchWithAuth(`${this.baseUrl}/api/v1/elements/notes`)
        if (!response.ok) {
            console.log(await response.text())
            throw new Error('Network response was not ok');
        }
        return response.json()
    }

}

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN);
    const headers = {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
    };

    return fetch(input, {
        ...init,
        headers,
    });
}




export let apiClient: ApiClient| undefined = undefined;

export const initApiClient = async () => {
    const url = await AsyncStorage.getItem(LOGIN_URL)
    if (!url) {
        throw new Error("No URL found in storage");
    }
    apiClient = new ApiClient(url);
}

export const setApiClient = (url: string) => {
    apiClient = new ApiClient(url)
}
