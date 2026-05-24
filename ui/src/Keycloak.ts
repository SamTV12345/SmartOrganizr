import Keycloak from "keycloak-js";

export let keycloak:Keycloak = undefined as unknown as Keycloak

// Use the page's own origin so requests are routed through whatever serves
// the UI. For dev that's the rsbuild dev server which proxies /api and
// /public to localhost:8080. For prod it's the reverse-proxy domain that
// fronts the Go backend. window.location.origin includes the port — important
// when accessed from a LAN IP (e.g. https://10.0.0.42:5173) where dropping
// the port would point at :443 and yield ERR_CONNECTION_REFUSED.
export const apiURL = window.location.origin + "/api"
export const uiURL  = window.location.origin + "/ui"

export const waitTime = 1000


const setKeycloak = (clientId:string, realm: string, url:string)=>{
    keycloak  = new Keycloak({clientId,url,realm})
}

export const setLoadedKeycloak = (loadedKeycloak:Keycloak)=>{
    keycloak  = loadedKeycloak
}

export default setKeycloak;
