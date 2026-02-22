import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useTranslation } from "react-i18next";
import { SideBarItem } from "./SideBarItem";
import { SidebarHeading } from "@/src/components/layout/SidebarHeading";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiURL } from "@/src/Keycloak";
import { Club } from "@/src/models/Club";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { setSideBarCollapsed } from "@/src/store/CommonSlice";

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
    const user = useKeycloak();
    const { t } = useTranslation();

    const getClubs = async () => {
        return await axios.get<Club[]>(apiURL + "/v1/clubs/" + user.subject);
    };

    const { data } = useQuery({
        queryKey: ["clubs"],
        queryFn: getClubs,
    });

    return (
        <div className="bg-sidebar text-sidebar-foreground flex min-h-0 w-full flex-col">
            <div className="border-sidebar-border border-b px-3 py-3">
                <p className="text-sm font-semibold">{t("my-smartorganizr")}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3">
                <ul className="space-y-1">
                    <SidebarHeading>{t("my-smartorganizr")}</SidebarHeading>
                    <SideBarItem onNavigate={onNavigate} highlightPath={"/dashboard"} translationkey={t("dashboard")} icon={<i className="fa-solid fa-table-columns" />} />
                    <SideBarItem onNavigate={onNavigate} highlightPath={"/myDates"} translationkey={t("my-dates")} icon={<i className="fa-solid fa-calendar" />} />
                    <SideBarItem onNavigate={onNavigate} highlightPath={"/myMessages"} translationkey={t("my-messages")} icon={<i className="fa-solid fa-message" />} />
                    <SideBarItem onNavigate={onNavigate} highlightPath={"/myPolls"} translationkey={t("my-polls")} icon={<i className="fa-solid fa-square-poll-horizontal" />} />
                    <SideBarItem onNavigate={onNavigate} highlightPath={"/clubOverview"} translationkey={t("club-overview")} icon={<i className="fa-solid fa-drum" />} />
                    <SideBarItem onNavigate={onNavigate} highlightPath={"/myRooms"} translationkey={t("my-rooms")} icon={<i className="fa-solid fa-door-open" />} />

                    <SidebarHeading>{t("create-new")}</SidebarHeading>
                    <SideBarItem onNavigate={onNavigate} highlightPath="/createClub" translationkey={t("create-club")} icon={<i className="fa-solid fa-drum" />} />

                    <SidebarHeading>{t("my-clubs")}</SidebarHeading>
                    {data?.data.map((club) => (
                        <SideBarItem
                            key={club.id}
                            onNavigate={onNavigate}
                            highlightPath={"/clubs/" + club.id}
                            translationkey={club.name}
                            icon={<i className="fa-solid fa-drum" />}
                        />
                    ))}

                    <SidebarHeading>{t("my-profile")}</SidebarHeading>
                    <SideBarItem
                        onNavigate={onNavigate}
                        highlightPath={"/noteManagement"}
                        translationkey={t("noteManagement")}
                        icon={<i className="fa-solid fa-bars-progress" />}
                    />
                </ul>
            </div>
        </div>
    );
};

export const SideBar = () => {
    const dispatch = useAppDispatch();
    const sideBarCollapsed = useAppSelector((state) => state.commonReducer.sideBarCollapsed);

    return (
        <>
            <aside
                className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-full min-h-0 shrink-0 border-r md:flex md:w-[250px] md:flex-col"
                aria-label="Sidebar"
            >
                <SidebarContent />
            </aside>

            <Sheet
                open={sideBarCollapsed}
                onOpenChange={(open) => dispatch(setSideBarCollapsed(open))}
            >
                <SheetContent side="left" className="bg-sidebar p-0 text-sidebar-foreground">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <SidebarContent onNavigate={() => dispatch(setSideBarCollapsed(false))} />
                </SheetContent>
            </Sheet>
        </>
    );
};
