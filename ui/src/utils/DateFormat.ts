import { format, isValid, parseISO } from "date-fns";
import { de } from "date-fns/locale/de";
import { enUS } from "date-fns/locale/en-US";
import type { Locale } from "date-fns";

// One place decides how dates look. Before this module the app mixed three
// styles — date-fns with a hardcoded German locale, toLocaleString("de-DE")
// and bare toLocaleString() — so the same timestamp rendered differently per
// screen and the English UI showed German dates.
export const resolveDateLocale = (language: string): Locale =>
    language?.toLowerCase().startsWith("de") ? de : enUS;

const formatWith = (iso: string | undefined | null, language: string, pattern: string): string => {
    if (!iso) return "";
    const parsed = parseISO(iso);
    if (!isValid(parsed)) return "";
    return format(parsed, pattern, { locale: resolveDateLocale(language) });
};

/** Date and time, e.g. "04.03.2026, 16:30" / "03/04/2026, 4:30 PM". */
export const formatDateTime = (iso: string | undefined | null, language: string): string =>
    formatWith(iso, language, "Pp");

/** Date only, e.g. "04.03.2026" / "03/04/2026". */
export const formatDateOnly = (iso: string | undefined | null, language: string): string =>
    formatWith(iso, language, "P");
