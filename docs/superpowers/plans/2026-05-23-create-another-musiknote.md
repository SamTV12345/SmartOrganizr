# Create Another — Musiknote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jira-style „Weitere erstellen"-Checkbox im CreateFolderOrNote-Dialog, die nach Submit alle Felder 1:1 stehen lässt und das Name-Feld fokussiert.

**Architecture:** Single-file change in `ui/src/components/CreateFolderOrNote.tsx`. Lokaler State `createAnother` (persistiert in localStorage), `justSaved` für Button-Label-Feedback, `nameInputRef` für Auto-Fokus. Bestehendes `resetForNextEntry` wird durch `handlePostSubmit` ersetzt, das je nach Checkbox-Zustand entweder Form intakt lässt + fokussiert oder Dialog schließt.

**Tech Stack:** React 19 (refs as props, kein `forwardRef` nötig), react-hook-form (Field-Ref muss mit lokalem Ref gemerget werden via Callback-Ref), Base UI Checkbox aus `@/components/ui/checkbox`.

**Spec:** `docs/superpowers/specs/2026-05-23-create-another-musiknote-design.md`

**Verifikation:** Manuell im Browser. Es gibt keine Frontend-Unit-Tests im Projekt.

---

### Task 1: Imports und State für createAnother + Persistenz

**Files:**
- Modify: `ui/src/components/CreateFolderOrNote.tsx`

- [ ] **Step 1: Checkbox-Import und useRef ergänzen**

Imports am Dateikopf erweitern. `useRef` ist evtl. schon importiert — prüfen und gegebenenfalls dazunehmen. `Checkbox` ist neu.

Vor:
```tsx
import { useRef, useState, type ChangeEvent } from "react";
```

Nach (falls nicht schon so):
```tsx
import { useEffect, useRef, useState, type ChangeEvent } from "react";
```

Und im Block der UI-Komponenten-Imports (nach dem `RadioGroup`-Import):
```tsx
import { Checkbox } from "@/components/ui/checkbox";
```

- [ ] **Step 2: localStorage-Key als Modulkonstante**

Direkt unter den `NOTE_DEFAULTS`/`FOLDER_DEFAULTS`-Blöcken (vor dem `API helpers`-Kommentar) einfügen:

```tsx
const CREATE_ANOTHER_STORAGE_KEY = "createAnother:elements";

const readCreateAnother = (): boolean => {
    try {
        return localStorage.getItem(CREATE_ANOTHER_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

const writeCreateAnother = (value: boolean): void => {
    try {
        localStorage.setItem(CREATE_ANOTHER_STORAGE_KEY, String(value));
    } catch {
        // localStorage unavailable (privacy mode, SSR) — silently ignore
    }
};
```

- [ ] **Step 3: State im Component anlegen**

In der `CreateFolderOrNote`-Komponente direkt nach dem bestehenden `const [scannedPdfContent, setScannedPdfContent] = useState("");` einfügen:

```tsx
const [createAnother, setCreateAnotherState] = useState<boolean>(readCreateAnother);
const [justSaved, setJustSaved] = useState(false);
const justSavedTimerRef = useRef<number | null>(null);
const nameInputRef = useRef<HTMLInputElement | null>(null);

const setCreateAnother = (value: boolean) => {
    setCreateAnotherState(value);
    writeCreateAnother(value);
};
```

- [ ] **Step 4: Cleanup-Effect für Timer**

Direkt unter dem State-Block aus Step 3:

```tsx
useEffect(() => {
    return () => {
        if (justSavedTimerRef.current !== null) {
            window.clearTimeout(justSavedTimerRef.current);
        }
    };
}, []);
```

Verhindert, dass ein noch laufender 1.5s-Timer nach Unmount auf gestoppten State zugreift.

- [ ] **Step 5: Verifikation — Build läuft durch**

Run: `cd ui && pnpm tsc --noEmit`
Expected: Keine TypeScript-Fehler.

- [ ] **Step 6: Commit**

```bash
git add ui/src/components/CreateFolderOrNote.tsx
git commit -m "feat(ui): add createAnother state + localStorage persistence"
```

---

### Task 2: Checkbox in DialogFooter rendern

**Files:**
- Modify: `ui/src/components/CreateFolderOrNote.tsx` (Render-Block, im `DialogFooter`)

- [ ] **Step 1: DialogFooter umstrukturieren**

Aktueller Code (etwa Zeile 605–624):

