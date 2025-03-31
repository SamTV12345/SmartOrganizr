import {FC} from "react";

type SidebarHeadingProps = {
    children: React.ReactNode
}

export const SidebarHeading: FC<SidebarHeadingProps> = ({children}) => {
    return (
        <li className="flex items-center  text-base font-bold rounded-lg text-[11px] text-white mt-5 mb-3">
            <span className="ml-3 uppercase">{children}</span>
        </li>
    );
}
