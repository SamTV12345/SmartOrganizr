import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

type CalendarToken = { token: string; url: string };

const calendarTokenQueryKey = ["calendarToken"];

export const CalendarFeed = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);

    const { data, isLoading } = useQuery<CalendarToken | null>({
        queryKey: calendarTokenQueryKey,
        queryFn: async () => {
            try {
                const response = await axios.get<CalendarToken>(apiURL + "/v1/users/calendar-token");
                return response.data;
            } catch (err) {
                const e = err as { response?: { status: number } };
                if (e.response?.status === 404) return null; // no token generated yet
                throw err;
            }
        },
        refetchOnWindowFocus: false,
    });

    const rotateMutation = useMutation<CalendarToken, Error, void>({
        mutationFn: async () =>
            (await axios.post<CalendarToken>(apiURL + "/v1/users/calendar-token")).data,
        onSuccess: (token) => {
            queryClient.setQueryData(calendarTokenQueryKey, token);
        },
    });

    const copyUrl = async () => {
        if (!data?.url) return;
        try {
            await navigator.clipboard.writeText(data.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard unavailable (http origin, permissions) — user can still select the text
        }
    };

    return (
        <Card>
            <CardHeader className="bg-muted/40 border-b">
                <CardTitle>{t("calendarFeed.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">{t("calendarFeed.description")}</p>
                {isLoading ? (
                    <Skeleton className="h-[36px] w-full rounded-md" />
                ) : data ? (
                    <div className="flex gap-2">
                        <Input readOnly value={data.url} onFocus={(e) => e.target.select()} />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={copyUrl}
                            aria-label={String(t("calendarFeed.copy"))}
                        >
                            {copied ? <Check /> : <Copy />}
                        </Button>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">{t("calendarFeed.noToken")}</p>
                )}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-muted-foreground text-xs">{data ? t("calendarFeed.rotateHint") : ""}</p>
                    <Button
                        type="button"
                        className="w-full md:w-auto"
                        onClick={() => rotateMutation.mutate()}
                        disabled={rotateMutation.isPending || isLoading}
                    >
                        {rotateMutation.isPending && <Loader2 className="mr-2 animate-spin" />}
                        {data ? t("calendarFeed.rotate") : t("calendarFeed.generate")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
