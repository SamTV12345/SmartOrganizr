import type {TreeNode, Folder, Note} from "@/src/api/types";

// ElementItem in the rest of the app means "a tree node": a folder with possibly-
// loaded children, or a note. The Folder branch carries an `elements` field that
// the backend does NOT return — it's filled in client-side by the lazy children
// fetch (`/v1/elements/{folderId}/children`).
export type ElementItem = TreeNode;


export const isNote = (element: ElementItem): element is Note => {
    return element && element.type === 'note';
}


export const isFolder = (element: ElementItem): element is Folder & { elements?: ElementItem[] } => {
    return element && element.type === 'folder';
}
