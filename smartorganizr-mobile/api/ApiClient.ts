import { getNetworkStateAsync } from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCESS_TOKEN,
  FOLDERS_CACHE_KEY,
  FOLDERS_CACHE_UPDATED_AT,
  LOGIN_URL,
  NOTES_CACHE_KEY,
  NOTES_CACHE_UPDATED_AT,
  PUBLIC_CONFIG_KEY,
} from "@/api/constants";
import { ConfigModel, Folder, FolderResponse, Note, NoteDetail, NoteResponse } from "@/api/types";
import { ConfigModelValidation } from "@/api/validation";
import { ensureValidAccessToken } from "@/api/auth";
import { buildApiUrl, normalizeBaseUrl } from "@/api/url";

const mergeById = (existing: Note[], incoming: Note[]) => {
  const map = new Map<string, Note>();
  for (const note of existing) {
    map.set(note.id, note);
  }
  for (const note of incoming) {
    map.set(note.id, note);
  }
  return Array.from(map.values());
};

const filterOfflineNotes = (notes: Note[], search: string) => {
  if (!search.trim()) {
    return notes;
  }

  const needle = search.trim().toLowerCase();
  return notes.filter((note) => {
    const author = note.author?.name?.toLowerCase() ?? "";
    const name = note.name?.toLowerCase() ?? "";
    const folder = note.parent?.name?.toLowerCase() ?? "";
    return name.includes(needle) || author.includes(needle) || folder.includes(needle);
  });
};

const makeResponse = (notes: Note[]): NoteResponse => ({
  _embedded: {
    noteRepresentationModelList: notes,
  },
  page: {
    size: notes.length,
  },
});

