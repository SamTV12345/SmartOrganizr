import {maybeCompleteAuthSession} from 'expo-web-browser'


maybeCompleteAuthSession();

import {View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from "react-native";
import React, { useState, useEffect} from "react";
import {DiscoveryDocument, makeRedirectUri, useAuthRequest} from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {apiClient, setApiClient} from "@/api/ApiClient";
import {ACCESS_TOKEN, LOGIN_URL} from "@/api/constants";
import {jwtDecode} from "jwt-decode";
import {useRouter} from "expo-router";


export default function Index() {
    const [url, setUrl] = useState("");
    const [discoveryConfig, setDiscoveryConfig] = useState<DiscoveryDocument>({});
    const router = useRouter();

    const [request,response, promptAsync] = useAuthRequest(
        {
            clientId: 'smartorganizr-frontend',
            scopes: ['openid', 'email', 'profile', 'offline_access'],
            redirectUri: makeRedirectUri({ scheme: 'smartorganizr.mobile', path: '/' }),
        },
        discoveryConfig
    );

    useEffect(()=>{
        AsyncStorage.getItem(LOGIN_URL)
            .then((loginUrl)=>{
                if (loginUrl) {
                    setUrl(loginUrl)
                }
            })
        AsyncStorage.getItem(ACCESS_TOKEN)
            .then(accessToken=>{
                if (accessToken) {
                    try {
                        const decoded: { exp: number } = jwtDecode(accessToken);
                        const now = Math.floor(Date.now() / 1000);
                        if (decoded.exp > now) {
                            router.navigate('/redirect')
                        }
                    } catch(e) {
                        console.error("ERROR", e)
                    }
                }
            })

    }, [])

    useEffect(() => {
        if (response?.type === 'success') {
            const { code } = response.params;
            fetch(discoveryConfig.tokenEndpoint!, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: request?.redirectUri,
                    code_verifier: request.codeVerifier!,
                    client_id: "smartorganizr-frontend",
                }).toString(),
            }).then(async resp=>{
                if (!resp.ok) {
                    Alert.alert("Fehler", "Die Authentifizierung ist fehlgeschlagen. Bitte überprüfe die eingegebene URL und versuche es erneut.");
                }
                const tokenDate = await resp.json()
                if (!tokenDate.access_token) {
                    console.log("Rejecting", tokenDate)
                    return
                }
                await AsyncStorage.setItem(ACCESS_TOKEN, tokenDate.access_token)
                router.replace('/redirect')
            });
        }
    }, [response]);

    const handleSubmit = async () => {
        if (!url) {
            return
        }
        try {
            setApiClient(url)
            const clientConfig = await apiClient!.getPublicConfigUrl()
            const discoveryEndpoint: DiscoveryDocument = {
                authorizationEndpoint: clientConfig.url + "realms/" + clientConfig.realm + "/protocol/openid-connect/auth",
                tokenEndpoint: clientConfig.url + "realms/" + clientConfig.realm + "/protocol/openid-connect/token",
                revocationEndpoint: clientConfig.url + "realms/" + clientConfig.realm + "/protocol/openid-connect/revoke",
            }
            setDiscoveryConfig(discoveryEndpoint)
            await promptAsync();
            await AsyncStorage.setItem(LOGIN_URL, url)
        } catch (error: any) {
            console.error(error)
            Alert.alert("Fehler", "Die eingegebene URL ist ungültig oder der Server ist nicht erreichbar.");
            return
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: 'black' }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <View style={styles.container}>
            <Text style={styles.title}>Willkommen bei SmartOrganizr</Text>
            <Text style={styles.subtitle}>Bitte gib die URL zu deinem SmartOrganizr ein:</Text>
            <TextInput
                style={styles.input}
                placeholder="https://dein-smartorganizr.de"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
            />
            <TouchableOpacity disabled={!url}   style={[styles.button, !url && { opacity: 0.5 }]}
                              onPress={handleSubmit}>
                <Text style={styles.buttonText}>Weiter</Text>
            </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    title: {
        textAlign: "center",
        fontSize: 28,
        fontWeight: "bold",
        color: "#22223b",
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: "#4a4e69",
        marginBottom: 24,
        textAlign: "center",
    },
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
    button: {
        backgroundColor: "#5f6dbe",
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 8,
        elevation: 2,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
