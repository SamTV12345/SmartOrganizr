# Create Another — Musiknote / Ordner anlegen

**Status:** Designed, awaiting implementation
**Datum:** 2026-05-23
**Scope:** `ui/src/components/CreateFolderOrNote.tsx`

## Problem

Beim Anlegen mehrerer Musiknoten (oder Ordner) hintereinander muss aktuell jedes Mal das gesamte Formular neu ausgefüllt werden. Selbst bei nahezu identischen Einträgen — gleicher Komponist, gleicher Ordner, gleiche Seitenzahl — werden Felder nach dem Submit teilweise geleert. Der Submit-Dialog bleibt offen, ohne dass das visuell konsistent kommuniziert wird.

Ziel: Jira-Pattern „Create another". Eine Checkbox, mit der das Formular nach Submit 1:1 bestehen bleibt, sodass nur das Diff zur nächsten Note geändert werden muss.

## Aktueller Zustand

`CreateFolderOrNote.tsx` enthält eine Funktion `resetForNextEntry(createdType)`, die nach erfolgreichem Submit automatisch läuft:

- **Folder:** behält `parentId`, leert Rest.
- **Note:** behält `parentId` + `authorId` + `authorName`, leert Rest (Name, Beschreibung, Seitenzahl, ExtraInfo).

Der Dialog **schließt nicht**. Es gibt kein visuelles Feedback für „erfolgreich gespeichert". Es gibt keinen Opt-out — wer einen einzigen Eintrag anlegen will, muss aktiv schließen und sieht trotzdem ein halb-geleertes Formular.

## Lösung

### UI

Im `DialogFooter`, links neben den vorhandenen Buttons (`Abbrechen`, `Speichern`), eine Checkbox mit Label **„Weitere erstellen"**.

```
[ ] Weitere erstellen          [Abbrechen] [Speichern]
```

### State

- Lokaler `useState<boolean>` `createAnother` im Component.
- Initial gelesen aus `localStorage.getItem("createAnother:elements")` (parsed als boolean, Default `false`).
- Bei Toggle: `localStorage.setItem("createAnother:elements", String(value))` synchron.

### Verhalten nach erfolgreichem Submit

Die `onSuccess`-Callbacks von `createFolderMutation` und `createNoteMutation` rufen statt `resetForNextEntry` eine neue Funktion `handlePostSubmit(createdType)` auf, die je nach `createAnother` verzweigt:

| `createAnother` | Aktion |
|---|---|
| `true`  | Form-Felder bleiben **vollständig** unverändert (`form.reset` wird nicht aufgerufen). Nur `scannedPdfContent` und `scanError` werden auf Initial-Werte gesetzt (PDF-Anhang gehört zu genau einer Note). Fokus springt programmatisch ins Name-Input (`nameInputRef.current?.focus()`, danach `.select()`). Der Save-Button zeigt für 1.5s die Beschriftung **„✓ Gespeichert"** statt „Speichern" und ist während dieser Zeit nicht disabled. |
| `false` | Bestehende `closeAndResetForm()`-Funktion wird gerufen: Dialog schließt, Form wird komplett zurückgesetzt. |

### Scope

- Die Checkbox ist für beide Typen (Folder + Note) sichtbar. Verhalten identisch.
- Die alte `resetForNextEntry`-Funktion entfällt komplett (wird durch die neue `handlePostSubmit`-Logik ersetzt).

### Bestätigungs-Feedback

Statt einer neuen Toast-Library wird der bestehende `Speichern`-Button kurz umbeschriftet (1.5s lang) auf „✓ Gespeichert". Realisierung: lokaler `useState<boolean>` `justSaved`, der in `handlePostSubmit` bei `createAnother === true` auf `true` gesetzt und nach `setTimeout(..., 1500)` wieder auf `false` gesetzt wird. Beim erneuten Submit innerhalb des Zeitfensters wird der Timer überschrieben (`useRef<number>` für die Timer-ID, `clearTimeout` vor `setTimeout`).

### Fokus-Verwaltung

Ein neuer `useRef<HTMLInputElement>` `nameInputRef` wird an das Name-Feld gehängt. Im FormField muss das `Input` den Ref durchreichen — react-hook-form's `field` wird mit `{...field, ref: mergeRefs(field.ref, nameInputRef)}` kombiniert. Falls eine `mergeRefs`-Utility fehlt: inline Callback-Ref.

## Edge Cases

- **Author wurde inline neu angelegt** (`findOrCreateAuthorId` erzeugt einen neuen Author): `authorId` ist im Form-State jetzt der frisch erzeugte. Bleibt bei `createAnother` korrekt erhalten — kein Doppelcreate beim nächsten Submit, weil `authorId` befüllt ist und der Code-Pfad `!resolvedAuthorId` nicht mehr durchlaufen wird.
- **Type-Wechsel zwischen Folder/Note** während `createAnother` an ist: Submit erstellt z.B. eine Note. Form bleibt im Note-Schema. User schaltet auf Folder um → das Type-Feld ändert sich, react-hook-form behält irrelevante Felder im internen State, aber das Folder-Schema validiert nur die Folder-Felder. Kein zusätzlicher Code nötig.
- **localStorage nicht verfügbar** (Privacy-Modus, SSR): try/catch um die zwei Zugriffe; bei Fehler default `false`, kein Crash.
- **Submit-Fehler** (z.B. Author-Resolve schlägt fehl, Validation-Error): `onSuccess` läuft nicht → kein Reset, kein „✓ Gespeichert", kein Dialog-Close. Wie bisher.

## Was bewusst NICHT gemacht wird

- Kein zusätzlicher „Save & Create Another"-Button im Footer (User hat Checkbox-Variante gewählt).
- Kein per-Feld Pin/Unpin (Overengineering).
- Keine getrennte Konfiguration „Apply only to Notes" (Folder profitiert ebenso).
- Keine neue Toast-Library — der inline Button-Label-Wechsel ist ausreichend.

## Test-Plan (manuell)

1. Dialog öffnen, Type=Note, alle Felder ausfüllen, Checkbox an, Speichern.
   - Erwartet: Dialog bleibt offen, Felder unverändert, Save-Button kurz „✓ Gespeichert", Cursor im Name-Feld mit Selektion.
2. Direkt erneut Speichern (zweite Note mit gleichen Werten).
   - Erwartet: Backend antwortet 200, zweite Note in Tree sichtbar, Dialog weiter offen.
3. Checkbox aus, Speichern.
   - Erwartet: Dialog schließt, beim nächsten Öffnen ist Form leer (Folder-Default).
4. Page-Reload, Dialog erneut öffnen.
   - Erwartet: Checkbox-Zustand ist persistiert.
5. Type=Folder mit Checkbox an, Speichern, erneut Speichern.
   - Erwartet: Folder-Name bleibt im Feld, aber Backend wird beim zweiten Submit denselben Namen ablehnen (oder erlauben — je nach Backend-Validation; das Verhalten ist Backend-seitig, kein Spec-Concern hier).
6. Author inline neu anlegen mit Checkbox an, Speichern, erneut Speichern.
   - Erwartet: zweite Note bekommt denselben (existierenden) `authorId`, kein doppelt erzeugter Author.
