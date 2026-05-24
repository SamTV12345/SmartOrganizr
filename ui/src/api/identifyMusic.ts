import { http } from "./client";

export interface MusicIdentification {
    title: string;
    composer: string;
    arranger?: string;
    confidence: number;
    notes?: string;
}

export interface IdentifyMusicRequest {
    imageBase64: string;
    mimeType?: string;
}

export async function identifyMusicFromImage(
    req: IdentifyMusicRequest,
): Promise<MusicIdentification> {
    const resp = await http.post<MusicIdentification>(
        `/api/v1/ai/identify-music`,
        req,
    );
    return resp.data;
}
