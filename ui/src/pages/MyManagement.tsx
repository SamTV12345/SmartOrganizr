import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type ReactNode } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FolderOpen, Search, FileUp, Music2, ArrowRight } from "lucide-react";

type ManagementEntry = {
    title: string;
    description: string;
    to: string;
    icon: ReactNode;
};

export const MyManagement = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const entries: ManagementEntry[] = [
        {
            title: t("authors"),
            description: "Komponist*innen verwalten",
            to: "/noteManagement/authors",
            icon: <Users className="size-6" />,
        },
        {
            title: t("concerts"),
            description: "Programme und Auftritte planen",
            to: "/noteManagement/concerts",
            icon: <Music2 className="size-6" />,
        },
        {
            title: t("folders"),
            description: "Ordnerstruktur durchsuchen",
            to: "/noteManagement/folders",
            icon: <FolderOpen className="size-6" />,
        },
        {
            title: t("io"),
            description: "Importieren und exportieren",
            to: "/noteManagement/io",
            icon: <FileUp className="size-6" />,
        },
        {
            title: t("search"),
            description: "Noten schnell finden",
            to: "/noteManagement/notes",
            icon: <Search className="size-6" />,
        },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-10">
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-6 md:p-8">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                    {t("noteManagement")}
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
                    Wahlen Sie einen Bereich, um schnell in die passende Verwaltung zu springen.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                    <Card
                        key={entry.to}
                        role="button"
                        tabIndex={0}
                        className="group cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => navigate(entry.to)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                navigate(entry.to);
                            }
                        }}
                    >
                        <CardHeader className="gap-4">
                            <div className="bg-primary/10 text-primary ring-primary/20 inline-flex size-11 items-center justify-center rounded-xl ring-1">
                                {entry.icon}
                            </div>
                            <CardTitle className="text-base md:text-lg">{entry.title}</CardTitle>
                            <CardDescription>{entry.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted h-px w-full" />
                        </CardContent>
                        <CardFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-muted-foreground group-hover:text-foreground -ml-3"
                            >
                                Öffnen
                                <ArrowRight className="ml-1 size-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </section>
        </main>
    );
};
