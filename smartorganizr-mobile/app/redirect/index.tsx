import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getNetworkStateAsync } from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { apiClient, initApiClient } from "@/api/ApiClient";
import { NOTES_CACHE_UPDATED_AT } from "@/api/constants";
import { Note } from "@/api/types";
import { Card, Input } from "@/components/ui";
import { colors } from "@/components/theme";

const resolveFolderPath = (note: Note) => {
  const names: string[] = [];
  const visited = new Set<string>();
  let folder: Note["parent"] | undefined = note.parent;

  while (folder?.id && !visited.has(folder.id)) {
    visited.add(folder.id);
    names.unshift(folder.name);
    folder = folder.parent;
  }

  return names.length > 0 ? names.join(" / ") : "Kein Ordnerpfad vorhanden";
};

export default function NotesScreen() {
  const router = useRouter();
  const [noteName, setNoteName] = useState("");
  const [isRefreshing, setRefreshing] = useState(false);
  const [isOffline, setOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const query = useQuery({
    queryKey: ["notes", noteName],
    queryFn: async () => {
      const network = await getNetworkStateAsync();
      setOffline(!network.isConnected);

      if (!apiClient) {
        await initApiClient();
      }

      return apiClient!.getAllNotes(noteName);
    },
  });

  const notes = useMemo(
    () => query.data?._embedded.noteRepresentationModelList ?? [],
    [query.data],
  );

  const syncOfflineCache = async () => {
    if (!apiClient) {
      await initApiClient();
    }

    setRefreshing(true);
    try {
      await apiClient!.syncNotesOfflineCache();
      const updatedAt = await AsyncStorage.getItem(NOTES_CACHE_UPDATED_AT);
      setLastSyncedAt(updatedAt ? new Date(Number(updatedAt)).toLocaleString() : "");
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    AsyncStorage.getItem(NOTES_CACHE_UPDATED_AT).then((updatedAt) => {
      setLastSyncedAt(updatedAt ? new Date(Number(updatedAt)).toLocaleString() : "");
    });
  }, [query.data]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Noten finden</Text>
        <Text style={styles.subtitle}>
          {isOffline
            ? "Offline-Modus: Ergebnisse kommen aus deinem lokalen Cache."
            : "Online: Daten werden mit dem Server synchronisiert."}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <Input
          style={styles.searchInput}
          value={noteName}
          onChangeText={setNoteName}
          placeholder="Nach Titel, Autor oder Ordner suchen"
        />
      </View>
      <View style={styles.syncBar}>
        <Text style={styles.syncInfo}>
          {lastSyncedAt ? `Letzter Sync: ${lastSyncedAt}` : "Noch kein Sync erfolgt"}
        </Text>
        <Pressable disabled={isRefreshing} onPress={syncOfflineCache} style={styles.syncLink}>
          <Text style={styles.syncLinkText}>{isRefreshing ? "Synchronisiere..." : "Jetzt synchronisieren"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={syncOfflineCache} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>Keine Noten gefunden</Text>
            <Text style={styles.emptyText}>
              Falls du offline bist, synchronisiere einmal online, damit die Daten lokal vorliegen.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: "/redirect/note/[id]", params: { id: item.id } })}>
            <Card style={styles.noteCard}>
              <Text style={styles.noteTitle}>{item.name}</Text>
              <Text style={styles.noteMeta}>Autor: {item.author?.name || "Unbekannt"}</Text>
              <Text style={styles.noteMeta}>Ablage: {resolveFolderPath(item)}</Text>
            </Card>
          </Pressable>
        )}
      />
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
  header: {
    marginBottom: 12,
    gap: 6,
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
  searchRow: {
    marginBottom: 8,
  },
  searchInput: {
    width: "100%",
  },
  syncBar: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  syncInfo: {
    flex: 1,
    color: colors.mutedForeground,
    fontSize: 12,
  },
  syncLink: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncLinkText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  noteCard: {
    gap: 8,
  },
  noteTitle: {
    color: colors.cardForeground,
    fontSize: 17,
    fontWeight: "600",
  },
  noteMeta: {
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 19,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 19,
  },
});
