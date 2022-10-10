import './App.css'
import './index.css'
import {useKeycloak} from "./Keycloak/useKeycloak";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {Header} from "./components/Header";
import {SideBar} from "./components/SideBar";
import {useAppSelector} from "./store/hooks";

function App() {
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)

    const keycloak = useKeycloak()
    if(keycloak.tokenParsed === undefined){
        return <div>Loading</div>
    }

  return (
      <BrowserRouter>
          <div className="grid  grid-rows-[auto_1fr] h-full">
              <Header/>
              <SideBar/>
              <div className={`col-span-5 ${sideBarCollapsed?'xs:col-span-5':'hidden'} md:block`}>
test
              </div>
          </div>
      </BrowserRouter>
  )
}

export default App
