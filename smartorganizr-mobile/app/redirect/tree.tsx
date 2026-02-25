import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiClient, initApiClient } from "@/api/ApiClient";
import { Folder, Note } from "@/api/types";
import { Card } from "@/components/ui";
import { colors } from "@/components/theme";

type TreeNode = {
  id: string;
  label: string;
  type: "folder" | "note";
  children: TreeNode[];
};

const buildTree = (folders: Folder[], notes: Note[]): TreeNode[] => {
  const nodesById = new Map<string, TreeNode>();
  const childrenByParent = new Map<string, string[]>();
  const rootIds: string[] = [];

  for (const folder of folders) {
    nodesById.set(folder.id, {
      id: folder.id,
      label: folder.name,
      type: "folder",
      children: [],
    });
  }

  for (const folder of folders) {
    const parentId = folder.parent?.id;
    if (parentId && nodesById.has(parentId)) {
      const entries = childrenByParent.get(parentId) ?? [];
      entries.push(folder.id);
      childrenByParent.set(parentId, entries);
    } else {
      rootIds.push(folder.id);
    }
  }

  for (const note of notes) {
    const parentId = note.parent?.id;
    if (!parentId) {
      continue;
    }
    const parentNode = nodesById.get(parentId);
    if (!parentNode) {
      continue;
    }
    parentNode.children.push({
      id: note.id,
      label: note.name,
      type: "note",
      children: [],
    });
  }

  const attachChildren = (folderId: string): TreeNode => {
    const folderNode = nodesById.get(folderId)!;
    const childFolderIds = childrenByParent.get(folderId) ?? [];
    const folderChildren = childFolderIds.map(attachChildren);
    return {
      ...folderNode,
      children: [...folderChildren, ...folderNode.children].sort((a, b) => a.label.localeCompare(b.label)),
    };
  };

  return rootIds.map(attachChildren).sort((a, b) => a.label.localeCompare(b.label));
};

const flattenTree = (nodes: TreeNode[], expanded: Set<string>, depth = 0): { node: TreeNode; depth: number }[] => {
  const items: { node: TreeNode; depth: number }[] = [];
  for (const node of nodes) {
    items.push({ node, depth });
    if (node.type === "folder" && expanded.has(node.id)) {
      items.push(...flattenTree(node.children, expanded, depth + 1));
    }
  }
  return items;
};

export default function TreeScreen() {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["tree-data"],
    queryFn: async () => {
      if (!apiClient) {
        await initApiClient();
      }
      const [folders, notesResponse] = await Promise.all([apiClient!.getAllFolders(), apiClient!.getAllNotes("")]);
      return { folders, notes: notesResponse._embedded?.noteRepresentationModelList ?? [] };
    },
  });

  const tree = useMemo(() => buildTree(query.data?.folders ?? [], query.data?.notes ?? []), [query.data]);
  const rows = useMemo(() => flattenTree(tree, expandedIds), [expandedIds, tree]);

  const toggleFolder = (node: TreeNode) => {
    if (node.type !== "folder") {
      return;
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Baumansicht</Text>
      <Text style={styles.subtitle}>Ordner und Noten in einer aufklappbaren Struktur.</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.node.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>Keine Daten im Baum</Text>
            <Text style={styles.emptyText}>Einmal online synchronisieren, dann steht die Struktur auch offline bereit.</Text>
          </Card>
        }
        renderItem={({ item }) => {
          const isFolder = item.node.type === "folder";
          const isExpanded = expandedIds.has(item.node.id);
          return (
            <Pressable
              onPress={() => {
                if (isFolder) {
                  toggleFolder(item.node);
                } else {
                  router.push({ pathname: "/redirect/note/[id]", params: { id: item.node.id } });
                }
              }}
              style={[styles.row, { paddingLeft: 12 + item.depth * 16 }]}
            >
              <Text style={styles.icon}>{isFolder ? (isExpanded ? "▾" : "▸") : "♪"}</Text>
              <Text style={isFolder ? styles.folderText : styles.noteText}>{item.node.label}</Text>
            </Pressable>
          );
        }}
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
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 12,
  },
  list: {
    paddingBottom: 16,
  },
  row: {
    minHeight: 40,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 18,
    color: colors.mutedForeground,
    fontSize: 14,
    textAlign: "center",
  },
  folderText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  noteText: {
    color: colors.mutedForeground,
    fontSize: 14,
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
