import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import setKeycloak, {apiURL, keycloak, setLoadedKeycloak} from "./Keycloak";
import Keycloak from "keycloak-js";
import {KeycloakContext} from './Keycloak/useKeycloak';
import {store} from "./store/store";
import {Provider} from "react-redux";
import {I18nextProvider} from "react-i18next";
import i18n from "./language/i18n";
import { http as axios } from "@/src/api/client";
import { QueryClientProvider } from "@tanstack/react-query";
import {queryClient} from "@/src/utils/QueryClient";
import { applyTheme, getInitialTheme } from "@/src/utils/ThemeUtils";


export let accountURL = ''

applyTheme(getInitialTheme());

if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/ui/sw.js", { scope: "/ui/" })
      .catch((err) => console.log("Service worker registration failed", err));
  });
}

const initKeycloak = (keycloak: Keycloak) => {
    console.log("Called initKeycloak")
    const isPublicInvitePath = window.location.pathname.includes("/ui/invite/")
    const onLoadMode = isPublicInvitePath ? "check-sso" : "login-required"
    return new Promise((resolve) => {
        keycloak.init({onLoad: onLoadMode, silentCheckSsoFallback: true, checkLoginIframe: false })
            .then((res) => {
                setLoadedKeycloak(keycloak)
                // Auth header injection is handled centrally by api/client.ts (authFetch reads keycloak.token).
                if (keycloak.authenticated) {
                    syncUser()
                }
                resolve(res)

                let updateToken = ()=>setInterval(()=>{
                    if(!keycloak.authenticated) {
                        return
                    }
                    keycloak.updateToken(30)
                        .then((_refreshed)=>{
                            // token refresh handled by keycloak; api/client.ts reads it on each request.
                        }).catch((reason)=>{
                            console.log("Reason is", reason)
                    })
                }, 30000)
                updateToken()
                }
            )
            .catch((error) => {
                console.log("Error is", error)
            })
    })
}


const syncUser = ()=>{
    axios.put(apiURL+"/v1/users")
        .then(()=>console.log("User was silently created."))
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)


const renderApp= (keycloak: Keycloak)=>
{
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <I18nextProvider i18n={i18n}>
                <Provider store={store}>
                <KeycloakContext.Provider value={keycloak}>
                <App/>
                </KeycloakContext.Provider>
                </Provider>
                </I18nextProvider>
            </QueryClientProvider>
        </React.StrictMode>
    )
}

const bootstrapApp = async () => {
    if(keycloak === undefined){
        axios.get("/../public")
            .then(resp=>{
                accountURL = resp.data.url+"/realms/"+resp.data.realm+"/account"
                setKeycloak(resp.data.clientId,resp.data.realm, resp.data.url)
                initKeycloak(keycloak).then(()=>renderApp(keycloak))
            })
    }
}

bootstrapApp().then(()=>{console.log("Started")})
