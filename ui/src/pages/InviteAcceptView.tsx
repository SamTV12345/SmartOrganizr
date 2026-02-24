import { FC, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiURL, keycloak } from "@/src/Keycloak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

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

    const completeMutation = useMutation({
        mutationFn: async () =>
            axios.post(`${apiURL}/public/invitations/${token}/complete`, {
                firstname,
                lastname,
                password,
                confirm_password: confirmPassword,
            }),
        onSuccess: async () => {
            await refetch();
        },
    });

    const invitation = data?.data;
    const invitedEmail = String(invitation?.invited_email || "");
    const isEmailMatch = invitedEmail !== "" && loggedInEmail !== "" && invitedEmail.toLowerCase() === loggedInEmail.toLowerCase();

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
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Neues Konto für diese Einladung erstellen (ohne offene Registrierung).</p>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-firstname">Vorname</Label>
                                        <Input id="invite-firstname" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-lastname">Nachname</Label>
                                        <Input id="invite-lastname" value={lastname} onChange={(e) => setLastname(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-password">Passwort</Label>
                                        <Input id="invite-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-password-confirm">Passwort bestätigen</Label>
                                        <Input id="invite-password-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            onClick={() => completeMutation.mutate()}
                                            disabled={
                                                completeMutation.isPending ||
                                                password.length < 8 ||
                                                confirmPassword.length < 8 ||
                                                password !== confirmPassword
                                            }
                                        >
                                            Konto erstellen und Einladung annehmen
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                keycloak.login({
                                                    redirectUri: window.location.href,
                                                    loginHint: invitedEmail || undefined,
                                                })
                                            }
                                        >
                                            Mit bestehendem Konto anmelden
                                        </Button>
                                    </div>
                                    {completeMutation.isSuccess && (
                                        <p className="text-sm text-emerald-600">Konto erstellt und Einladung angenommen. Bitte jetzt einloggen.</p>
                                    )}
                                    {completeMutation.isError && <p className="text-sm text-destructive">Konto konnte nicht erstellt werden.</p>}
                                </div>
                            )}

                            {!invitation.is_accepted && !invitation.is_expired && loggedIn && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Angemeldet als: {loggedInEmail}</p>
                                    {!isEmailMatch && (
                                        <p className="text-sm text-destructive">
                                            Die Einladung ist für {invitedEmail}. Bitte melde dich mit dieser E-Mail an.
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending || !isEmailMatch}>
                                            Einladung annehmen
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                keycloak.login({
                                                    redirectUri: window.location.href,
                                                    prompt: "login",
                                                    loginHint: invitedEmail || undefined,
                                                })
                                            }
                                        >
                                            Konto wechseln
                                        </Button>
                                    </div>
                                    {acceptMutation.isError && <p className="text-sm text-destructive">Einladung konnte nicht angenommen werden.</p>}
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
