import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatDateLong, formatDateOnly, formatDateTime, type DateInput } from "@/src/utils/DateFormat";

// Binds the current i18n language to the pure formatters, so components never
// pass a language (and never reach for a locale) themselves.
export const useDateFormat = () => {
    const { i18n } = useTranslation();
    const language = i18n.language;
    return useMemo(
        () => ({
            formatDateTime: (value: DateInput) => formatDateTime(value, language),
            formatDateOnly: (value: DateInput) => formatDateOnly(value, language),
            formatDateLong: (value: DateInput) => formatDateLong(value, language),
            language,
        }),
        [language]
    );
};
