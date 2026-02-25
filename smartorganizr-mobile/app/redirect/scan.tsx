import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Input } from "@/components/ui";
import { colors } from "@/components/theme";
import { extractNoteIdFromUrl } from "@/utils/note-link";

type NdefRecordLike = {
  tnf: number;
  type: unknown;
  payload: unknown;
};

type NfcModule = {
  Ndef: {
    TNF_WELL_KNOWN: number;
    uri: { decodePayload: (payload: Uint8Array) => string };
    text: { decodePayload: (payload: Uint8Array) => string };
  };
  NfcTech: { Ndef: string };
  default: {
    isSupported: () => Promise<boolean>;
    start: () => Promise<void>;
    requestTechnology: (tech: string) => Promise<void>;
    getTag: () => Promise<{ ndefMessage?: NdefRecordLike[] } | null>;
    cancelTechnologyRequest: () => Promise<void>;
  };
};

const bytes = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value.map((item) => Number(item) || 0));
  }
  return new Uint8Array();
};

const decodeRecordToText = (record: NdefRecordLike, ndef: NfcModule["Ndef"]): string | null => {
  try {
    const type = bytes(record.type);
    const payload = bytes(record.payload);
    const typeString = String.fromCharCode(...type);
    if (record.tnf === ndef.TNF_WELL_KNOWN && typeString === "U") {
      return ndef.uri.decodePayload(payload);
    }
    if (record.tnf === ndef.TNF_WELL_KNOWN && typeString === "T") {
      return ndef.text.decodePayload(payload);
    }
    return null;
  } catch {
    return null;
  }
};

export default function ScanScreen() {
  const [nfcModule, setNfcModule] = useState<NfcModule | null | undefined>(undefined);
  const [isSupported, setSupported] = useState<boolean | null>(null);
  const [isScanning, setScanning] = useState(false);
  const [lastPayload, setLastPayload] = useState("");
  const router = useRouter();

  useEffect(() => {
    import("react-native-nfc-manager")
      .then((module) => setNfcModule(module as unknown as NfcModule))
      .catch(() => setNfcModule(null));
  }, []);

  useEffect(() => {
    if (nfcModule === undefined) {
      return;
    }
    if (!nfcModule) {
      setSupported(false);
      return;
    }

    nfcModule.default.isSupported()
      .then((supported) => {
        setSupported(supported);
        if (supported) {
          return nfcModule.default.start();
        }
        return Promise.resolve();
      })
      .catch(() => setSupported(false));
  }, [nfcModule]);

  const startScan = async () => {
    if (!nfcModule || !isSupported) {
      Alert.alert("NFC nicht verfuegbar", "Dieses Geraet unterstuetzt NFC nicht.");
      return;
    }

    setScanning(true);
    try {
      await nfcModule.default.requestTechnology(nfcModule.NfcTech.Ndef);
      const tag = await nfcModule.default.getTag();
      const records = tag?.ndefMessage ?? [];
      const payload = records
        .map((record) => decodeRecordToText(record, nfcModule.Ndef))
        .find((value): value is string => !!value);

      if (!payload) {
        throw new Error("Kein URL/Text Record auf dem NFC Tag gefunden.");
      }

      setLastPayload(payload);
      const noteId = extractNoteIdFromUrl(payload);
      if (!noteId) {
        throw new Error("Aus der NFC URL konnte keine Noten-ID extrahiert werden.");
      }

      router.push({ pathname: "/redirect/note/[id]", params: { id: noteId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter NFC Fehler";
      Alert.alert("NFC Lesen fehlgeschlagen", message);
    } finally {
      setScanning(false);
      nfcModule.default.cancelTechnologyRequest().catch(() => undefined);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>NFC Scan</Text>
      <Text style={styles.subtitle}>NFC Tag einlesen, URL erkennen und direkt zur Noten-Detailansicht springen.</Text>
      {!nfcModule ? (
        <Text style={styles.warning}>
          NFC ist in Expo Go nicht verfuegbar. Bitte nutze einen Development Build (`npm run android`).
        </Text>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>
          {isSupported === null ? "Pruefe NFC..." : isSupported ? "NFC bereit" : "NFC wird auf diesem Geraet nicht unterstuetzt"}
        </Text>
        <Button title={isScanning ? "Warte auf NFC Tag..." : "NFC Tag scannen"} onPress={startScan} disabled={isScanning || !isSupported} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Zuletzt gelesene URL</Text>
        <Input value={lastPayload} editable={false} placeholder="Noch kein NFC Payload gelesen" />
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
    gap: 12,
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
  card: {
    gap: 10,
  },
  label: {
    color: colors.mutedForeground,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  value: {
    color: colors.foreground,
    fontSize: 14,
  },
  warning: {
    color: colors.accentDark,
    fontSize: 13,
  },
});
