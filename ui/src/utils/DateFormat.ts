import { format, isValid, parseISO } from "date-fns";
import { de } from "date-fns/locale/de";
import { enUS } from "date-fns/locale/en-US";
import type { Locale } from "date-fns";

/** Everything the app actually holds dates in: ISO strings from the API, epoch
 * milliseconds from the offline sync store, and Date objects from form state. */
export type DateInput = string | number | Date | undefined | null;

// One place decides how dates look. Before this module the app mixed three
// styles — date-fns with a hardcoded German locale, toLocaleString("de-DE")
// and bare toLocaleString() — so the same timestamp rendered differently per
// screen and the English UI showed German dates.
export const resolveDateLocale = (language: string): Locale =>
    language?.toLowerCase().startsWith("de") ? de : enUS;

const toDate = (value: DateInput): Date | null => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = typeof value === "string" ? parseISO(value) : new Date(value);
    return isValid(parsed) ? parsed : null;
};

const formatWith = (value: DateInput, language: string, pattern: string): string => {
    const parsed = toDate(value);
    if (!parsed) return "";
    return format(parsed, pattern, { locale: resolveDateLocale(language) });
};

/** Date and time, e.g. "04.03.2026, 16:30" / "03/04/2026, 4:30 PM". */
export const formatDateTime = (value: DateInput, language: string): string =>
    formatWith(value, language, "Pp");

/** Date only, e.g. "04.03.2026" / "03/04/2026". */
export const formatDateOnly = (value: DateInput, language: string): string =>
    formatWith(value, language, "P");

/** Spelled-out date, e.g. "4. März 2026" / "March 4th, 2026". */
export const formatDateLong = (value: DateInput, language: string): string =>
    formatWith(value, language, "PPP");
