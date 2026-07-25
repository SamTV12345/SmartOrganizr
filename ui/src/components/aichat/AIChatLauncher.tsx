import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAiChatStore } from "../../store/aiChatStore";
import { AIChatPanel } from "./AIChatPanel";

const KEYCLOAK_CONFIG_CACHE_KEY = "smartorganizr-keycloak-config";

function isAiEnabled(): boolean {
    try {
        const raw = localStorage.getItem(KEYCLOAK_CONFIG_CACHE_KEY);
        return raw ? JSON.parse(raw).aiEnabled === true : false;
    } catch {
        return false;
    }
}

export const AIChatLauncher = () => {
    const { t } = useTranslation();
    const { isOpen, setOpen } = useAiChatStore();

    if (!isAiEnabled()) {
        return null;
    }

    // The launcher used to be md-only, which hid the assistant on phones
    // entirely. The panel itself goes full-screen below sm.
    return (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
            {isOpen && <AIChatPanel />}
            {!isOpen && (
                <button
                    type="button"
                    title={t("aiChat.open")}
                    onClick={() => setOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
                >
                    <MessageCircle className="h-6 w-6" />
                </button>
            )}
        </div>
    );
};
