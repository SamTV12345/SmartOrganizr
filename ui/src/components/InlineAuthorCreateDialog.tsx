import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { AuthorAutocompleteInput } from "@/src/components/searchBars/AuthorAutocompleteInput";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import type { Author } from "@/src/models/Author";
import type { AutocompleteAuthor } from "@/src/models/Autocomplete";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onCreated: (author: Author) => void;
}

interface AuthorCreatePayload {
    name: string;
    extraInformation: string;
    wikidataId?: string;
    birthYear?: number;
    deathYear?: number;
}

// InlineAuthorCreateDialog is a small modal opened from inside CreateFolderOrNote
// so the user can add a new author without leaving the note-creation flow.
// Includes a Wikidata search to pre-fill name + lifespan + QID — handy for
// people like Gerald Weinkopf who exist on Wikidata but weren't yet local.
export function InlineAuthorCreateDialog({
    open,
    onOpenChange,
    initialName = "",
    onCreated,
}: Props) {
    const { t } = useTranslation();
    const [searchName, setSearchName] = useState(initialName);
    const [extraInformation, setExtraInformation] = useState("");
    const [wikidataId, setWikidataId] = useState<string | undefined>(undefined);
    const [birthYear, setBirthYear] = useState<number | undefined>(undefined);
    const [deathYear, setDeathYear] = useState<number | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetState = () => {
        setSearchName(initialName);
        setExtraInformation("");
        setWikidataId(undefined);
        setBirthYear(undefined);
        setDeathYear(undefined);
        setError(null);
        setIsSaving(false);
    };

    const handlePickLocal = (a: AutocompleteAuthor) => {
        // Picking an existing local author is effectively "select" — we
        // hand it straight back to the caller and close without creating
        // anything new.
        if (a.id) {
            onCreated({
                id: a.id,
                name: a.name,
                extraInformation: "",
            } as Author);
            resetState();
            onOpenChange(false);
        }
    };

    const handlePickExternal = (a: AutocompleteAuthor) => {
        // Picking a Wikidata entry pre-fills the form — user still confirms
        // with Submit. Lets them tweak ExtraInformation before saving.
        setSearchName(a.name);
        setWikidataId(a.wikidataId);
        setBirthYear(a.birthYear);
        setDeathYear(a.deathYear);
        if (a.description) {
            setExtraInformation(a.description);
        }
    };

    const handleSubmit = async () => {
        setError(null);
        if (!searchName.trim()) {
            setError(t("fieldRequired", "Name ist Pflicht") as string);
            return;
        }
        setIsSaving(true);
        const payload: AuthorCreatePayload = {
            name: searchName.trim(),
            extraInformation,
        };
        if (wikidataId) payload.wikidataId = wikidataId;
        if (birthYear !== undefined) payload.birthYear = birthYear;
        if (deathYear !== undefined) payload.deathYear = deathYear;

        try {
            const resp = await axios.post<Author>(`${apiURL}/v1/authors`, payload);
            // Backend used to return 200 with {error: "..."} on failure; even
            // though that's fixed to 4xx now, defend against missing id so a
            // stale backend can't poison the form with undefined.
            if (!resp.data?.id) {
                console.error("author create returned no id:", resp.data);
                setError(t("author.createFailed", "Autor konnte nicht angelegt werden.") as string);
                setIsSaving(false);
                return;
            }
            onCreated(resp.data);
            resetState();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
            const e = err as { response?: { status: number; data: { error?: string } } };
            if (e.response?.status === 409 || e.response?.data?.error?.includes("Duplicate entry")) {
                setError(t("author.duplicateWikidata", "Du hast diesen Autor (gleiche Wikidata-ID) schon angelegt.") as string);
            } else {
                setError(t("author.createFailed", "Autor konnte nicht angelegt werden.") as string);
            }
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) resetState();
                onOpenChange(o);
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {t("authorCreate.title", "Neuen Autor anlegen")}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div>
                        <Label className="mb-1 block">{t("name")}</Label>
                        <AuthorAutocompleteInput
                            value={searchName}
                            onChange={(v) => {
                                setSearchName(v);
                                // Editing the name after a Wikidata pick discards
                                // the pick — name no longer matches the QID.
                                if (wikidataId) {
                                    setWikidataId(undefined);
                                    setBirthYear(undefined);
                                    setDeathYear(undefined);
                                }
                            }}
                            onPickLocal={handlePickLocal}
                            onPickExternal={handlePickExternal}
                            placeholder={t("author") as string}
                        />
                        {wikidataId && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t("authorCreate.wikidataLink", "Verknüpft mit Wikidata: {{id}}", { id: wikidataId })}
                                {(birthYear || deathYear) && (
                                    <> · {birthYear ?? "?"}{deathYear ? `–${deathYear}` : ""}</>
                                )}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label className="mb-1 block">{t("extraInformation", "Zusatzinformation")}</Label>
                        <Input
                            value={extraInformation}
                            onChange={(e) => setExtraInformation(e.target.value)}
                            placeholder={t("authorCreate.extraPlaceholder", "z.B. der Sohn, Bandarrangeur, …") as string}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            resetState();
                            onOpenChange(false);
                        }}
                        disabled={isSaving}
                    >
                        {t("common.cancel", "Abbrechen")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader className="mr-2 animate-spin" />}
                        {t("save", "Speichern")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
