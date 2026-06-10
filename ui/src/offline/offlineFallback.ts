import { searchAuthors, searchNotes, getRootFolders, getChildren, getNoteDetail } from "./offlineDb";

function pageJson(key: "authorRepresentationModelList" | "noteRepresentationModelList", items: unknown[]) {
  return {
    _embedded: { [key]: items },
    page: { size: items.length, totalElements: items.length, totalPages: 1, number: 0 },
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

/** Synthesize an openapi-fetch ($api) GET response from IndexedDB; undefined if the path isn't offline-served. */
export async function buildOfflineApiResponse(url: URL): Promise<Response | undefined> {
  const p = url.pathname;
  if (p.endsWith("/v1/authors")) {
    return jsonResponse(pageJson("authorRepresentationModelList", await searchAuthors(url.searchParams.get("name") ?? "")));
  }
  if (p.endsWith("/v1/elements/parentDecks")) {
    return jsonResponse(await getRootFolders());
  }
  const noteDetail = p.match(/\/v1\/elements\/notes\/([^/]+)$/);
  if (noteDetail) {
    return jsonResponse(await getNoteDetail(decodeURIComponent(noteDetail[1])));
  }
  return undefined;
}

type HttpLike = { data: unknown; status: number; headers: Headers };

/** Synthesize an http-shim GET response from IndexedDB; undefined if the path isn't offline-served. */
export async function buildOfflineHttpResponse(rawUrl: string): Promise<HttpLike | undefined> {
  const url = new URL(rawUrl, "http://localhost");
  const p = url.pathname;
  const children = p.match(/\/v1\/elements\/([^/]+)\/children$/);
  if (children) {
    return { data: await getChildren(decodeURIComponent(children[1])), status: 200, headers: new Headers() };
  }
  if (p.endsWith("/v1/elements/notes")) {
    return { data: pageJson("noteRepresentationModelList", await searchNotes(url.searchParams.get("noteName") ?? "")), status: 200, headers: new Headers() };
  }
  return undefined;
}
