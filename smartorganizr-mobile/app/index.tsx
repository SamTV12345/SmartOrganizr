import { maybeCompleteAuthSession } from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DiscoveryDocument, makeRedirectUri, useAuthRequest } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { getNetworkStateAsync } from "expo-network";
import { apiClient, setApiClient } from "@/api/ApiClient";
import { ACCESS_TOKEN, LOGIN_URL, NOTES_CACHE_KEY, REFRESH_TOKEN } from "@/api/constants";
import { ensureValidAccessToken, storeTokenResponse } from "@/api/auth";
import { Button, Card, Input } from "@/components/ui";
import { colors } from "@/components/theme";
import { buildKeycloakRealmUrl, normalizeBaseUrl } from "@/api/url";

maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: "smartorganizrmobile" });

export default function Index() {
  const [url, setUrl] = useState("");
  const [discoveryConfig, setDiscoveryConfig] = useState<DiscoveryDocument | null>(null);
  const [isBootstrapping, setBootstrapping] = useState(true);
  const [shouldStartPrompt, setShouldStartPrompt] = useState(false);
  const router = useRouter();

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: "smartorganizr-frontend",
      scopes: ["openid", "email", "profile", "offline_access"],
      redirectUri,
    },
    discoveryConfig,
  );

  useEffect(() => {
    const bootstrap = async () => {
      const loginUrl = await AsyncStorage.getItem(LOGIN_URL);
      if (!loginUrl) {
        setBootstrapping(false);
        return;
      }

      const normalizedLoginUrl = normalizeBaseUrl(loginUrl);
      setUrl(normalizedLoginUrl);
      setApiClient(normalizedLoginUrl);

      try {
        const token = await ensureValidAccessToken(normalizedLoginUrl);
        if (token) {
          router.replace("/redirect");
          return;
        }

        const network = await getNetworkStateAsync();
        const [fallbackToken, refreshToken, cachedNotes] = await AsyncStorage.multiGet([
          ACCESS_TOKEN,
          REFRESH_TOKEN,
          NOTES_CACHE_KEY,
        ]);
        const hasOfflineSessionData = !!fallbackToken[1] || !!refreshToken[1] || !!cachedNotes[1];
        if (!network.isConnected && hasOfflineSessionData) {
          router.replace("/redirect");
          return;
        }
      } catch (error) {
        console.error("Session bootstrap failed:", error);
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, [router]);

  useEffect(() => {
    if (response?.type !== "success" || !request || !discoveryConfig?.tokenEndpoint) {
      return;
    }

    const exchangeCode = async () => {
      const { code } = response.params;
      const tokenResponse = await fetch(discoveryConfig.tokenEndpoint!, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: request.redirectUri,
          code_verifier: request.codeVerifier ?? "",
          client_id: request.clientId,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed (${tokenResponse.status})`);
      }

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        throw new Error("Token response does not include an access token.");
      }

      await storeTokenResponse(tokenData);
      router.replace("/redirect");
    };

    exchangeCode().catch((error) => {
      console.error("Auth flow failed", error);
      Alert.alert("Fehler", "Die Authentifizierung ist fehlgeschlagen. Bitte versuche es erneut.");
    });
  }, [discoveryConfig, request, response, router]);

  useEffect(() => {
    if (!shouldStartPrompt || !request || !discoveryConfig) {
      return;
    }

    promptAsync().catch((error) => {
      console.error("Prompt start failed", error);
      Alert.alert("Fehler", "Keycloak Login konnte nicht gestartet werden.");
    }).finally(() => setShouldStartPrompt(false));
  }, [discoveryConfig, promptAsync, request, shouldStartPrompt]);

  const handleSubmit = async () => {
    if (!url.trim()) {
      return;
    }

    try {
      const normalizedUrl = normalizeBaseUrl(url);
      setApiClient(normalizedUrl);
      const clientConfig = await apiClient!.getPublicConfigUrl();
      const discoveryEndpoint: DiscoveryDocument = {
        authorizationEndpoint: buildKeycloakRealmUrl(
          clientConfig.url,
          clientConfig.realm,
          "/protocol/openid-connect/auth",
        ),
        tokenEndpoint: buildKeycloakRealmUrl(
          clientConfig.url,
          clientConfig.realm,
          "/protocol/openid-connect/token",
        ),
        revocationEndpoint: buildKeycloakRealmUrl(
          clientConfig.url,
          clientConfig.realm,
          "/protocol/openid-connect/revoke",
        ),
      };
      setDiscoveryConfig(discoveryEndpoint);
      await AsyncStorage.setItem(LOGIN_URL, normalizedUrl);
      setUrl(normalizedUrl);
      setShouldStartPrompt(true);
    } catch (error) {
      console.error("Login initialization failed", error);
      Alert.alert("Fehler", "Die eingegebene URL ist ungueltig oder der Server ist nicht erreichbar.");
    }
  };

  const canSubmit = useMemo(() => !!url.trim() && !isBootstrapping, [isBootstrapping, url]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/images/icon.png")} style={styles.logo} />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brand}>SmartOrganizr</Text>
            <Text style={styles.brandSub}>Mobile</Text>
          </View>
        </View>
        <Card style={styles.card}>
          <Text style={styles.eyebrow}>Anmeldung</Text>
          <Text style={styles.title}>Mit SmartOrganizr verbinden</Text>
          <Text style={styles.subtitle}>
            Einmal anmelden, danach bleibt deine Session per Offline-Token aktiv.
          </Text>
          <Input
            style={styles.input}
            placeholder="https://dein-smartorganizr.de"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Button
            disabled={!canSubmit}
            onPress={handleSubmit}
            title={isBootstrapping ? "Session wird geprueft..." : "Weiter zu Keycloak"}
          />
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 2,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentDark,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  brandTextWrap: {
    gap: 2,
  },
  brand: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "700",
  },
  brandSub: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    gap: 12,
  },
  eyebrow: {
    color: colors.mutedForeground,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginTop: 6,
  },
});
