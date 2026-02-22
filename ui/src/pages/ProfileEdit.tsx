import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { ProfileUploadEdit } from "@/src/components/profile/ProfileUploadEdit";
import { ProfileGeneralEdit } from "@/src/components/profile/ProfileGeneralEdit";
import { GeburtstagAdresseEdit } from "@/src/components/profile/GeburtstagAdresseEdit";
import { PasswordReset } from "@/src/components/profile/PasswordReset";
import { KonzertMeisterRestURL } from "@/src/components/profile/KonzertMeisterRestURL";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitialTheme, setTheme, type AppTheme } from "@/src/utils/ThemeUtils";

export const ProfileEdit = () => {
    const { t } = useTranslation();
    const [theme, setThemeState] = useState<AppTheme>(getInitialTheme());

    const themeLabel = useMemo(() => {
        return theme === "dark" ? t("darkMode") : t("lightMode");
    }, [theme, t]);

    const handleSetTheme = (nextTheme: AppTheme) => {
        setTheme(nextTheme);
        setThemeState(nextTheme);
    };

    return (
        <main className="from-background to-muted/30 min-h-[calc(100dvh-3.5rem)] bg-gradient-to-b px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                <header className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight">Profil</h1>
                    <p className="text-muted-foreground text-sm">
                        Einstellungen, Konto und Darstellung an einem Ort.
                    </p>
                </header>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>{t("appearance")}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                        <div className="text-muted-foreground text-sm">
                            {t("currentTheme")}: <span className="text-foreground font-medium">{themeLabel}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={theme === "light" ? "default" : "outline"}
                                onClick={() => handleSetTheme("light")}
                            >
                                <Sun className="mr-2" />
                                {t("lightMode")}
                            </Button>
                            <Button
                                type="button"
                                variant={theme === "dark" ? "default" : "outline"}
                                onClick={() => handleSetTheme("dark")}
                            >
                                <Moon className="mr-2" />
                                {t("darkMode")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="flex flex-col gap-4">
                        <ProfileUploadEdit />
                        <ProfileGeneralEdit />
                        <GeburtstagAdresseEdit />
                        <PasswordReset />
                    </div>
                    <div className="flex flex-col gap-4">
                        <KonzertMeisterRestURL />
                    </div>
                </div>
            </div>
        </main>
    );
};