```tsx
<DialogFooter>
    <DialogClose
        render={
            <Button
                type="button"
                variant="secondary"
                onClick={closeAndResetForm}
            />
        }
    >
        {t("cancel")}
    </DialogClose>

    <Button type="submit" disabled={isPending}>
        {isPending && (
            <Loader className="mr-2 animate-spin" />
        )}
        {t("save")}
    </Button>
</DialogFooter>
```

Ersetzen durch:

```tsx
<DialogFooter className="sm:justify-between">
    <label className="flex items-center gap-2 text-sm">
        <Checkbox
            checked={createAnother}
            onCheckedChange={(checked) => setCreateAnother(checked === true)}
        />
        Weitere erstellen
    </label>

    <div className="flex gap-2">
        <DialogClose
            render={
                <Button
                    type="button"
                    variant="secondary"
                    onClick={closeAndResetForm}
                />
            }
        >
            {t("cancel")}
        </DialogClose>

        <Button type="submit" disabled={isPending}>
            {isPending && (
                <Loader className="mr-2 animate-spin" />
            )}
            {justSaved ? "✓ Gespeichert" : t("save")}
        </Button>
    </div>
</DialogFooter>
```

Hinweise:
- `sm:justify-between` ist nötig, weil `DialogFooter` in `ui/components/ui/dialog.tsx` per Default `sm:justify-end` setzt — wir wollen die Checkbox links.
- Falls Base UI's Checkbox `onCheckedChange` mit `boolean | "indeterminate"` typisiert ist, fängt der `checked === true`-Check das ab.
- Save-Button-Label wechselt bereits hier zwischen `justSaved` und `t("save")` — die Logik, die `justSaved` setzt, kommt in Task 4.

- [ ] **Step 2: Verifikation — Dev-Server starten und Dialog öffnen**

Run: `cd ui && pnpm dev` (in einem separaten Terminal)
Browser: http://localhost:5173/ui → Tree-View → `+`-Button rechts oben.

Expected:
- Dialog öffnet sich.
- Im Footer links: Checkbox „Weitere erstellen", nicht angehakt.
- Rechts: gewohnt „Abbrechen" und „Speichern".
- Checkbox lässt sich an/aus klicken.
- Page-Reload → Dialog erneut öffnen → Checkbox-Zustand ist persistiert.

- [ ] **Step 3: Commit**

```bash
git add ui/src/components/CreateFolderOrNote.tsx
git commit -m "feat(ui): add 'Weitere erstellen' checkbox to create dialog footer"
```

---

### Task 3: nameInputRef ans Name-Feld plumben

**Files:**
- Modify: `ui/src/components/CreateFolderOrNote.tsx` (das `name`-`FormField`)

- [ ] **Step 1: Ref ins Name-Input einbinden**

Aktueller Code (etwa Zeile 477–489):

```tsx
{/* NAME */}
<FormField
    control={form.control}
    name="name"
    render={({ field }) => (
        <FormItem>
            <FormLabel>{t("name")}</FormLabel>
            <FormControl>
                <Input {...field} />
            </FormControl>
            <FormMessage />
        </FormItem>
    )}
/>
```

Ersetzen durch:

```tsx
{/* NAME */}
<FormField
    control={form.control}
    name="name"
    render={({ field }) => (
        <FormItem>
            <FormLabel>{t("name")}</FormLabel>
            <FormControl>
                <Input
                    {...field}
                    ref={(el) => {
                        field.ref(el);
                        nameInputRef.current = el;
                    }}
                />
            </FormControl>
            <FormMessage />
        </FormItem>
    )}
/>
```

Hintergrund: React 19 reicht `ref` als normale Prop durch — kein `forwardRef` nötig. react-hook-form will den Ref aber selbst halten (für `setFocus` etc.), also über Callback-Ref beides bedienen.

- [ ] **Step 2: Verifikation — Build prüfen**

Run: `cd ui && pnpm tsc --noEmit`
Expected: Keine TS-Fehler. Insbesondere darf der Callback-Ref-Pfad kein Type-Issue ergeben (`field.ref` ist `(instance) => void` aus react-hook-form, akzeptiert `HTMLInputElement | null`).

- [ ] **Step 3: Commit**

```bash
git add ui/src/components/CreateFolderOrNote.tsx
git commit -m "feat(ui): wire nameInputRef through Name field"
```

---

