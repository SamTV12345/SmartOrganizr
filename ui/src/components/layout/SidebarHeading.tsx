import {FC} from "react";

type SidebarHeadingProps = {
    children: React.ReactNode
}

export const SidebarHeading: FC<SidebarHeadingProps> = ({children}) => {
    return (
        <li className="text-sidebar-foreground/60 mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide">
            <span>{children}</span>
        </li>
    );
}
