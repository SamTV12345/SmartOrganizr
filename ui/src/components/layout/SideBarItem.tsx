import { FC } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type SideBarItemProps = {
    highlightPath: string,
    translationkey: string,
    icon: React.ReactElement,
    onNavigate?: () => void
}

export const SideBarItem: FC<SideBarItemProps> = ({
    highlightPath,
    translationkey,
    icon,
    onNavigate,
}) => {
    return (
        <li className="w-full">
            <NavLink
                to={highlightPath}
                onClick={onNavigate}
                className={({ isActive }) =>
                    cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 w-full justify-between px-3 text-sm font-normal",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    )
                }
            >
                <span className="truncate">{translationkey}</span>
                <span className="text-sidebar-foreground/80">{icon}</span>
            </NavLink>
        </li>
    );
};
