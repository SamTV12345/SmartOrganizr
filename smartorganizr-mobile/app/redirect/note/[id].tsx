import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { apiClient, initApiClient } from "@/api/ApiClient";
import { LOGIN_URL } from "@/api/constants";
import { Card } from "@/components/ui";
import { colors } from "@/components/theme";
import { Folder } from "@/api/types";

const resolveFolderPath = (parent: Folder | undefined) => {
  if (!parent) {
    return "-";
  }
  const visited = new Set<string>();
  const parts: string[] = [];
  let cursor: Folder | undefined = parent;

  while (cursor?.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    parts.unshift(cursor.name);
    cursor = cursor.parent;
  }

  return parts.length > 0 ? parts.join(" / ") : "-";
};

export default function NoteDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const noteId = String(params.id ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["note-detail", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      if (!apiClient) {
        await initApiClient();
      }
      const [detail, baseUrl] = await Promise.all([
        apiClient!.getNoteDetail(noteId),
        AsyncStorage.getItem(LOGIN_URL),
      ]);
      return { detail, baseUrl: baseUrl ?? "-" };
    },
  });

  const note = data?.detail.currentNote;
  const location = useMemo(() => resolveFolderPath(note?.parent), [note?.parent]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Notenblatt-Details</Text>
      <Text style={styles.subtitle}>
        {isLoading ? "Lade Detaildaten..." : note ? "Ablage und Referenzdaten fuer dieses Stueck." : "Kein Musikblatt gefunden."}
      </Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Titel</Text>
        <Text style={styles.value}>{note?.name ?? "-"}</Text>

        <Text style={styles.label}>Autor</Text>
        <Text style={styles.value}>{note?.author?.name ?? "-"}</Text>

        <Text style={styles.label}>Ablageort</Text>
        <Text style={styles.value}>{location}</Text>

        <Text style={styles.label}>Index im Ordner</Text>
        <Text style={styles.value}>{data?.detail.index ?? "-"}</Text>

        <Text style={styles.label}>SmartOrganizr URL</Text>
        <Text style={styles.value} numberOfLines={2}>
          {data?.baseUrl ?? "-"}
        </Text>
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
  },
  subtitle: {
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 12,
    fontSize: 14,
  },
  card: {
    gap: 6,
  },
  label: {
    marginTop: 8,
    color: colors.mutedForeground,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  value: {
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
});
