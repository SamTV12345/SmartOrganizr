import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import getKeycloak, {localKeycloak} from "./Keycloak";
import Keycloak from "keycloak-js";
import { KeycloakContext } from './Keycloak/useKeycloak';
import {store} from "./store/store";
import {Provider} from "react-redux";

const initKeycloak = () => {
    return new Promise((resolve, reject) => {
        getKeycloak().init({onLoad: 'login-required'})
            .then((res) => {
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
            <Provider store={store}>
            <KeycloakContext.Provider value={keycloak as Keycloak}>
            <App/>
            </KeycloakContext.Provider>
            </Provider>
        </React.StrictMode>
    )
}

const bootstrapApp = async () => {
    await initKeycloak()
    renderApp(localKeycloak as Keycloak)
}

bootstrapApp().then(() => console.log("Started"))