import { FC, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { $api } from "@/src/api/client";
import { keycloak } from "@/src/Keycloak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";
import { useDateFormat } from "@/src/hooks/useDateFormat";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
    const { token } = useParams();
    const { formatDateTime } = useDateFormat();
    const navigate = useNavigate();
    const keycloakContext = useKeycloak();
    const loggedIn = Boolean(keycloakContext?.authenticated);
    const loggedInEmail = String(keycloakContext?.tokenParsed?.email || "");

    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const { data, isLoading, refetch } = $api.useQuery(
        "get",
        "/public/invitations/{token}",
        { params: { path: { token: token ?? "" } } },
        { enabled: !!token }
    );

    const acceptMutation = $api.useMutation("post", "/v1/invitations/{token}/accept", {
        onSuccess: async () => {
            await refetch();
        },
    });

    const completeMutation = $api.useMutation("post", "/public/invitations/{token}/complete", {
        onSuccess: async () => {
            await refetch();
        },
    });

    const invitation = data as PublicInvitation | undefined;
    const invitedEmail = String(invitation?.invited_email || "");
    const isEmailMatch = invitedEmail !== "" && loggedInEmail !== "" && invitedEmail.toLowerCase() === loggedInEmail.toLowerCase();

    return (
        <div className="flex min-h-full items-center justify-center p-4">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>{t("invite.title")}</CardTitle>
                    <CardDescription>
                        {isLoading ? t("invite.loading") : t("invite.subtitle", { club: invitation?.club_name ?? t("invite.fallbackClub") })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {invitation && (
                        <>
                            <p className="text-sm text-muted-foreground">{t("invite.email", { email: invitation.invited_email })}</p>
                            <p className="text-sm text-muted-foreground">{t("invite.validUntil", { date: formatDateTime(invitation.expires_at) })}</p>
                            {invitation.is_accepted && <p className="text-sm">{t("invite.alreadyAccepted")}</p>}
                            {invitation.is_expired && <p className="text-sm">{t("invite.expired")}</p>}

                            {!invitation.is_accepted && !invitation.is_expired && !loggedIn && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">{t("invite.createAccountHint")}</p>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-firstname">{t("invite.firstname")}</Label>
                                        <Input id="invite-firstname" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-lastname">{t("invite.lastname")}</Label>
                                        <Input id="invite-lastname" value={lastname} onChange={(e) => setLastname(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-password">{t("invite.password")}</Label>
                                        <Input id="invite-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-password-confirm">{t("invite.passwordConfirm")}</Label>
                                        <Input id="invite-password-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            onClick={() => completeMutation.mutate({
                                                params: { path: { token: token ?? "" } },
                                                body: {
                                                    firstname,
                                                    lastname,
                                                    password,
                                                    confirm_password: confirmPassword,
                                                } as never,
                                            })}
                                            disabled={
                                                completeMutation.isPending ||
                                                password.length < 8 ||
                                                confirmPassword.length < 8 ||
                                                password !== confirmPassword
                                            }
                                        >
                                            {t("invite.createAndAccept")}
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
                                            {t("invite.loginExisting")}
                                        </Button>
                                    </div>
                                    {completeMutation.isSuccess && (
                                        <p className="text-sm text-emerald-600">{t("invite.accountCreated")}</p>
                                    )}
                                    {completeMutation.isError && <p className="text-sm text-destructive">{t("invite.accountFailed")}</p>}
                                </div>
                            )}

                            {!invitation.is_accepted && !invitation.is_expired && loggedIn && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">{t("invite.signedInAs", { email: loggedInEmail })}</p>
                                    {!isEmailMatch && (
                                        <p className="text-sm text-destructive">
                                            {t("invite.wrongAccount", { email: invitedEmail })}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button onClick={() => acceptMutation.mutate({ params: { path: { token: token ?? "" } } })} disabled={acceptMutation.isPending || !isEmailMatch}>
                                            {t("invite.accept")}
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
                                            {t("invite.switchAccount")}
                                        </Button>
                                    </div>
                                    {acceptMutation.isError && <p className="text-sm text-destructive">{t("invite.acceptFailed")}</p>}
                                </div>
                            )}
                        </>
                    )}
                    <Button variant="outline" onClick={() => navigate("/welcome")}>
                        {t("invite.toApp")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
