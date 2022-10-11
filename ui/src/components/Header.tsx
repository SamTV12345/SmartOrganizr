import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setSideBarCollapsed} from "../store/CommonSlice";
import {PackageIcon} from "@primer/octicons-react";
import mainlogo from '../SmartOrganizrIcon.svg'


export const Header = ()=>{
    const dispatch = useAppDispatch()
    const sideBarCollapsed = useAppSelector(state=>state.commonReducer.sideBarCollapsed)

    return (
        <div className="bg-neutral-900 w-full col-span-6 h-20 w-screen">
            <div className="flex items-center justify-between border-b-2 border-gray-100 py-6 md:justify-start md:space-x-10 col-span-6 w-screen h-20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                 onClick={()=>{dispatch(setSideBarCollapsed(!sideBarCollapsed))}}
                 className=" text-white  focus:animate-pulse p-4 h-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <img src={mainlogo} className="text-white p-4 h-20" alt="SmartOrganizr logo"/>
                <div className="flex flex-grow">

                </div>
                <div className="w-14">
                <div className="overflow-hidden relative w-10 h-10 rounded-full bg-gray-600 justify-end">
                    <svg className="absolute -left-1 w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20"
                         xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"></path>
                    </svg>
                </div>
                </div>
            </div>
        </div>
    )
}