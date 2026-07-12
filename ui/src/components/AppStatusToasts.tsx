import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { dismissSyncError, useSyncStatus } from "@/src/offline/syncStore";
import { useAppUpdateAvailable } from "@/src/offline/appUpdateStore";

const SYNC_ERROR_AUTOHIDE_MS = 8000;

// Non-blocking, self-contained status toasts (no toast library in the project):
// offline-sync failures and the "new version available — reload" prompt.
export const AppStatusToasts = () => {
    const { t } = useTranslation();
    const { lastError } = useSyncStatus();
    const updateAvailable = useAppUpdateAvailable();

    useEffect(() => {
        if (!lastError) return;
        const timer = window.setTimeout(dismissSyncError, SYNC_ERROR_AUTOHIDE_MS);
        return () => window.clearTimeout(timer);
    }, [lastError]);

    if (!lastError && !updateAvailable) return null;

    return (
        <div className="fixed bottom-4 left-1/2 z-50 flex w-max max-w-[90vw] -translate-x-1/2 flex-col gap-2">
            {lastError && (
                <div role="alert" className="flex items-center gap-3 rounded-md bg-red-700 px-4 py-2 text-sm text-white shadow-lg">
                    <span>{t("offline.syncFailed")}</span>
                    <button
                        type="button"
                        onClick={dismissSyncError}
                        aria-label={String(t("offline.dismiss"))}
                        className="cursor-pointer font-bold"
                    >
                        ×
                    </button>
                </div>
            )}
            {updateAvailable && (
                <div role="status" className="flex items-center gap-3 rounded-md bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
                    <span>{t("offline.updateAvailable")}</span>
                    <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                        {t("offline.reload")}
                    </Button>
                </div>
            )}
        </div>
    );
};
