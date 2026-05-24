import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useDebouncedAutocomplete } from "@/src/hooks/useDebouncedAutocomplete";
import { fetchWorksAutocomplete } from "@/src/api/autocomplete";
import type { AutocompleteWork } from "@/src/models/Autocomplete";

interface Props {
    value: string;
    onChange: (v: string) => void;
    onPickLocal: (w: AutocompleteWork) => void;
    onPickExternal: (w: AutocompleteWork) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

// WorkAutocompleteInput renders an input that shows a dropdown of local +
// Wikidata work suggestions while the user types. Picking a suggestion
// invokes the matching callback; the caller decides what to do (e.g. fill
// fields locally, or POST /works/from-wikidata for external picks).
export function WorkAutocompleteInput({
    value,
    onChange,
    onPickLocal,
    onPickExternal,
    placeholder,
    autoFocus,
}: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    // Stable fetcher so useDebouncedAutocomplete doesn't re-fire on every render.
    const fetcher = useCallback((q: string) => fetchWorksAutocomplete(q), []);
    const { data, loading } = useDebouncedAutocomplete(value, fetcher);

    const hasResults =
        data && (data.local.length > 0 || data.external.length > 0);

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
                onBlur={() => {
                    // Defer close so onMouseDown on a button can fire first.
                    setTimeout(() => setOpen(false), 150);
                }}
                placeholder={placeholder ?? t("workAutocomplete.placeholder", "Titel suchen…")}
                autoFocus={autoFocus}
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
                                {t("workAutocomplete.local", "Aus meiner Sammlung")}
                            </div>
                            {data.local.map(w => (
                                <button
                                    key={w.id}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-accent"
                                    onMouseDown={() => {
                                        onPickLocal(w);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="font-medium">{w.name}</div>
                                </button>
                            ))}
                        </>
                    )}
                    {data && data.external.length > 0 && (
                        <>
                            <div className="bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                                {t("workAutocomplete.external", "Aus Wikidata")}
                            </div>
                            {data.external.map(w => (
                                <button
                                    key={w.wikidataId}
                                    type="button"
                                    className="block w-full px-3 py-2 text-left hover:bg-accent"
                                    onMouseDown={() => {
                                        onPickExternal(w);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="font-medium">{w.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {w.description}
                                        {w.composer && <> · {w.composer.name}</>}
                                        {w.compositionYear && <> · {w.compositionYear}</>}
                                    </div>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
