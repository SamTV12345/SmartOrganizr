import type { Author, Folder, Note } from "@/src/api/types";
import type { NoteDetail } from "@/src/models/NoteDetail";

export type OfflineElement = Folder | Note;

/** Root folders = those without a parent (mirrors GET /v1/elements/parentDecks). */
export function selectRootFolders(folders: Folder[]): Folder[] {
  return folders.filter((f) => !f.parent);
}

/** Children of a folder = folders + notes whose parent.id matches (mirrors FindNextChildren). */
export function selectChildren(folderId: string, folders: Folder[], notes: Note[]): OfflineElement[] {
  return [
    ...folders.filter((f) => f.parent?.id === folderId),
    ...notes.filter((n) => n.parent?.id === folderId),
  ];
}

function includesCI(haystack: string | undefined, q: string): boolean {
  return (haystack ?? "").toLowerCase().includes(q);
}

/** Case-insensitive substring match on name (mirrors server name LIKE '%q%'). */
export function filterAuthorsByName(authors: Author[], query: string): Author[] {
  const q = query.trim().toLowerCase();
  return q ? authors.filter((a) => includesCI(a.name, q)) : authors;
}

export function filterNotesByName(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  return q ? notes.filter((n) => includesCI(n.name, q)) : notes;
}

/** Build the note-detail view (current + prev/next sibling, ordered by name) from the local notes. */
export function selectNoteDetail(noteId: string, notes: Note[]): NoteDetail {
  const current = notes.find((n) => n.id === noteId);
  if (!current) {
    return { index: 0 } as NoteDetail;
  }
  const siblings = notes
    .filter((n) => n.parent?.id === current.parent?.id)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const idx = siblings.findIndex((n) => n.id === noteId);
  return {
    currentNote: current,
    previousNote: idx > 0 ? siblings[idx - 1] : undefined,
    nextNote: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined,
    index: idx,
  } as NoteDetail;
}
