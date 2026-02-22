import './App.css'
import './index.css'
import "@fortawesome/fontawesome-free/css/all.min.css"
import {useKeycloak} from "./Keycloak/useKeycloak";
import {BrowserRouter, Navigate, Outlet, Route, Routes} from "react-router-dom";
import {Header} from "./components/layout/Header";
import {SideBar} from "./components/layout/SideBar";
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
import {ProfileEdit} from "@/src/pages/ProfileEdit";
import {NoteDetailView} from "@/src/pages/NoteDetailView";
import {EventView} from "@/src/pages/EventView";
import {ClubView} from "@/src/pages/ClubView";
import {ClubDetailView} from "@/src/pages/ClubDetailView";
import {InviteAcceptView} from "@/src/pages/InviteAcceptView";

function RootLayout() {
    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <Header />
            <div className="flex min-h-0 flex-1">
                <SideBar />
                <main className="min-h-0 flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function App() {
    const {t} = useTranslation()
    const keycloak = useKeycloak()
    const isPublicInvitePath = window.location.pathname.includes("/ui/invite/")
    if(keycloak.tokenParsed === undefined && !isPublicInvitePath){
        return <Loader2/>
    }


    const Suspense = (children: SuspenseProps)=>{
        return <React.Suspense fallback={<div>{t('loading')}</div>}>
            {children.children}
             </React.Suspense>

    }

  return (
      <BrowserRouter basename="/ui">
          <Routes>
              <Route path="/invite/:token" element={<Suspense><InviteAcceptView/></Suspense>} />
              <Route element={<RootLayout />}>
                  <Route path="/" element={<Navigate to={"/welcome"}/>}/>
                  <Route path={"/welcome"} element={<WelcomePage/>}/>
                  <Route path={"/noteManagement"} element={<MyManagement/>}/>
                  <Route path="/profile/edit" element={<ProfileEdit/>}/>
                  <Route path="/myDates" element={<EventView/>}/>
                  <Route path="/createClub" element={<Suspense><ClubView/></Suspense>} />
                  <Route path="/clubs/:clubId" element={<Suspense><ClubDetailView/></Suspense>} />
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
                  <Route path={"/noteManagement/search"} element={
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
                  <Route path={"/noteManagement/notes/:id"} element={
                        <Suspense>
                            <NoteDetailView/>
                        </Suspense>
                    }/>
              </Route>
          </Routes>
      </BrowserRouter>
  )
}

export default App
