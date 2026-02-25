const NOTE_ID_REGEX = /\/noteManagement\/notes\/([^/?#]+)/i;

export const extractNoteIdFromUrl = (input: string): string | null => {
  const value = input.trim();
  if (!value) {
    return null;
  }

  let maybeDecoded = value;
  try {
    maybeDecoded = decodeURIComponent(value);
  } catch {
    maybeDecoded = value;
  }
  const patternMatch = maybeDecoded.match(NOTE_ID_REGEX) ?? value.match(NOTE_ID_REGEX);
  if (patternMatch?.[1]) {
    return patternMatch[1];
  }

  try {
    const parsed = new URL(maybeDecoded);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const notesIndex = segments.findIndex((segment) => segment.toLowerCase() === "notes");
    if (notesIndex >= 0 && segments[notesIndex + 1]) {
      return segments[notesIndex + 1];
    }
    return segments.length > 0 ? segments[segments.length - 1] : null;
  } catch {
    const fallbackSegments = maybeDecoded.split("/").filter(Boolean);
    return fallbackSegments.length > 0 ? fallbackSegments[fallbackSegments.length - 1] : null;
  }
};
