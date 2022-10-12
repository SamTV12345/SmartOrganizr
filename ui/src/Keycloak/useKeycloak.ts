import Keycloak from "keycloak-js"
import {createContext, useContext} from "react"

export const KeycloakContext = createContext<Keycloak>(null as any)


export const useKeycloak = ()=>useContext(KeycloakContext)
