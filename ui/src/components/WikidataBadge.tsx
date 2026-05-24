import { useTranslation } from "react-i18next";

// WikidataBadge is a small inline marker for notes/authors that have been
// linked to a Wikidata record. Renders nothing when `wikidataId` is empty,
// so it's safe to drop directly into list rows: <WikidataBadge id={note.wikidataId} />.
export function WikidataBadge({ id }: { id?: string | null }) {
    const { t } = useTranslation();
    if (!id) return null;
    return (
        <span
            title={t("wikidata.badgeTitle", "Aus Wikidata angereichert ({{id}})", { id })}
            className="ml-2 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        >
            W
        </span>
    );
}
