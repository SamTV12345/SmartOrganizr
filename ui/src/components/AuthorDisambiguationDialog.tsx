import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { Author } from "@/src/api/types";

interface Props {
    name: string | null;
    candidates: Author[];
    onPickExisting: (author: Author) => void;
    onCreateNew: () => void;
    onCancel: () => void;
}

// AuthorDisambiguationDialog opens when the user types an author name on
// note submit and two-or-more existing local authors share that name (think
// "Johann Strauss" father vs. son). The user picks which existing record to
// link, or asks us to create a third record alongside them.
export function AuthorDisambiguationDialog({
    name,
    candidates,
    onPickExisting,
    onCreateNew,
    onCancel,
}: Props) {
    const { t } = useTranslation();
    const open = name !== null;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {t("authorDisambig.title", "Welcher {{name}}?", { name: name ?? "" })}
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm">
                    {t(
                        "authorDisambig.body",
                        "In deiner Sammlung gibt es mehrere Autoren mit diesem Namen. Welcher ist gemeint?",
                    )}
                </p>
                <div className="space-y-2">
                    {candidates.map((c) => {
                        // Years are populated on real Author rows but the
                        // current generated OpenAPI type doesn't expose
                        // them yet — cast through so we can show them when
                        // present without breaking the build.
                        const ext = c as Author & {
                            birthYear?: number;
                            deathYear?: number;
                        };
                        return (
                            <Button
                                key={c.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => onPickExisting(c)}
                            >
                                <span className="font-medium">{c.name}</span>
                                {(ext.birthYear || ext.deathYear) && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        ({ext.birthYear ?? "?"}{ext.deathYear ? `–${ext.deathYear}` : ""})
                                    </span>
                                )}
                                {c.extraInformation && (
                                    <span className="ml-2 text-xs text-muted-foreground truncate">
                                        {c.extraInformation}
                                    </span>
                                )}
                            </Button>
                        );
                    })}
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={onCreateNew}
                    >
                        <span className="font-medium">
                            + {t("authorDisambig.createNew", "Als neuen Autor anlegen")}
                        </span>
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>
                        {t("common.cancel", "Abbrechen")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
