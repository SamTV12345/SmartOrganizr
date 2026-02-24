import { ChangeEvent, FC, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
    CalendarDays,
    CalendarRange,
    ChevronLeft,
    ClipboardCheck,
    DoorOpen,
    Download,
    FolderKanban,
    LayoutDashboard,
    ListMusic,
    MessagesSquare,
    Music2,
    NotebookTabs,
    PencilLine,
    Upload,
    UserRoundCog,
    UserRoundPlus,
    Users2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiURL } from "@/src/Keycloak";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";
import { Club } from "@/src/models/Club";
import { ClubPermissions } from "@/src/models/ClubPermissions";
import { ClubMember } from "@/src/models/ClubMember";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ClubSection = {
    id: string;
    label: string;
    description: string;
    icon: FC<{ className?: string }>;
    primaryAction: string;
    secondaryAction: string;
};

type InviteResult = {
    added_emails: string[];
    invited_emails: string[];
    failed_emails: string[];
};

const ROLE_OPTIONS = [
    { value: "LEITER", label: "Leiter", description: "Volle Verwaltung und alle Schreibrechte." },
    { value: "CO_LEITER", label: "Co-Leiter", description: "Operative Verwaltung mit erweiterten Rechten." },
    { value: "SCHRIFTFUEHRER", label: "Schriftführer", description: "Kommunikation und Mitgliedsverwaltung." },
    { value: "SCHATZMEISTER", label: "Schatzmeister", description: "Legacy-Rolle, weiterhin unterstützt." },
    { value: "MITGLIED", label: "Mitglied", description: "Standardzugriff mit lesender Sicht." },
];

const CLUB_SECTIONS: ClubSection[] = [
    { id: "pinnwand", label: "Pinnwand", description: "Neuigkeiten und Hinweise.", icon: LayoutDashboard, primaryAction: "Beitrag erstellen", secondaryAction: "Beiträge filtern" },
    { id: "nachrichten", label: "Nachrichten", description: "Direkte Kommunikation im Verein.", icon: MessagesSquare, primaryAction: "Nachricht verfassen", secondaryAction: "Posteingang öffnen" },
    { id: "aufgaben", label: "Aufgaben", description: "Aufgaben zu Proben, Auftritten und Orga.", icon: ClipboardCheck, primaryAction: "Aufgabe anlegen", secondaryAction: "Offene Aufgaben anzeigen" },
    { id: "dateien", label: "Dateien", description: "Ablage für Dokumente und Unterlagen.", icon: FolderKanban, primaryAction: "Datei hochladen", secondaryAction: "Ordnerstruktur öffnen" },
    { id: "register", label: "Register", description: "Instrumenten- und Stimmenbereiche verwalten.", icon: NotebookTabs, primaryAction: "Register anlegen", secondaryAction: "Registerliste anzeigen" },
    { id: "gruppen", label: "Gruppen", description: "Untergruppen und Teams organisieren.", icon: Users2, primaryAction: "Gruppe erstellen", secondaryAction: "Mitglieder zuweisen" },
    { id: "mitglieder", label: "Mitglieder", description: "Mitgliederliste, Einladungen und CSV-Import/Export.", icon: Users2, primaryAction: "Mitglied einladen", secondaryAction: "CSV exportieren" },
    { id: "rollen", label: "Rollen", description: "Berechtigungen für Leitung und Mitglieder steuern.", icon: UserRoundCog, primaryAction: "Rolle vergeben", secondaryAction: "Rechte prüfen" },
    { id: "raeume", label: "Räume", description: "Proberäume und Orte planen.", icon: DoorOpen, primaryAction: "Raum anlegen", secondaryAction: "Belegung anzeigen" },
    { id: "musikstuecke", label: "Musikstücke", description: "Repertoire und Stückinfos verwalten.", icon: Music2, primaryAction: "Stück hinzufügen", secondaryAction: "Repertoire ansehen" },
    { id: "setlists", label: "Setlists", description: "Abläufe für Auftritte vorbereiten.", icon: ListMusic, primaryAction: "Setlist erstellen", secondaryAction: "Setlists vergleichen" },
    { id: "terminvorlagen", label: "Terminvorlagen", description: "Wiederkehrende Termine als Vorlage.", icon: CalendarRange, primaryAction: "Vorlage erstellen", secondaryAction: "Vorlagen verwalten" },
    { id: "bearbeiten", label: "Bearbeiten", description: "Vereinsdaten und Einstellungen anpassen.", icon: PencilLine, primaryAction: "Verein bearbeiten", secondaryAction: "Einstellungen öffnen" },
];

