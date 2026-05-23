import type { Note, NotePostDto } from "@/src/api/types";

export type NoteItem = Note;
export type { NotePostDto };

// The backend's UpdateNote endpoint accepts the same shape as CreateNote
// (dto.NotePostDto), so NotePutDto is just an alias here.
export type NotePutDto = NotePostDto;
