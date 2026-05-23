// Friendly aliases for the generated OpenAPI schemas. The end-to-end-type-safety
// contract lives here: every model the frontend renders should come from this file
// (and therefore from the backend swag annotations), not a hand-written mirror.
//
// Fields are optional because swag has no notion of "required" on Go struct tags.
// Treat them as the truth — at runtime the values are usually populated, but the
// type forces consumers to acknowledge that (?? "" defaults, guards, etc.).

import type { components } from "./schema";

type Schemas = components["schemas"];

export type Folder = Schemas["dto.Folder"];
export type Author = Schemas["dto.Author"];
export type AuthorPatchDto = Schemas["dto.AuthorPatchDto"];
export type AuthorCreateDto = Schemas["dto.AuthorCreateDto"];
export type Note = Schemas["dto.Note"];
export type NotePostDto = Schemas["dto.NotePostDto"];
export type NoteDetail = Schemas["dto.NoteDetailResponse"];
export type Concert = Schemas["dto.ConcertDto"];
export type ConcertPostDto = Schemas["dto.ConcertPostDto"];
export type NoteInConcert = Schemas["dto.NoteInConcertDto"];
export type User = Schemas["dto.User"];
export type UserPatchDto = Schemas["dto.UserPatchDto"];
export type FolderPostDto = Schemas["dto.FolderPostDto"];
export type FolderPatchDto = Schemas["dto.FolderPatchDto"];
export type IcalSync = Schemas["dto.IcalSyncDto"];
export type KeycloakModel = Schemas["dto.KeycloakModel"];
export type Event = Schemas["dto.Event"];

export type Club = Schemas["dto.ClubDto"];
export type ClubPostDto = Schemas["dto.ClubPostDto"];
export type ClubMember = Schemas["dto.ClubMemberDto"];
export type ClubPermissions = Schemas["dto.ClubPermissionsDto"];
export type ClubInviteResult = Schemas["dto.ClubInviteResultDto"];
export type ClubInvitationPublic = Schemas["dto.ClubInvitationPublicDto"];
export type ClubInvitationComplete = Schemas["dto.ClubInvitationCompleteDto"];
export type ClubMessageCandidate = Schemas["dto.ClubMessageCandidateDto"];
export type ClubChatSummary = Schemas["dto.ClubChatSummaryDto"];
export type ClubChatMessage = Schemas["dto.ClubChatMessageDto"];
export type ClubChatCreated = Schemas["dto.ClubChatCreatedDto"];
export type ClubChatCreate = Schemas["dto.ClubChatCreateDto"];
export type ClubChatPostMessage = Schemas["dto.ClubChatPostMessageDto"];
export type ClubInvitePost = Schemas["dto.ClubInvitePostDto"];
export type ClubMemberRolePatch = Schemas["dto.ClubMemberRolePatchDto"];

// TreeNode is a frontend-only shape: a Folder annotated with its lazily-loaded
// children. The schema doesn't carry `elements` (the children come from a
// separate /children endpoint), so we extend Folder here instead of forcing the
// server to send an empty array on every response.
export type TreeNode = (Folder & { elements?: TreeNode[] }) | Note;

export type PagedAuthorList = Schemas["dto.PagedAuthorRepresentationModelList"];
export type PagedNoteList = Schemas["dto.PagedNoteRepresentationModelList"];
export type PagedFolderList = Schemas["dto.PagedFolderRepresentationModelList"];
export type Page = Schemas["dto.Page"];

// requireField narrows a schema-optional field to its non-null shape, throwing
// loudly if the backend ever forgets to populate it. Use it sparingly at the
// boundary between the API response and the rest of the app — never as a silent
// `??` default that could hide a bug.
export const req = <T>(value: T | null | undefined, name = "field"): T => {
    if (value === undefined || value === null) {
        throw new Error(`Expected '${name}' to be present in API response`);
    }
    return value;
};