const getInitials = (name: string) =>
    name
        .split(" ")
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

const splitEmails = (raw: string) =>
    raw
        .split(/[\n,; ]+/)
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);

const memberDisplayName = (member: ClubMember) => {
    const fullName = `${member.firstname || ""} ${member.lastname || ""}`.trim();
    if (fullName.length > 0) {
        return fullName;
    }
    if (member.username?.length > 0) {
        return member.username;
    }
    return member.user_id;
};

export const ClubDetailView: FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { clubId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [inviteText, setInviteText] = useState("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const user = useKeycloak();

    const activeSectionId = searchParams.get("section") ?? CLUB_SECTIONS[0].id;
    const activeSection = CLUB_SECTIONS.find((section) => section.id === activeSectionId) ?? CLUB_SECTIONS[0];

    const { data: clubsData, isLoading } = useQuery({
        queryKey: ["clubs"],
        queryFn: async () => axios.get<Club[]>(`${apiURL}/v1/clubs/${user.subject}`),
    });

    const { data: permissionsData } = useQuery({
        queryKey: ["club-permissions", clubId],
        queryFn: async () => axios.get<ClubPermissions>(`${apiURL}/v1/clubs/${clubId}/me/permissions`),
        enabled: !!clubId,
    });

    const { data: membersData, refetch: refetchMembers } = useQuery({
        queryKey: ["club-members", clubId],
        queryFn: async () => axios.get<ClubMember[]>(`${apiURL}/v1/clubs/${clubId}/members`),
        enabled: !!clubId,
    });

    const roleMutation = useMutation({
        mutationFn: async (variables: { memberUserId: string; role: string }) =>
            axios.patch(`${apiURL}/v1/clubs/${clubId}/members/${variables.memberUserId}/role`, { role: variables.role }),
        onSuccess: async () => {
            await refetchMembers();
        },
    });

    const inviteMutation = useMutation({
        mutationFn: async (emails: string[]) =>
            axios.post<InviteResult>(`${apiURL}/v1/clubs/${clubId}/members/invite`, { emails }),
        onSuccess: async () => {
            setInviteText("");
            await refetchMembers();
        },
    });

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return await axios.post<InviteResult>(`${apiURL}/v1/clubs/${clubId}/members/import`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: async () => {
            await refetchMembers();
        },
    });

    const permissions = permissionsData?.data;
    const members = membersData?.data ?? [];
    const club = useMemo(() => clubsData?.data.find((entry) => entry.id === clubId), [clubsData?.data, clubId]);
    const sectionWritable = permissions?.section_write?.[activeSection.id] ?? false;

    const onExportCSV = async () => {
        const response = await axios.get(`${apiURL}/v1/clubs/${clubId}/members/export`, { responseType: "blob" });
        const downloadURL = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = downloadURL;
        link.download = "Mitglieder.csv";
        link.click();
        URL.revokeObjectURL(downloadURL);
    };

    const onInvite = () => {
        const emails = splitEmails(inviteText);
        if (emails.length === 0) return;
        inviteMutation.mutate(emails);
    };

    const onImport = () => {
        if (!csvFile) return;
        importMutation.mutate(csvFile);
    };

    const onFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        setCsvFile(event.target.files?.[0] ?? null);
    };

    if (isLoading) {
        return <div className="p-6 text-sm text-muted-foreground">Lade Vereinsbereich...</div>;
    }

    if (!club) {
        return (
            <div className="p-6">
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Verein nicht gefunden</CardTitle>
                        <CardDescription>Der ausgewählte Verein ist nicht verfügbar oder du hast keinen Zugriff.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate("/createClub")}>Verein erstellen</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="rounded-xl border bg-card shadow-sm">
                <div className="rounded-t-xl bg-gradient-to-r from-accentDark to-[#11749c] px-4 py-4 text-white md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white/15 text-white hover:bg-white/25 hover:text-white"
                            onClick={() => navigate("/welcome")}
                        >
                            <ChevronLeft className="size-4" />
                            Zurück
                        </Button>
                        <div className="flex items-center gap-3">
                            <CalendarDays className="size-5" />
                            <span className="text-sm font-medium">Vereinsbereich</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 p-4 md:p-6">
                    <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex size-14 items-center justify-center rounded-full bg-accentDark text-lg font-semibold text-white">
                                {getInitials(club.name)}
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold md:text-2xl">{club.name}</h1>
                                <p className="text-sm text-muted-foreground">
                                    {club.street}, {club.postal_code} {club.location}, {club.country}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-accentDark/10 px-3 py-1 text-xs font-semibold text-accentDark">{club.club_type}</span>
                            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                Rolle: {permissions?.role ?? "MITGLIED"}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {CLUB_SECTIONS.map((section) => {
                            const Icon = section.icon;
                            const isActive = section.id === activeSection.id;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setSearchParams({ section: section.id })}
                                    className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                                        isActive
                                            ? "border-accentDark bg-accentDark text-white shadow-sm"
                                            : "bg-background hover:border-accentDark/50 hover:bg-muted/40"
                                    }`}
                                >
                                    <Icon className={`size-4 ${isActive ? "text-white" : "text-accentDark"}`} />
                                    <span className={`text-sm font-medium ${isActive ? "text-white" : "text-foreground"}`}>{section.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {activeSection.id === "nachrichten" && (
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <MessagesSquare className="size-5 text-accentDark" />
                                    Nachrichten
                                </CardTitle>
                                <CardDescription>Direkte Kommunikation im Verein.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-3">
                                <Button onClick={() => navigate(`/myMessages?clubId=${club.id}`)} disabled={!club.members_can_send_messages}>
                                    Nachrichten öffnen
                                </Button>
                                {!club.members_can_send_messages && (
                                    <p className="w-full text-sm text-muted-foreground">
                                        In diesem Verein ist `members_can_send_messages` deaktiviert.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeSection.id !== "rollen" && activeSection.id !== "mitglieder" && activeSection.id !== "nachrichten" && (
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <activeSection.icon className="size-5 text-accentDark" />
                                    {activeSection.label}
                                </CardTitle>
                                <CardDescription>{activeSection.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-3">
                                <Button disabled={!sectionWritable}>{activeSection.primaryAction}</Button>
                                <Button variant="outline">{activeSection.secondaryAction}</Button>
                                {!sectionWritable && <p className="w-full text-sm text-muted-foreground">Deine Rolle hat hier nur Leserechte.</p>}
                            </CardContent>
                        </Card>
                    )}

                    {activeSection.id === "mitglieder" && (
                        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Mitglieder</CardTitle>
                                    <CardDescription>Aktuelle Mitglieder und Rollen im Verein.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {members.map((member) => (
                                        <div key={member.user_id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.6fr_1.2fr]">
                                            <div>
                                                <p className="font-medium">{memberDisplayName(member)}</p>
                                                <p className="text-xs text-muted-foreground">{member.email || member.user_id}</p>
                                            </div>
                                            <Select
                                                value={member.role}
                                                onValueChange={(newRole) => roleMutation.mutate({ memberUserId: member.user_id, role: newRole })}
                                                disabled={!permissions?.can_manage_roles}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLE_OPTIONS.map((role) => (
                                                        <SelectItem key={role.value} value={role.value}>
                                                            {role.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><UserRoundPlus className="size-5 text-accentDark" />Mitglied einladen</CardTitle>
                                        <CardDescription>E-Mail-Adressen einfügen (mehrere möglich, getrennt durch Komma oder Zeilenumbruch).</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Textarea value={inviteText} onChange={(event) => setInviteText(event.target.value)} placeholder="mitglied1@example.com, mitglied2@example.com" rows={4} />
                                        <Button onClick={onInvite} disabled={!permissions?.can_invite_members || inviteMutation.isPending}>
                                            Einladung senden
                                        </Button>
                                        {inviteMutation.data?.data && (
                                            <div className="text-xs text-muted-foreground">
                                                <p>Direkt hinzugefügt: {inviteMutation.data.data.added_emails.length}</p>
                                                <p>Eingeladen: {inviteMutation.data.data.invited_emails.length}</p>
                                                {inviteMutation.data.data.failed_emails.length > 0 && (
                                                    <p>Fehlgeschlagen: {inviteMutation.data.data.failed_emails.join(", ")}</p>
                                                )}
                                            </div>
                                        )}
                                        {!permissions?.can_invite_members && <p className="text-xs text-muted-foreground">Deine Rolle darf keine Mitglieder einladen.</p>}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Mitglieder importieren/exportieren</CardTitle>
                                        <CardDescription>CSV nach Konzertmeister-Format importieren oder aktuelle Liste exportieren.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="member-csv-import">CSV-Datei</Label>
                                            <Input id="member-csv-import" type="file" accept=".csv,text/csv" onChange={onFileSelect} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" onClick={onExportCSV} disabled={!permissions?.can_invite_members}>
                                                <Download className="size-4" />
                                                CSV exportieren
                                            </Button>
                                            <Button onClick={onImport} disabled={!permissions?.can_invite_members || !csvFile || importMutation.isPending}>
                                                <Upload className="size-4" />
                                                CSV importieren
                                            </Button>
                                        </div>
                                        {importMutation.data?.data && (
                                            <div className="text-xs text-muted-foreground">
                                                <p>Direkt hinzugefügt: {importMutation.data.data.added_emails.length}</p>
                                                <p>Eingeladen: {importMutation.data.data.invited_emails.length}</p>
                                                {importMutation.data.data.failed_emails.length > 0 && (
                                                    <p>Fehlgeschlagen: {importMutation.data.data.failed_emails.join(", ")}</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeSection.id === "rollen" && (
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Systemrollen</CardTitle>
                                    <CardDescription>Standardrollen und Verantwortungen.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {ROLE_OPTIONS.map((role) => (
                                        <div key={role.value} className="rounded-lg border p-3">
                                            <p className="font-semibold">{role.label}</p>
                                            <p className="text-sm text-muted-foreground">{role.description}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Rollen pro Mitglied</CardTitle>
                                    <CardDescription>Rollen sind immer die Beziehung zwischen Mitglied und Verein.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {members.map((member) => (
                                        <div key={member.user_id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.7fr_1.3fr]">
                                            <div>
                                                <p className="font-medium">{memberDisplayName(member)}</p>
                                                <p className="text-xs text-muted-foreground">{member.email || member.user_id}</p>
                                            </div>
                                            <Select
                                                value={member.role}
                                                onValueChange={(newRole) => roleMutation.mutate({ memberUserId: member.user_id, role: newRole })}
                                                disabled={!permissions?.can_manage_roles}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLE_OPTIONS.map((role) => (
                                                        <SelectItem key={role.value} value={role.value}>
                                                            {role.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                    {!permissions?.can_manage_roles && <p className="text-sm text-muted-foreground">Deine Rolle hat hier nur Leserechte.</p>}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
