import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import getKeycloak, {apiURL, keycloak, setLoadedKeycloak} from "./Keycloak";
import Keycloak from "keycloak-js";
import { KeycloakContext } from './Keycloak/useKeycloak';
import {store} from "./store/store";
import {Provider} from "react-redux";
import {I18nextProvider} from "react-i18next";
import i18n from "./language/i18n";
import axios from "axios";
import setKeycloak from "./Keycloak";

const initKeycloak = (keycloak: Keycloak) => {
    return new Promise((resolve) => {
        keycloak.init({onLoad: 'login-required'})
            .then((res) => {
                setLoadedKeycloak(keycloak)
                axios.defaults.headers.common["Authorization"]=`Bearer ${keycloak.token}`
                resolve(res)
                }
            )
            .catch((error) => {
                console.log(error)
            })
    })
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

const renderApp= (keycloak: Keycloak)=>
{
    root.render(
        <React.StrictMode>
            <I18nextProvider i18n={i18n}>
            <Provider store={store}>
            <KeycloakContext.Provider value={keycloak as Keycloak}>
            <App/>
            </KeycloakContext.Provider>
            </Provider>
            </I18nextProvider>
        </React.StrictMode>
    )
}

const bootstrapApp = async () => {
    if(keycloak === undefined){
        console.log("Aufgerufen")
        axios.get(apiURL+"/public")
            .then(resp=>{
                setKeycloak(resp.data.clientId,resp.data.realm, resp.data.url)
                initKeycloak(keycloak).then(()=>renderApp(keycloak as Keycloak))

            })
    }
}

bootstrapApp().then(()=>{console.log("Started")})