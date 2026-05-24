import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useDebouncedAutocomplete } from "@/src/hooks/useDebouncedAutocomplete";
import { fetchAuthorsAutocomplete } from "@/src/api/autocomplete";
import type { AutocompleteAuthor } from "@/src/models/Autocomplete";

interface Props {
    value: string;
    onChange: (v: string) => void;
    onPickLocal: (a: AutocompleteAuthor) => void;
    onPickExternal: (a: AutocompleteAuthor) => void;
    placeholder?: string;
}

// AuthorAutocompleteInput is the author-side mirror of WorkAutocompleteInput:
// debounced live search against both the user's existing authors and Wikidata
// people who are composers, arrangers, lyricists, musicians, songwriters or
// conductors.
export function AuthorAutocompleteInput({
    value,
    onChange,
    onPickLocal,
    onPickExternal,
    placeholder,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const fetcher = useCallback((q: string) => fetchAuthorsAutocomplete(q), []);
    const { data, loading } = useDebouncedAutocomplete(value, fetcher);

    const hasResults = data && (data.local.length > 0 || data.external.length > 0);

    return (
        <div className="relative">
            <Input
                type="text"
                value={value}
                onChange={e => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder={placeholder ?? (t("author") as string)}
            />
            {open && (loading || hasResults) && (
                <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {loading && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            {t("workAutocomplete.searching", "Suche…")}
                        </div>
                    )}
                    {data && data.local.length > 0 && (
                        <>
                            <div className="bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                                {t("authorAutocomplete.local", "Meine Autoren")}
                            </div>
                            {data.local.map(a => (
                                <button
                                    key={a.id}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-accent"
                                    onMouseDown={() => {
                                        onPickLocal(a);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="font-medium">{a.name}</div>
                                    {(a.birthYear || a.deathYear) && (
                                        <div className="text-xs text-muted-foreground">
                                            {a.birthYear ?? "?"}{a.deathYear ? `–${a.deathYear}` : ""}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                    {data && data.external.length > 0 && (
                        <>
                            <div className="bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                                {t("authorAutocomplete.external", "Aus Wikidata")}
                            </div>
                            {data.external.map(a => (
                                <button
                                    key={a.wikidataId}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-accent"
                                    onMouseDown={() => {
                                        onPickExternal(a);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="font-medium">{a.name}</div>
                                    {a.description && (
                                        <div className="text-xs text-muted-foreground">
                                            {a.description}
                                            {a.birthYear && <> · {a.birthYear}{a.deathYear ? `–${a.deathYear}` : ""}</>}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
