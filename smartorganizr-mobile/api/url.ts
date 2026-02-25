export const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const withTrailingSlash = (value: string) => {
  const normalized = normalizeBaseUrl(value);
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

export const buildApiUrl = (baseUrl: string, path: string) => {
  const safePath = path.replace(/^\/+/, "");
  return new URL(safePath, withTrailingSlash(baseUrl)).toString();
};

export const buildKeycloakRealmUrl = (authUrl: string, realm: string, path: string) => {
  const safePath = path.replace(/^\/+/, "");
  const safeRealm = realm.trim().replace(/^\/+|\/+$/g, "");
  return buildApiUrl(authUrl, `realms/${safeRealm}/${safePath}`);
};

