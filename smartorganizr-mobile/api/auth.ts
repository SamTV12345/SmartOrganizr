import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNetworkStateAsync } from "expo-network";
import { jwtDecode } from "jwt-decode";
import {
  ACCESS_TOKEN,
  ACCESS_TOKEN_EXPIRES_AT,
  PUBLIC_CONFIG_KEY,
  REFRESH_TOKEN,
} from "@/api/constants";
import { ConfigModel } from "@/api/types";
import { ConfigModelValidation } from "@/api/validation";
import { buildApiUrl, buildKeycloakRealmUrl, normalizeBaseUrl } from "@/api/url";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
};

const EXPIRY_SAFETY_SECONDS = 30;

const getAccessExpiryFromJwt = (accessToken: string): number | null => {
  try {
    const decoded: { exp?: number } = jwtDecode(accessToken);
    return decoded.exp ?? null;
  } catch {
    return null;
  }
};

export const storeTokenResponse = async (tokenResponse: TokenResponse) => {
  const now = Math.floor(Date.now() / 1000);
  const jwtExp = getAccessExpiryFromJwt(tokenResponse.access_token);
  const fallbackExp = tokenResponse.expires_in ? now + tokenResponse.expires_in : now + 300;
  const accessExpiresAt = jwtExp ?? fallbackExp;

  const values: [string, string][] = [
    [ACCESS_TOKEN, tokenResponse.access_token],
    [ACCESS_TOKEN_EXPIRES_AT, String(accessExpiresAt)],
  ];

  if (tokenResponse.refresh_token) {
    values.push([REFRESH_TOKEN, tokenResponse.refresh_token]);
  }

  await AsyncStorage.multiSet(values);
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove([ACCESS_TOKEN, ACCESS_TOKEN_EXPIRES_AT, REFRESH_TOKEN]);
};

const isTokenFresh = async (): Promise<boolean> => {
  const [token, expiry] = await AsyncStorage.multiGet([ACCESS_TOKEN, ACCESS_TOKEN_EXPIRES_AT]);
  if (!token[1] || !expiry[1]) {
    return false;
  }

  const expiresAt = Number(expiry[1]);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return expiresAt - EXPIRY_SAFETY_SECONDS > now;
};

const getStoredConfig = async (): Promise<ConfigModel | null> => {
  const raw = await AsyncStorage.getItem(PUBLIC_CONFIG_KEY);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  return ConfigModelValidation.parse(parsed);
};

const getConfig = async (baseUrl: string): Promise<ConfigModel | null> => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const network = await getNetworkStateAsync();
  if (!network.isConnected) {
    return getStoredConfig();
  }

  const response = await fetch(buildApiUrl(normalizedBaseUrl, "/public"));
  if (!response.ok) {
    return getStoredConfig();
  }

  const config = ConfigModelValidation.parse(await response.json());
  await AsyncStorage.setItem(PUBLIC_CONFIG_KEY, JSON.stringify(config));
  return config;
};

export const ensureValidAccessToken = async (baseUrl: string): Promise<string | null> => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (await isTokenFresh()) {
    return AsyncStorage.getItem(ACCESS_TOKEN);
  }

  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN);
  if (!refreshToken) {
    return null;
  }

  const network = await getNetworkStateAsync();
  if (!network.isConnected) {
    return null;
  }

  const config = await getConfig(normalizedBaseUrl);
  if (!config) {
    return null;
  }

  const tokenEndpoint = buildKeycloakRealmUrl(
    config.url,
    config.realm,
    "/protocol/openid-connect/token",
  );
  const refreshResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
    }).toString(),
  });

  if (!refreshResponse.ok) {
    await clearTokens();
    return null;
  }

  const tokenPayload: TokenResponse = await refreshResponse.json();
  if (!tokenPayload.access_token) {
    await clearTokens();
    return null;
  }

  await storeTokenResponse(tokenPayload);
  return tokenPayload.access_token;
};
