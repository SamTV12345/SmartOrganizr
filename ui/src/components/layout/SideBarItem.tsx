import { FC } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type SideBarItemProps = {
    highlightPath: string,
    translationkey: string,
    icon: React.ReactElement,
    onNavigate?: () => void,
    badge?: number
}

export const SideBarItem: FC<SideBarItemProps> = ({
    highlightPath,
    translationkey,
    icon,
    onNavigate,
    badge,
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
                <span className="flex items-center gap-2">
                    {badge !== undefined && badge > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                            {badge > 99 ? "99+" : badge}
                        </span>
                    )}
                    <span className="text-sidebar-foreground/80">{icon}</span>
                </span>
            </NavLink>
        </li>
    );
};
