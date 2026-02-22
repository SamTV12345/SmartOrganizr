import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {setSideBarCollapsed} from "../../store/CommonSlice";
import {useMemo, useState} from "react";
import {apiURL, uiURL} from "../../Keycloak";
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
import {Menu} from "lucide-react";


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
        <div className="bg-background border-b col-span-6 w-full">
            <div className="flex h-14 items-center justify-between px-2 md:px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => {
                        dispatch(setSideBarCollapsed(!sideBarCollapsed));
                    }}
                >
                    <Menu />
                    <span className="sr-only">Open navigation</span>
                </Button>
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
                            className={cn("bg-popover text-popover-foreground border-border absolute top-9 right-0 z-40 mt-2 w-56 origin-top-right border shadow-lg focus:outline-none",
                                avatarDrodownClicked? "transition-opacity duration-100 ease-out opacity-100" : "transition-opacity duration-100 ease-in opacity-0 pointer-events-none"
                            )}
                            role="menu" aria-orientation="vertical" aria-labelledby="menu-button" >
                            <div className={cn("py-1")} role="none">
                                <a target="_blank" href={accountURL} className="hover:bg-accent hover:text-accent-foreground block px-4 py-2 text-sm" role="menuitem"
                                    id="menu-item-0">{t('accountSettings')}</a>
                                <button onClick={()=>{
                                    navigate('/profile/edit')
                                }}
                                        className="hover:bg-accent hover:text-accent-foreground block w-full cursor-pointer px-4 py-2 text-left text-sm"
                                        role="menuitem"  id="menu-item-3">Profilbild ändern
                                </button>
                                    <button type="submit" onClick={()=>keycloak.logout({redirectUri: uiURL})}
                                            className="hover:bg-accent hover:text-accent-foreground block w-full cursor-pointer px-4 py-2 text-left text-sm"
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
