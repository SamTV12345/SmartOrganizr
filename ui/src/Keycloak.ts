import Keycloak from "keycloak-js";
import {isLocalhost} from "./utils/Utilities";
import {ApiLink} from "./models/ApiLink";

export let keycloak:Keycloak = undefined as unknown as Keycloak

export let apiURL=''
export let uiURL=''
export let links = {
    author: {} as ApiLink
}

export const waitTime = 1000

if(isLocalhost){
        apiURL="http://localhost:8080/api"
        uiURL="http://localhost:5173/ui"
}
else {
    apiURL=window.location.protocol+"//"+window.location.hostname+"/api"
    uiURL=window.location.protocol+"//"+window.location.hostname+"/ui"
}


const setKeycloak = (clientId:string, realm: string, url:string)=>{
    keycloak  = new Keycloak({clientId,url,realm})
}

export const setLoadedKeycloak = (loadedKeycloak:Keycloak)=>{
    keycloak  = loadedKeycloak
}

export const setLinks = (linksInParam: any)=>{
    links = linksInParam
}
export default setKeycloak;
