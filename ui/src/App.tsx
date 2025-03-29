import './App.css'
import './index.css'
import "@fortawesome/fontawesome-free/css/all.min.css"
import {useKeycloak} from "./Keycloak/useKeycloak";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {Header} from "./components/layout/Header";
import {SideBar} from "./components/layout/SideBar";
import {useAppSelector} from "./store/hooks";
import {useTranslation} from "react-i18next";
import React, {SuspenseProps} from 'react';
import {
    AuthorLazyLoad,
    ConcertViewLazyLoad,
    FolderViewLazyLoad, ImportExportViewLazyLoad,
    SearchElementViewLazyLoad
} from "./utils/LazyLoadComponents";
import WelcomePage from "./pages/WelcomePage";
import {MyManagement} from "./pages/MyManagement";
import {Loader2} from "lucide-react";

function App() {
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)
    const {t} = useTranslation()
    const keycloak = useKeycloak()
    if(keycloak.tokenParsed === undefined){
        return <Loader2/>
    }


    const Suspense = (children: SuspenseProps)=>{
        return <React.Suspense fallback={<div>{t('loading')}</div>}>
            {children.children}
             </React.Suspense>

    }

  return (
      <BrowserRouter basename="/ui">
          <div className="grid  grid-rows-[auto_1fr] h-full md:grid-cols-[300px_1fr]">
              <Header/>
              <SideBar/>
              <div className={`col-span-6 md:col-span-5 ${sideBarCollapsed?'xs:col-span-5':'hidden'} md:block w-full overflow-x-auto`}>
                  <Routes>
                      <Route path="/" element={<Navigate to={"/welcome"}/>}/>
                      <Route path={"/welcome"} element={<WelcomePage/>}/>
                      <Route path={"/noteManagement"} element={<MyManagement/>}/>
                      <Route path={"/noteManagement/authors"} element={
                          <Suspense>
                              <AuthorLazyLoad/>
                          </Suspense>
                      }/>
                      <Route path={"/noteManagement/folders"} element={
                            <Suspense>
                                    <FolderViewLazyLoad/>
                            </Suspense>}
                      />
                      <Route path={"/noteManagement/notes"} element={
                          <Suspense>
                            <SearchElementViewLazyLoad/>
                          </Suspense>
                      }
                      />
                      <Route path={"/noteManagement/concerts"} element={
                          <Suspense>
                              <ConcertViewLazyLoad/>
                          </Suspense>
                      }/>
                      <Route path={"/noteManagement/io"} element={
                          <Suspense>
                              <ImportExportViewLazyLoad/>
                          </Suspense>
                      }/>
                  </Routes>
              </div>
          </div>
      </BrowserRouter>
  )
}

export default App
