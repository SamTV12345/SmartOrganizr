import './App.css'
import './index.css'
import {useKeycloak} from "./Keycloak/useKeycloak";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {Header} from "./components/Header";
import {SideBar} from "./components/SideBar";
import {useAppSelector} from "./store/hooks";
import {WelcomePage} from "./pages/WelcomePage";

function App() {
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)

    const keycloak = useKeycloak()
    if(keycloak.tokenParsed === undefined){
        return <div>Loading</div>
    }

  return (
      <BrowserRouter basename="/ui">
          <div className="grid  grid-rows-[auto_1fr] h-full md:grid-cols-[300px_1fr]">
              <Header/>
              <SideBar/>
              <div className={`col-span-6 md:col-span-5 ${sideBarCollapsed?'xs:col-span-5':'hidden'} md:block w-full`}>
                <Routes>
                    <Route path={"/"} element={<WelcomePage/>}></Route>
                </Routes>
              </div>
          </div>
      </BrowserRouter>
  )
}

export default App
