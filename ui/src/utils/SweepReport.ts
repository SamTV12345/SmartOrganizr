import type { SweepReport } from "@/src/api/types";

export type SweepReportSection = "present" | "newHere" | "missing" | "incomplete";

/**
 * Removes one entry from one section of a sweep report.
 *
 * Dismissing is deliberately client-side only: it means "I have seen this", not
 * "this is resolved". A note that is still missing shows up again in the next
 * sweep — which is exactly what the reconciliation workflow needs.
 */
export const dismissEntry = (
    report: SweepReport,
    section: SweepReportSection,
    noteId: string
): SweepReport => {
    const entries = report[section];
    if (!entries) return report;
    return { ...report, [section]: entries.filter((entry) => entry.noteId !== noteId) };
};
