import Keycloak from "keycloak-js";
import {isLocalhost} from "./utils/Utilities";
export const localKeycloak = new Keycloak({
    clientId: "website",
    url: "http://192.168.2.33/",
    realm: "master"
})

export let apiURL=''

const getKeycloak = ()=> {
    if(isLocalhost){
        apiURL="http://localhost:80"
        return localKeycloak
    }
    else {
        apiURL=window.location.protocol+"//"+window.location.hostname+"/api"
    }
    console.log("Nicht erreichbar")
}
export default getKeycloak;