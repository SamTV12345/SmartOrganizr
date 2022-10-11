import Keycloak from "keycloak-js";
import {isLocalhost} from "./utils/Utilities";

export let keycloak:Keycloak = undefined as unknown as Keycloak

export let apiURL=''

if(isLocalhost){
        apiURL="http://localhost:8080/api"
}
else {
 apiURL=window.location.protocol+"//"+window.location.hostname+"/api"
}

const setKeycloak = (clientId:string, realm: string, url:string)=>{
    keycloak  = new Keycloak({clientId,url,realm})
}

export const setLoadedKeycloak = (loadedKeycloak:Keycloak)=>{
    keycloak  = loadedKeycloak
}
export default setKeycloak;
