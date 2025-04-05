import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {setSideBarCollapsed} from "../../store/CommonSlice";
import {useMemo, useState} from "react";
import {apiURL, keycloak, uiURL} from "../../Keycloak";
import {useTranslation} from "react-i18next";
import {accountURL} from "../../index";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {cn} from "@/src/lib/utils";
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import {User} from "@/src/models/User";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";


export const Header = ()=>{
    const {t} = useTranslation()
    const dispatch = useAppDispatch()
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)
    const [avatarDrodownClicked, setAvatarDropdownClicked] = useState<boolean>(false)
    const keycloak = useKeycloak()
    const navigate = useNavigate()
    const {data, isLoading} = useQuery<User>({
        queryKey: ['user'],
        queryFn: async () => {
           return await axios.get(apiURL +"/v1/users/me").then(response=>response.data)
        },
        enabled: keycloak.authenticated
    })

    const initials = useMemo(()=>{
        if(keycloak.tokenParsed !== undefined && keycloak.tokenParsed.given_name !== undefined && keycloak.tokenParsed.family_name !== undefined){
            return `${keycloak.tokenParsed.given_name.charAt(0)}${keycloak.tokenParsed.family_name.charAt(0)}`
        }
        return ""
    }, [keycloak])


    return (
        <div className="bg-neutral-900 w-full col-span-6 w-screen">
            <div className="flex items-center justify-between border-gray-100 py-6 md:justify-start md:space-x-10 col-span-6 w-screen h-14">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                 onClick={()=>{dispatch(setSideBarCollapsed(!sideBarCollapsed))}}
                 className=" text-white  focus:animate-pulse p-4 h-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
                <div className="flex flex-grow">
                </div>
                <div className="w-20">
                    <div className="relative inline-block text-left">
                        <div className="relative">
                                <Avatar className="cursor-pointer"  onClick={()=>setAvatarDropdownClicked(!avatarDrodownClicked)}>
                                    <AvatarImage src={data?.profilePicUrl}/>
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                        </div>
                        <div onBlur={()=>setAvatarDropdownClicked(!avatarDrodownClicked)}
                            className={cn("absolute bg-gray-700 z-40 right-0 z-10 top-9 mt-2 w-56 origin-top-right shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
                                avatarDrodownClicked? "transition-opacity duration-100 ease-out opacity-100" : "transition-opacity duration-100 ease-in opacity-0 pointer-events-none"
                            )}
                            role="menu" aria-orientation="vertical" aria-labelledby="menu-button" >
                            <div className={cn("py-1")} role="none">
                                <a target="_blank" href={accountURL} className="text-white block px-4 py-2 text-sm hover:bg-gray-500" role="menuitem"
                                    id="menu-item-0">{t('accountSettings')}</a>
                                <button onClick={()=>{
                                    navigate('/profile/edit')
                                }}
                                        className="text-white block w-full px-4 py-2 text-left text-sm cursor-pointer hover:bg-gray-500"
                                        role="menuitem"  id="menu-item-3">Profilbild ändern
                                </button>
                                    <button type="submit" onClick={()=>keycloak.logout({redirectUri: uiURL})}
                                            className="text-white block w-full px-4 py-2 text-left text-sm cursor-pointer hover:bg-gray-500"
                                            role="menuitem"  id="menu-item-3">{t('signOut')}
                                    </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