const readCachedNotes = async (): Promise<Note[]> => {
  const raw = await AsyncStorage.getItem(NOTES_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedNotes = async (notes: Note[]) => {
  await AsyncStorage.multiSet([
    [NOTES_CACHE_KEY, JSON.stringify(notes)],
    [NOTES_CACHE_UPDATED_AT, String(Date.now())],
  ]);
};

const createCachedNoteDetail = async (noteId: string): Promise<NoteDetail | null> => {
  const notes = await readCachedNotes();
  const index = notes.findIndex((note) => note.id === noteId);
  if (index < 0) {
    return null;
  }

  return {
    index,
    currentNote: notes[index],
    previousNote: index > 0 ? notes[index - 1] : undefined,
    nextNote: index < notes.length - 1 ? notes[index + 1] : undefined,
  };
};

const readCachedFolders = async (): Promise<Folder[]> => {
  const raw = await AsyncStorage.getItem(FOLDERS_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Folder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedFolders = async (folders: Folder[]) => {
  await AsyncStorage.multiSet([
    [FOLDERS_CACHE_KEY, JSON.stringify(folders)],
    [FOLDERS_CACHE_UPDATED_AT, String(Date.now())],
  ]);
};

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async getPublicConfigUrl(): Promise<ConfigModel> {
    const networkState = await getNetworkStateAsync();
    if (!networkState.isConnected) {
      const config = await AsyncStorage.getItem(PUBLIC_CONFIG_KEY);
      if (!config) {
        throw new Error("No internet connection and no cached configuration available.");
      }
      return ConfigModelValidation.parse(JSON.parse(config));
    }

    const data = await fetch(buildApiUrl(this.baseUrl, "/public"));
    if (!data.ok) {
      throw new Error("Network response was not ok");
    }

    const configModel: ConfigModel = ConfigModelValidation.parse(await data.json());
    await AsyncStorage.setItem(PUBLIC_CONFIG_KEY, JSON.stringify(configModel));
    return configModel;
  }

  private async fetchNotesFromUrl(url: string): Promise<NoteResponse> {
    const response = await fetchWithAuth(this.baseUrl, url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    return response.json();
  }

  private async fetchNotesFromApi(noteName: string): Promise<NoteResponse> {
    const url = new URL(buildApiUrl(this.baseUrl, "/api/v1/elements/notes"));
    if (noteName.trim()) {
      url.searchParams.append("noteName", noteName.trim());
    }
    return this.fetchNotesFromUrl(url.toString());
  }

  private async fetchFoldersPage(page: number): Promise<FolderResponse> {
    const url = new URL(buildApiUrl(this.baseUrl, "/api/v1/elements/folders"));
    url.searchParams.append("page", String(page));
    return this.fetchWithFolderResponse(url.toString());
  }

  private async fetchWithFolderResponse(url: string): Promise<FolderResponse> {
    const response = await fetchWithAuth(this.baseUrl, url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    return response.json();
  }

  async syncNotesOfflineCache() {
    const online = await getNetworkStateAsync();
    if (!online.isConnected) {
      return;
    }

    const notes: Note[] = [];
    let nextUrl: string | null = buildApiUrl(this.baseUrl, "/api/v1/elements/notes");

    while (nextUrl) {
      const response = await this.fetchNotesFromUrl(nextUrl);
      notes.push(...(response._embedded?.noteRepresentationModelList ?? []));
      const next = response._links?.next?.href;
      nextUrl = next ? new URL(next, this.baseUrl).toString() : null;
    }

    await writeCachedNotes(mergeById([], notes));
    await this.syncFoldersOfflineCache();
  }

  async syncFoldersOfflineCache() {
    const online = await getNetworkStateAsync();
    if (!online.isConnected) {
      return;
    }

    const folders: Folder[] = [];
    let page = 0;

    while (true) {
      const response = await this.fetchFoldersPage(page);
      const batch = response._embedded?.elementRepresentationModelList ?? [];
      folders.push(...batch);
      const hasNext = !!response._links?.next?.href;
      if (!hasNext || batch.length === 0) {
        break;
      }
      page += 1;
    }

    await writeCachedFolders(folders);
  }

  async getAllFolders(): Promise<Folder[]> {
    const networkState = await getNetworkStateAsync();
    if (!networkState.isConnected) {
      return readCachedFolders();
    }

    try {
      await this.syncFoldersOfflineCache();
      return readCachedFolders();
    } catch {
      return readCachedFolders();
    }
  }

  async getAllNotes(noteName: string): Promise<NoteResponse> {
    const networkState = await getNetworkStateAsync();

    if (!networkState.isConnected) {
      const cachedNotes = await readCachedNotes();
      return makeResponse(filterOfflineNotes(cachedNotes, noteName));
    }

    try {
      const response = await this.fetchNotesFromApi(noteName);
      const notes = response._embedded?.noteRepresentationModelList ?? [];
      const cachedNotes = await readCachedNotes();
      await writeCachedNotes(noteName.trim() ? mergeById(cachedNotes, notes) : notes);
      return response;
    } catch {
      const cachedNotes = await readCachedNotes();
      if (cachedNotes.length > 0) {
        return makeResponse(filterOfflineNotes(cachedNotes, noteName));
      }
      throw new Error("Network request failed and there is no offline cache yet.");
    }
  }

  async getNoteDetail(noteId: string): Promise<NoteDetail> {
    const networkState = await getNetworkStateAsync();
    const url = buildApiUrl(this.baseUrl, `/api/v1/elements/notes/${noteId}`);

    if (!networkState.isConnected) {
      const cachedDetail = await createCachedNoteDetail(noteId);
      if (!cachedDetail) {
        throw new Error("Note not found in offline cache.");
      }
      return cachedDetail;
    }

    try {
      const response = await fetchWithAuth(this.baseUrl, url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const detail = (await response.json()) as NoteDetail;
      if (detail.currentNote) {
        const cachedNotes = await readCachedNotes();
        await writeCachedNotes(mergeById(cachedNotes, [detail.currentNote]));
      }
      return detail;
    } catch {
      const cachedDetail = await createCachedNoteDetail(noteId);
      if (!cachedDetail) {
        throw new Error("Note not found and network request failed.");
      }
      return cachedDetail;
    }
  }
}

export async function fetchWithAuth(baseUrl: string, input: RequestInfo, init: RequestInit = {}) {
  const token = await ensureValidAccessToken(baseUrl);
  const headers = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    const retriedToken = await ensureValidAccessToken(baseUrl);
    if (retriedToken && retriedToken !== token) {
      return fetch(input, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: `Bearer ${retriedToken}`,
        },
      });
    }
  }

  return response;
}

export let apiClient: ApiClient | undefined = undefined;

export const initApiClient = async () => {
  const url = await AsyncStorage.getItem(LOGIN_URL);
  if (!url) {
    throw new Error("No URL found in storage");
  }
  apiClient = new ApiClient(url);
};

export const setApiClient = (url: string) => {
  apiClient = new ApiClient(url);
};

export const getStoredAccessToken = async () => AsyncStorage.getItem(ACCESS_TOKEN);
