import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { clearTokens } from "@/api/auth";
import {
  ACCESS_TOKEN,
  ACCESS_TOKEN_EXPIRES_AT,
  FOLDERS_CACHE_KEY,
  FOLDERS_CACHE_UPDATED_AT,
  LOGIN_URL,
  NOTES_CACHE_KEY,
  NOTES_CACHE_UPDATED_AT,
  PUBLIC_CONFIG_KEY,
  REFRESH_TOKEN,
} from "@/api/constants";
import { Button, Card, Input } from "@/components/ui";
import { colors } from "@/components/theme";

export default function SettingsScreen() {
  const [loginUrl, setLoginUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(LOGIN_URL).then((value) => setLoginUrl(value ?? ""));
  }, []);

  const handleLogout = async () => {
    try {
      await clearTokens();
      await AsyncStorage.multiRemove([
        ACCESS_TOKEN,
        ACCESS_TOKEN_EXPIRES_AT,
        REFRESH_TOKEN,
        LOGIN_URL,
        PUBLIC_CONFIG_KEY,
        NOTES_CACHE_KEY,
        NOTES_CACHE_UPDATED_AT,
        FOLDERS_CACHE_KEY,
        FOLDERS_CACHE_UPDATED_AT,
      ]);
      router.replace("/");
    } catch (error) {
      console.error("Logout failed", error);
      Alert.alert("Fehler", "Abmelden ist fehlgeschlagen.");
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Einstellungen</Text>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Konto</Text>
        <Text style={styles.cardText}>
          Melde dich vom aktuellen SmartOrganizr ab und gehe zur URL-Eingabe zurueck.
        </Text>
        <Text style={styles.urlLabel}>Aktuelle SmartOrganizr URL</Text>
        <Input editable={false} value={loginUrl} placeholder="Keine URL gespeichert" />
        <Button title="Abmelden" onPress={handleLogout} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 18,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    gap: 10,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
  cardText: {
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
  },
  urlLabel: {
    marginTop: 4,
    color: colors.mutedForeground,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
});