### Task 4: resetForNextEntry durch handlePostSubmit ersetzen

**Files:**
- Modify: `ui/src/components/CreateFolderOrNote.tsx` (Funktionsdefinition + beide `onSuccess`-Callbacks)

- [ ] **Step 1: resetForNextEntry entfernen, handlePostSubmit hinzufügen**

Aktueller Code (etwa Zeile 184–203):

```tsx
const resetForNextEntry = (createdType: "folder" | "note") => {
    const parentId = form.getValues("parentId");
    setScanError(null);
    setScannedPdfContent("");

    if (createdType === "folder") {
        form.reset({ ...FOLDER_DEFAULTS, parentId: parentId ?? "" });
    } else {
        const currentValues = form.getValues() as Extract<
            FormValues,
            { type: "note" }
        >;
        form.reset({
            ...NOTE_DEFAULTS,
            parentId: parentId ?? "",
            authorId: currentValues.authorId ?? "",
            authorName: currentValues.authorName ?? "",
        });
    }
};
```

Komplett ersetzen durch:

```tsx
const flashJustSaved = () => {
    setJustSaved(true);
    if (justSavedTimerRef.current !== null) {
        window.clearTimeout(justSavedTimerRef.current);
    }
    justSavedTimerRef.current = window.setTimeout(() => {
        setJustSaved(false);
        justSavedTimerRef.current = null;
    }, 1500);
};

const handlePostSubmit = () => {
    setScanError(null);
    setScannedPdfContent("");

    if (createAnother) {
        flashJustSaved();
        // Form-Werte bleiben unverändert. Fokus aufs Name-Feld + Selektion.
        window.setTimeout(() => {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }, 0);
        return;
    }

    closeAndResetForm();
};
```

Begründung `setTimeout(..., 0)` für Fokus: react-hook-form führt nach `mutate` ggf. noch interne State-Updates aus, die einen direkten `focus()`-Aufruf neutralisieren könnten. Eine Mikrotask-Verzögerung garantiert, dass der Fokus nach dem Render landet.

- [ ] **Step 2: onSuccess der beiden Mutations umschreiben**

Aktueller Code (etwa Zeile 219–235):

```tsx
const createFolderMutation = useMutation<FolderItem, Error, FolderPostDto>(
    {
        mutationFn: createFolder,
        onSuccess: (data) => {
            updateCache(data);
            resetForNextEntry("folder");
        },
    }
);

const createNoteMutation = useMutation<NoteItem, Error, NotePostDto>({
    mutationFn: createNote,
    onSuccess: (data) => {
        updateCache(data);
        resetForNextEntry("note");
    },
});
```

Ersetzen durch:

```tsx
const createFolderMutation = useMutation<FolderItem, Error, FolderPostDto>(
    {
        mutationFn: createFolder,
        onSuccess: (data) => {
            updateCache(data);
            handlePostSubmit();
        },
    }
);

const createNoteMutation = useMutation<NoteItem, Error, NotePostDto>({
    mutationFn: createNote,
    onSuccess: (data) => {
        updateCache(data);
        handlePostSubmit();
    },
});
```

- [ ] **Step 3: Verifikation — Build**

Run: `cd ui && pnpm tsc --noEmit`
Expected: Keine TS-Fehler. Insbesondere keine „resetForNextEntry is not defined" — sollte komplett ersetzt sein.

