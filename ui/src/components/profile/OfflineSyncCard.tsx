import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw } from "lucide-react";
import { runSync, useSyncStatus } from "@/src/offline/syncStore";
import { useOnlineStatus } from "@/src/offline/useOnlineStatus";

export const OfflineSyncCard = () => {
    const { t } = useTranslation();
    const isOnline = useOnlineStatus();
    const { syncing, lastSyncedAt, lastError } = useSyncStatus();

    return (
        <Card>
            <CardHeader className="bg-muted/40 border-b">
                <CardTitle>{t("offline.cardTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">{t("offline.cardDescription")}</p>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-muted-foreground text-xs">
                        {lastSyncedAt
                            ? t("offline.lastSynced", { time: new Date(lastSyncedAt).toLocaleString() })
                            : t("offline.neverSynced")}
                    </p>
                    <Button
                        type="button"
                        className="w-full md:w-auto"
                        onClick={() => runSync()}
                        disabled={!isOnline || syncing}
                    >
                        {syncing ? <Loader2 className="mr-2 animate-spin" /> : <RefreshCw className="mr-2" />}
                        {syncing ? t("offline.syncing") : t("offline.syncNow")}
                    </Button>
                </div>
                {lastError && <p className="text-sm text-red-600">{t("offline.syncFailed")}</p>}
            </CardContent>
        </Card>
    );
};
