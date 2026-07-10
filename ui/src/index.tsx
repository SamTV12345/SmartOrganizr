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
import { getLastSyncedAt } from "@/src/offline/offlineDb";
import { syncNow } from "@/src/offline/offlineSync";
import { setOfflineBoot } from "@/src/offline/useOnlineStatus";

const KEYCLOAK_CONFIG_CACHE_KEY = "smartorganizr-keycloak-config";

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
    return new Promise((resolve, reject) => {
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
                reject(error)
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

type CachedKeycloakConfig = { clientId: string; realm: string; url: string; aiEnabled?: boolean };

const renderOfflineNotice = (title: string, message: string) => {
    root.render(
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: "1.5rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{title}</h1>
            <p style={{ color: "#6b7280" }}>{message}</p>
        </div>
    );
};

const bootstrapApp = async () => {
    if (keycloak !== undefined) return;

    let config: CachedKeycloakConfig | null = null;
    let reachedServer = false;
    try {
        const resp = await axios.get("/../public");
        config = {
            clientId: resp.data.clientId,
            realm: resp.data.realm,
            url: resp.data.url,
            aiEnabled: resp.data.aiEnabled === true,
        };
        localStorage.setItem(KEYCLOAK_CONFIG_CACHE_KEY, JSON.stringify(config));
        reachedServer = true;
    } catch {
        // Offline (or backend unreachable): fall back to the cached config. Guard the parse so
        // a corrupt cached value can't throw out of bootstrap and leave a blank screen.
        const cached = localStorage.getItem(KEYCLOAK_CONFIG_CACHE_KEY);
        try {
            config = cached ? (JSON.parse(cached) as CachedKeycloakConfig) : null;
        } catch {
            config = null;
        }
    }

    if (!config) {
        renderOfflineNotice("You're offline", "Connect to the internet once to set up SmartOrganizr for offline use.");
        return;
    }

    accountURL = config.url + "/realms/" + config.realm + "/account";
    setKeycloak(config.clientId, config.realm, config.url);

    // Use whether we actually reached the backend (not navigator.onLine, which is true even
    // on captive portals that can't reach Keycloak) to decide the online vs. offline path.
    if (reachedServer) {
        try { await initKeycloak(keycloak); } catch (error) { console.error("Keycloak init failed", error); }
        renderApp(keycloak);
        syncNow().catch((error) => console.log("Background offline sync failed", error));
        return;
    }

    const lastSynced = await getLastSyncedAt();
    if (lastSynced) {
        setOfflineBoot(true);
        renderApp(keycloak);
    } else {
        renderOfflineNotice("You're offline", "Connect to the internet once to download your library for offline use.");
    }
};

bootstrapApp()
    .then(() => { console.log("Started") })
    .catch((error) => {
        console.error("Boot failed", error);
        renderOfflineNotice("Something went wrong", "Please reconnect to the internet and reload SmartOrganizr.");
    });
