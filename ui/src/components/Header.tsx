import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setSideBarCollapsed} from "../store/CommonSlice";
import {PackageIcon, PersonFillIcon, PersonIcon} from "@primer/octicons-react";
import mainlogo from '../SmartOrganizrIcon.svg'
import {useState} from "react";


export const Header = ()=>{
    const dispatch = useAppDispatch()
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)
    const [avatarDrodownClicked, setAvatarDropdownClicked] = useState<boolean>(false)
    return (
        <div className="bg-neutral-900 w-full col-span-6 h-20 w-screen">
            <div className="flex items-center justify-between border-gray-100 py-6 md:justify-start md:space-x-10 col-span-6 w-screen h-20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                 onClick={()=>{dispatch(setSideBarCollapsed(!sideBarCollapsed))}}
                 className=" text-white  focus:animate-pulse p-4 h-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <img src={mainlogo} className="text-white p-4 h-20" alt="SmartOrganizr logo"/>
                <div className="flex flex-grow">

                </div>
                <div className="w-20">
                    <div className="relative inline-block text-left">
                        <div>

                            <svg xmlns="http://www.w3.org/2000/svg" onClick={()=>setAvatarDropdownClicked(!avatarDrodownClicked)} fill="white" className="w-16" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2.5a5.5 5.5 0 00-3.096 10.047 9.005 9.005 0 00-5.9 8.18.75.75 0 001.5.045 7.5 7.5 0 0114.993 0 .75.75 0 101.499-.044 9.005 9.005 0 00-5.9-8.181A5.5 5.5 0 0012 2.5zM8 8a4 4 0 118 0 4 4 0 01-8 0z"></path></svg>
                        </div>
                        {avatarDrodownClicked && <div
                            className="absolute z-40 right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                            role="menu" aria-orientation="vertical" aria-labelledby="menu-button" >
                            <div className="py-1" role="none">
                                <a href="#" className="text-gray-700 block px-4 py-2 text-sm" role="menuitem"
                                    id="menu-item-0">Account settings</a>
                                <a href="#" className="text-gray-700 block px-4 py-2 text-sm" role="menuitem"
                                    id="menu-item-1">Support</a>
                                <a href="#" className="text-gray-700 block px-4 py-2 text-sm" role="menuitem"
                                    id="menu-item-2">License</a>
                                <form method="POST" action="#" role="none">
                                    <button type="submit"
                                            className="text-gray-700 block w-full px-4 py-2 text-left text-sm"
                                            role="menuitem"  id="menu-item-3">Sign out
                                    </button>
                                </form>
                            </div>
                        </div>}
                    </div>
                </div>
            </div>
        </div>
    )
}