import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type {
    AutocompleteAuthor,
    WorkFromWikidataConflict,
} from "@/src/api/types";

interface Props {
    conflict: WorkFromWikidataConflict | null;
    onLinkExisting: (candidate: AutocompleteAuthor) => void;
    onCreateNew: () => void;
    onCancel: () => void;
}

// AuthorConflictDialog surfaces the 409 response from POST /works/from-wikidata
// when the resolved composer collides with one or more existing local authors
// who don't yet have a Wikidata QID. The user picks one of:
//   - "Mit X verknüpfen" -> caller PATCHes the candidate with the incoming
//     QID + lifespan, then retries the work creation.
//   - "Als neuen Autor anlegen" -> caller retries with forceNewAuthor=true.
//   - "Abbrechen" -> dialog closes; the create flow is abandoned.
export function AuthorConflictDialog({
    conflict,
    onLinkExisting,
    onCreateNew,
    onCancel,
}: Props) {
    const { t } = useTranslation();
    const open = conflict !== null;

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {t("authorConflict.title", "Autor bereits vorhanden?")}
                    </DialogTitle>
                </DialogHeader>
                {conflict && (
                    <>
                        <p className="text-sm">
                            {t(
                                "authorConflict.body",
                                "Du hast bereits einen Autor mit diesem Namen. Ist das derselbe wie",
                            )}{" "}
                            <strong>{conflict.incoming?.name}</strong>
                            {conflict.incoming?.description && (
                                <> ({conflict.incoming.description})</>
                            )}
                            ?
                        </p>
                        <div className="space-y-2">
                            {(conflict.candidates ?? []).map(c => (
                                <Button
                                    key={c.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => onLinkExisting(c)}
                                >
                                    <span className="font-medium">
                                        {t("authorConflict.link", "Mit {{name}} verknüpfen", { name: c.name })}
                                    </span>
                                    {c.birthYear && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            ({c.birthYear}{c.deathYear ? `–${c.deathYear}` : ""})
                                        </span>
                                    )}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={onCreateNew}
                            >
                                <span className="font-medium">
                                    {t("authorConflict.createNew", "Als neuen Autor anlegen")}
                                </span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                    {t("authorConflict.createNewHint", "Beide Autoren bleiben getrennt")}
                                </span>
                            </Button>
                        </div>
                    </>
                )}
                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>
                        {t("common.cancel", "Abbrechen")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