Run: `grep -n "resetForNextEntry" ui/src/components/CreateFolderOrNote.tsx`
Expected: Keine Treffer.

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/CreateFolderOrNote.tsx
git commit -m "feat(ui): replace resetForNextEntry with handlePostSubmit"
```

---

### Task 5: Manuelle Verifikation gemäß Test-Plan

**Files:** Keine Änderung — Browser-Verifikation.

Dev-Server muss laufen (`cd ui && pnpm dev`). Backend ebenfalls (`cd api_go && go run .` oder gewohnter Start).

- [ ] **Step 1: Test 1 — Note mit Checkbox an, 1:1-Preservation**

1. Browser → Tree-View → `+`-Button.
2. Type = Musiknote, alle Felder ausfüllen (Name „TestSonate", Beschreibung, Seiten=3, Autor, Parent-Ordner).
3. Checkbox „Weitere erstellen" anhaken.
4. Speichern.

Expected:
- Dialog bleibt offen.
- Alle Felder unverändert.
- Save-Button-Label kurz (~1.5s) auf „✓ Gespeichert", danach wieder „Speichern".
- Cursor blinkt im Name-Feld, Text „TestSonate" ist selektiert.
- Im Tree taucht „TestSonate" auf.

- [ ] **Step 2: Test 2 — Sofort zweite Note**

Direkt nach Test 1, ohne den Dialog zu schließen: einfach tippen (überschreibt „TestSonate" dank Selektion) und Speichern.

Expected:
- Zweite Note wird angelegt mit unveränderten Werten außer Name.
- Tree zeigt beide.

- [ ] **Step 3: Test 3 — Checkbox aus**

Checkbox deaktivieren, Speichern.

Expected:
- Dialog schließt.
- Beim erneuten Öffnen ist das Form leer (Folder-Default).

- [ ] **Step 4: Test 4 — Persistenz über Reload**

1. Checkbox aktivieren.
2. Browser-Reload (F5).
3. Dialog erneut öffnen.

Expected: Checkbox ist noch aktiv.

- [ ] **Step 5: Test 5 — Folder mit Checkbox an**

Type=Ordner, Name=„Tag X", Checkbox an, Speichern.

Expected:
- Dialog bleibt offen, Name bleibt „Tag X".
- Cursor im Name-Feld, „Tag X" selektiert.
- Save-Button kurz „✓ Gespeichert".
- (Backend-Verhalten beim zweiten gleich benannten Folder ist nicht Teil dieses Plans.)

- [ ] **Step 6: Test 6 — Inline-angelegter Autor**

1. Checkbox an, Type=Musiknote.
2. Autorname ist neu (z.B. „Brandneuer Komponist"), `authorId` bleibt leer beim ersten Submit.
3. Speichern → `findOrCreateAuthorId` erzeugt Author, gibt id zurück.
4. Erneut Speichern (ohne Felder zu ändern).

Expected:
- Zweite Note bekommt **denselben** `authorId` wie die erste (kein doppelter Author im DB).
- Verifikation in DB (optional): `SELECT id, name FROM authors WHERE name = 'Brandneuer Komponist';` zeigt genau eine Zeile.

- [ ] **Step 7: Test 7 — Submit-Fehler**

1. Checkbox an.
2. Form so manipulieren, dass Backend einen 4xx liefert (z.B. leerer Name würde Frontend-Validation triggern — stattdessen für echten Test: DevTools → Network → Block Pattern `/v1/elements/notes` POST).
3. Speichern.

Expected:
- Dialog bleibt offen, Felder unverändert.
- Kein „✓ Gespeichert"-Flash am Button.
- `onSuccess` lief nicht.

- [ ] **Step 8: Wenn alle Tests grün, finaler Commit (falls nötig)**

Sind aus Task 1–4 schon alle Änderungen committed, ist hier nichts zu tun. Sonst:

```bash
git status
# Falls noch was ungestaged: prüfen + committen
```

---

## Self-Review

**Spec-Abdeckung:**
- UI-Checkbox links im Footer → Task 2 ✓
- localStorage-Persistenz → Task 1 ✓
- 1:1-Preservation bei `createAnother === true` → Task 4 (handlePostSubmit) ✓
- `scannedPdfContent` + `scanError` leeren → Task 4 ✓
- Fokus + Selektion auf Name-Feld → Task 3 (Ref) + Task 4 (focus/select call) ✓
- Save-Button „✓ Gespeichert" für 1.5s → Task 1 (State) + Task 2 (Render) + Task 4 (flashJustSaved) ✓
- Cleanup Timer auf Unmount → Task 1 Step 4 ✓
- Default-Verhalten bei Checkbox aus = Dialog schließt → Task 4 (closeAndResetForm-Call) ✓
- Edge: Inline-Author, Type-Wechsel, localStorage-Fehler → Task 1 (try/catch) + Test 6 ✓
- Submit-Fehler → Test 7 ✓

**Placeholders:** Keine TBD/TODO. Alle Code-Steps zeigen vollständigen Code.

**Type-Konsistenz:** `handlePostSubmit` ohne Args (Folder/Note-Branching nicht mehr nötig — beide Pfade verhalten sich identisch). `flashJustSaved` und `handlePostSubmit` sind benannt wie referenziert. `setCreateAnother` ist die exportierte Setter-Variante, `setCreateAnotherState` der raw useState-Setter.

**Scope:** Eine Datei, ein Feature, kein Refactoring darüber hinaus.
