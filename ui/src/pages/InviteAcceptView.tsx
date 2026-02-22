import { FC } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiURL, keycloak } from "@/src/Keycloak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";

type PublicInvitation = {
    token: string;
    club_id: string;
    club_name: string;
    invited_email: string;
    expires_at: string;
    is_accepted: boolean;
    is_expired: boolean;
};

export const InviteAcceptView: FC = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const keycloakContext = useKeycloak();
    const loggedIn = Boolean(keycloakContext?.authenticated);
    const loggedInEmail = String(keycloakContext?.tokenParsed?.email || "");

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["public-invite", token],
        queryFn: async () => axios.get<PublicInvitation>(`${apiURL}/public/invitations/${token}`),
        enabled: !!token,
    });

    const acceptMutation = useMutation({
        mutationFn: async () => axios.post(`${apiURL}/v1/invitations/${token}/accept`),
        onSuccess: async () => {
            await refetch();
        },
    });

    const invitation = data?.data;

    return (
        <div className="flex min-h-full items-center justify-center p-4">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>Vereinseinladung</CardTitle>
                    <CardDescription>
                        {isLoading ? "Lade Einladung..." : `Einladung zu ${invitation?.club_name ?? "deinem Verein"}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {invitation && (
                        <>
                            <p className="text-sm text-muted-foreground">E-Mail: {invitation.invited_email}</p>
                            <p className="text-sm text-muted-foreground">Gültig bis: {new Date(invitation.expires_at).toLocaleString()}</p>
                            {invitation.is_accepted && <p className="text-sm">Diese Einladung wurde bereits angenommen.</p>}
                            {invitation.is_expired && <p className="text-sm">Diese Einladung ist abgelaufen.</p>}
                            {!invitation.is_accepted && !invitation.is_expired && !loggedIn && (
                                <Button
                                    onClick={() =>
                                        keycloak.login({
                                            redirectUri: window.location.href,
                                        })
                                    }
                                >
                                    Anmelden und Einladung annehmen
                                </Button>
                            )}
                            {!invitation.is_accepted && !invitation.is_expired && loggedIn && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Angemeldet als: {loggedInEmail}</p>
                                    <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
                                        Einladung annehmen
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                    <Button variant="outline" onClick={() => navigate("/welcome")}>
                        Zur Anwendung
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

