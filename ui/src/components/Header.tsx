import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setSideBarCollapsed} from "../store/CommonSlice";
import {PackageIcon} from "@primer/octicons-react";
import mainlogo from '../SmartOrganizrIcon.svg'


export const Header = ()=>{
    const dispatch = useAppDispatch()
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)

    return (
        <div className="bg-neutral-900 w-full col-span-6 auto-rows-min h-20 flex flex-row gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                 onClick={()=>{dispatch(setSideBarCollapsed(!sideBarCollapsed))}}
                 className=" text-white  focus:animate-pulse p-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <img src={mainlogo} className="text-white p-4" alt="SmartOrganizr logo"/>
        </div>
    )
}