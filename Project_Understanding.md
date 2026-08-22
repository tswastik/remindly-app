# Project Understanding — Remindly

A personal reminder/notification Android app built with React Native + Expo. Users create reminders across 7 life categories (financial, birthdays, daily tasks, maintenance, study, free-text notes, and vacation planning), each with a due date, and get a real Android notification when it's due — with exact-alarm precision, and Mark Done/Snooze buttons right on the notification that work even if the app is fully killed. A bottom tab bar (Home / Reminders / Profile) is the main navigation shell; Profile holds a local photo + mobile number, JSON backup/restore, and PDF/Excel export. Data lives entirely on-device in SQLite — no backend, no accounts.

This document explains what every file in the project does and how they fit together, for anyone (including future-you) picking the codebase back up.

## Tech stack

| Concern | Library | Why |
|---|---|---|
| Framework | Expo (managed + custom dev client) | JS/TS-only workflow, but with native modules Expo Go can't load |
| Notifications | `@notifee/react-native` | Exact-alarm Android trigger notifications with Mark Done/Snooze action buttons — `expo-notifications` isn't reliable enough for this |
| Local DB | `expo-sqlite` | First-party async SQLite API |
| Navigation | `@react-navigation/native` + `native-stack` + `bottom-tabs` | Bottom tab shell (Home/Reminders/Profile) wrapping a stack for drill-down screens |
| Date/time picker | `@react-native-community/datetimepicker` | Native Android picker dialogs (imperative `DateTimePickerAndroid.open()` API) |
| Date math | `date-fns` | Installed for future recurrence logic (still not implemented — see "What's not built yet") |
| State management | React Context + `useReducer` | Single entity type, no server sync — Context is enough |
| Profile photo | `expo-image-picker` | Pick a local photo from the gallery for the Profile screen |
| Backup/export file I/O | `expo-file-system` (new class-based `File`/`Directory`/`Paths` API), `expo-sharing` | Write/read backup and export files, hand them to Android's share sheet |
| PDF export | `expo-print` | Renders an HTML table of reminders to a PDF file |
| Excel export | `xlsx` (SheetJS) | Pure-JS `.xlsx` generation, no native module of its own — written to disk via `expo-file-system` |

## How the app is currently tested

Because several native modules (`@notifee/react-native`, `@react-native-community/datetimepicker`, `expo-image-picker`, `expo-file-system`, `expo-sharing`, `expo-print`) aren't bundled in Expo Go, the app can't run there. Testing happens via a **custom dev client** — a native build (via EAS cloud build, since no local Android SDK/emulator is practical on this machine — see the note on RAM below) installed once on a phone like a normal APK, after which `npx expo start` hot-reloads JS into it exactly like Expo Go would. `eas.json`'s `development` profile controls that build. **Rebuilding is only needed when a new native module is added** — pure JS/asset changes (screens, styling, new JS-only logic) hot-reload instantly without one.

A plain browser-based dev preview (`npx expo start --web`) also works for fast UI iteration on everything except the native-only pieces (real notifications, the native date picker, file-system/image-picker/print) — those either have a `.web.tsx` fallback (see `DateTimeField.web.tsx`) or fail gracefully with a console warning on web without crashing.

**Local Android emulator note:** this dev machine only has ~3.9GB RAM, which is below what a standard Android emulator needs (4GB+) — the emulator was tried and is not practically usable here. Physical-device testing via the dev client is the primary workflow. If revisited, use a **stable, non-beta, non-"16k page size", non-Play-Store** system image (e.g. plain `google_apis` on a stable API level) — beta/Play Store images were found to hard-require 4096MB regardless of AVD RAM settings.

---

## Project structure

```
App.tsx                          # root: splash gate, then wraps providers + navigator
index.ts                         # Expo entry point; registers the notifee background handler, then the app root
app.json                         # Expo config: app name/slug, Android package id + permissions, plugins, EAS link
eas.json                         # EAS Build profile ("development" = internal APK w/ dev client)
metro.config.js                  # Web-only bundler tweaks (see below)
package.json / package-lock.json # dependencies
tsconfig.json                    # extends expo/tsconfig.base, strict mode on

src/
  types/reminder.ts              # Category, RecurrenceType, ReminderStatus, Reminder, ReminderInput
  constants/categories.ts        # the 7 categories: id, display label, icon, fixed subcategories
  db/
    database.ts                  # opens the SQLite DB, creates the schema (reminders + profile tables)
    reminderRepository.ts        # reminder CRUD functions + row<->Reminder mapping
    profileRepository.ts         # single-row profile table: photo URI + mobile number
  notifications/
    notificationService.ts       # notifee channel/permission/exact-alarm setup, schedule/cancel, action listeners
    actionHandlers.ts            # React-free Mark Done/Snooze logic shared by UI, foreground, and background paths
  backup/
    backupService.ts             # write+share a JSON backup, pick+read one back in (file I/O only)
  export/
    exportService.ts             # generate + share a PDF or .xlsx of all reminders
  context/
    RemindersContext.tsx         # Context+reducer wiring DB + notifications + backup/export + UI state together
  navigation/
    types.ts                     # RootStackParamList (tab shell + drill-down screens) and MainTabParamList
    AppNavigator.tsx             # outer stack: MainTabs (no header) + CategoryList/AddEditReminder/ReminderDetail
    MainTabs.tsx                 # the bottom tab bar itself: Home / Reminders / Profile
  screens/
    HomeScreen.tsx                # category dashboard (2-column grid of tiles) — a tab root
    RemindersListScreen.tsx       # every reminder, all categories, top-to-bottom — a tab root
    ProfileScreen.tsx             # photo + mobile number + backup/restore + PDF/Excel export — a tab root
    CategoryListScreen.tsx        # list of reminders within one category + "Add Reminder" FAB
    AddEditReminderScreen.tsx     # the create/edit form (branches per category)
    ReminderDetailScreen.tsx      # view one reminder; Edit / Mark Done / Snooze / Delete actions
  components/
    SplashBanner.tsx               # full-screen launch image + "Let's Get Started" glass button
    AbstractBackground.tsx         # decorative muted blue-green shapes, used on every screen
    ReminderCard.tsx               # one reminder row in a list
    ChipSelector.tsx               # generic pill-button single-select (subcategory, recurrence)
    DateTimeField.tsx              # date/time picker button — Android native picker (via DateTimePickerAndroid)
    DateTimeField.web.tsx          # same component, web version — Metro auto-picks this on web builds
    StayOptionsEditor.tsx          # add/remove list editor for vacation's "shortlisted stays"
  utils/
    dateFormat.ts                  # human-readable date/date-time formatting for display

Not yet built (see "What's not built yet" at the end):
  notifications/recurrence.ts     # computing the next due date for repeating reminders
```

---

## Root files

### `App.tsx`
Renders `SplashBanner` first; after a minimum 2-second hold, its "Let's Get Started" button flips a `started` flag that swaps in the real app (`RemindersProvider` → `AppNavigator`), all inside one always-mounted `SafeAreaProvider` (needed because `SplashBanner` itself uses `SafeAreaView`). No font-loading gate anymore — an earlier version also waited on a Poppins font load, but since the header no longer uses styled text (it uses a logo image, see `MainTabs.tsx`), that font was dead weight that risked permanently stranding users on the splash if the font load ever stalled. Removed entirely.

### `index.ts`
Registers `notifee.onBackgroundEvent` (via `notificationService.onBackgroundAction`) **before** `registerRootComponent(App)`, so Mark Done/Snooze notification taps work even when the app process has been fully killed — this is why the ordering here matters, not just an entry-point formality.

### `app.json`
- `name`/`slug`: `"Remindly"` / `"remindly"` — the slug is tied to the linked EAS project and shouldn't be changed casually.
- `android.package`: `com.tswastik.reminderapp`.
- `android.permissions`: `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` — needed for exact-alarm notification delivery; this is a native manifest change, so it only takes effect after a rebuild.
- `plugins`: `expo-sqlite`, the datetimepicker, `expo-sharing`, and `expo-image-picker` (with an explicit `photosPermission` description string — the only Stage 2 package that needed manual plugin config; `expo-file-system`/`expo-print` needed none).
- `extra.eas.projectId` / `owner`: link to the EAS project the dev-client APK is built from.

### `eas.json`
One build profile, `development`: `developmentClient: true` + `distribution: internal` + Android `buildType: apk`.

### `metro.config.js`
Only affects the **web** dev-preview convenience, not Android. `expo-sqlite`'s web backend (`wa-sqlite`) ships a `.wasm` file and needs cross-origin-isolation headers to run in a browser — this file adds `wasm` to Metro's asset extensions and sets the `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers so that works.

---

## `src/types/reminder.ts` — the data model

```ts
Category = 'financial' | 'personal_event' | 'todo' | 'maintenance' | 'study' | 'note' | 'vacation'
RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days'
ReminderStatus = 'active' | 'done' | 'snoozed'
```

`Reminder` is the full shape read from the DB (includes `id`, `createdAt`, `updatedAt`, `notificationId`). `ReminderInput` is what the Add/Edit form (and backup restore — see below) produces — same shape minus those repository-managed fields.

Key fields specific to the `vacation` category: `endDate` (trip end, vs. `dueDate` as the trip start), `destination`, `stayOptions` (string array). These are `null` for every other category.

---

## `src/constants/categories.ts`

`CATEGORIES` is the single source of truth for the 7 category tiles: internal `id` (never shown to the user, and matches what's stored in the DB — renaming a label here is purely cosmetic and safe), display `label`, an emoji `icon`, and a `subcategories` list.

- `financial`, `personal_event`, `maintenance` have a **fixed chip list** ending in `'Other'` — picking "Other" reveals a free-text "Please specify" field in the form.
- `todo` and `study` have an empty list — no subcategory field is shown for them at all.
- `note` also has an empty list, but is handled specially in the form as a free-text "Custom Category" input.
- `vacation` has no subcategory concept — it uses `destination`/`stayOptions` instead.

`getCategoryDef(id)` looks up a category's definition, throwing if the id is somehow invalid.

---

## `src/db/` — SQLite persistence

### `database.ts`
`getDatabase()` lazily opens (once, memoized) a SQLite database file `reminders.db` via `expo-sqlite`'s async API, and runs the schema on first open — additive `CREATE TABLE IF NOT EXISTS` statements, so adding a new table is always a safe, non-destructive change for existing installs. Two tables:
- `reminders` — the main table (see the original schema; unchanged since Phase 2).
- `profile` — a **single-row** table (`id INTEGER PRIMARY KEY CHECK (id = 1)`) holding `photo_uri` and `mobile_number` for the Profile screen. The `CHECK (id = 1)` constraint is what enforces "only one row ever" — writes use `INSERT ... ON CONFLICT(id) DO UPDATE` (upsert) rather than separate insert/update logic.

### `reminderRepository.ts`
Unchanged since Phase 2 — pure data-access functions (`listAll`, `listByCategory`, `getById`, `create`, `update`, `updateStatus`, `snoozeUntil`, `remove`, `listDistinctNoteSubcategories`).

### `profileRepository.ts`
`getProfile()` reads the single profile row (defaults to `{ photoUri: null, mobileNumber: null }` if it doesn't exist yet). `saveProfile(profile)` upserts it.

---

## `src/notifications/`

### `notificationService.ts`
Wraps `@notifee/react-native`. Key pieces:
- `ensureChannel()` / `requestPermissions()` — channel setup and the `POST_NOTIFICATIONS` runtime permission, called once on app start.
- `isExactAlarmPermissionGranted()` / `openExactAlarmSettings()` — Android 12+'s exact-alarm permission has **no runtime dialog**; the app checks `notifee.getNotificationSettings().android.alarm` and, if disabled, deep-links the user to the system Settings screen to enable "Alarms & reminders" manually (see `RemindersContext`'s startup prompt).
- `scheduleReminder(reminder)` — schedules a `TimestampTrigger` with `alarmManager: { allowWhileIdle: true }` (exact-alarm delivery even under Doze) at `reminder.dueDate`, carrying two action buttons: **Mark Done** and **Snooze**. Silently skips scheduling if the due date is already in the past.
- `scheduleSnooze(reminder, minutes)` — same trigger mechanics, but at `now + minutes` (used by the snooze flow); returns the computed snooze time.
- `cancelReminder(id)` — cancels by `String(id)`, still the sole notification-id scheme (the `notification_id` DB column remains unused).
- `onForegroundAction(callback)` / `onBackgroundAction(callback)` — thin wrappers around `notifee.onForegroundEvent`/`onBackgroundEvent`, filtered to `ACTION_PRESS` events and normalized to `{ actionId, reminderId }`, so nothing outside this file needs to know notifee's raw event shape.

### `actionHandlers.ts`
The shared, **React-free** logic behind Mark Done and Snooze — deliberately separate from `RemindersContext` because the background-kill path (`index.ts`'s `onBackgroundAction`) runs with no React tree mounted at all and can't use context/hooks.
- `handleMarkDone(reminderId)` — cancel the notification, set status to `'done'`, return the updated `Reminder` (or `null` if it no longer exists).
- `handleSnooze(reminderId)` — cancel the notification, schedule a new one 10 minutes out (`SNOOZE_MINUTES`), persist `status: 'snoozed'` + `snoozedUntil`, return the updated reminder.
- `handleNotificationAction(actionId, reminderId)` — dispatches to one of the above based on the action id; this is the single function called from all three trigger points (in-app buttons, foreground taps, background taps), so the actual business logic exists exactly once.

---

## `src/backup/backupService.ts`

Pure file I/O — no DB writes, no notification scheduling, no React. Uses the new `expo-file-system` class-based API (`File`, `Directory`, `Paths` — Expo SDK 57 replaced the old `readAsStringAsync`/`writeAsStringAsync` functions with this; there's a `expo-file-system/legacy` shim for the old API but this project uses the current one).
- `writeAndShareBackup(reminders)` — serializes `{ version, exportedAt, reminders }` as pretty-printed JSON into `Paths.document/backups/remindly-backup-<timestamp>.json` (creating the `backups` directory if needed), then hands it to `expo-sharing`'s share sheet so the user can save it to Drive, email it, etc.
- `pickAndReadBackup()` — opens the **built into `expo-file-system`** file picker (`File.pickFileAsync({ mimeTypes: ['application/json'] })` — this new API ships its own picker, so the project doesn't need the separate `expo-document-picker` package at all), reads and JSON-parses the selected file, and validates it has a `reminders` array before returning it.

`RemindersContext.importBackup()` is what actually turns that payload into new reminders — restore is **merge/append, never destructive**: each backed-up reminder is passed through the normal `addReminder()` path (fresh id, fresh notification scheduled if its due date is still in the future), so restoring on a phone that already has its own reminders just adds to them rather than wiping anything.

---

## `src/export/exportService.ts`

Read-only reporting — takes the current in-memory reminder list and produces a shareable file. Two entry points, both ending in the same `expo-sharing` share sheet:
- `exportRemindersAsPdf(reminders)` — builds an HTML table (title/category/type/due/status/notes columns, inline `<style>`) and calls `expo-print`'s `printToFileAsync({ html })`, which returns a PDF file `uri` directly.
- `exportRemindersAsExcel(reminders)` — maps reminders to plain row objects, builds a workbook via `xlsx`'s `utils.json_to_sheet`/`utils.book_new`/`utils.book_append_sheet`, serializes it with `XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })`, and writes that base64 string to a `.xlsx` file via `expo-file-system` (`file.write(base64, { encoding: 'base64' })`) before sharing it. `xlsx` itself is pure JS (no native module), so only the file-write/share step needed a native dependency.

---

## `src/context/RemindersContext.tsx` — the app's state hub

A React Context + `useReducer` that is the *only* place UI code should mutate reminders — it keeps the SQLite write, the notification schedule/cancel call, and the in-memory list update atomic from the screen's point of view.

- On mount: `ensureChannel()` + `requestPermissions()`, a one-time exact-alarm permission prompt (`Alert.alert` with an "Open Settings" button if disabled), loads all reminders, and subscribes to `onForegroundAction` — so if the user taps Mark Done/Snooze on a notification while the app is open, the in-memory list refreshes immediately instead of only on next launch.
- `addReminder(input)` → insert row → schedule its notification → update state.
- `updateReminder(id, input)` → cancel the old notification, then update the row, then schedule a new one (always cancel-then-reschedule, no diffing).
- `deleteReminder(id)` → cancel notification → delete row → update state.
- `markDone(id)` / `snoozeReminder(id)` → delegate to `actionHandlers.handleMarkDone`/`handleSnooze`, then dispatch the returned reminder into state. (Same underlying logic notification taps use — see `actionHandlers.ts`.)
- `exportBackup()` → `backupService.writeAndShareBackup(state.reminders)`.
- `importBackup()` → `backupService.pickAndReadBackup()`, then loops the returned reminders through the existing `addReminder()` (reuses all of its DB+notification+state logic instead of duplicating it); returns the count imported.

Exposed hooks: `useReminders()`, `useRemindersByCategory(category)`, `useReminder(id)` — unchanged in shape from earlier phases, just with more actions available on the context value now.

---

## `src/navigation/`

### `types.ts`
Two param lists now:
- `RootStackParamList` — `MainTabs` (the tab shell, no params) plus the three drill-down screens (`CategoryList`, `AddEditReminder`, `ReminderDetail`) that push on top of it.
- `MainTabParamList` — `HomeTab` / `RemindersTab` / `ProfileTab`.

Screens that live *inside* a tab (`HomeScreen`, `RemindersListScreen`, `ProfileScreen`) need to navigate to root-stack routes too (e.g. tapping a reminder card pushes `ReminderDetail`), so they're typed with `CompositeScreenProps` — `HomeTabScreenProps`/`RemindersTabScreenProps`/`ProfileTabScreenProps` each merge the tab navigator's props with the root stack's. Screens rendered directly by the root stack (`CategoryListScreen`, `AddEditReminderScreen`, `ReminderDetailScreen`) don't need this — they keep their original `NativeStackScreenProps<RootStackParamList, 'X'>` typing unchanged.

### `AppNavigator.tsx`
The **outer** stack: `MainTabs` (rendered with `headerShown: false`, since the tab navigator manages its own headers) is the initial route, with `CategoryList`/`AddEditReminder`/`ReminderDetail` as sibling routes that push on top of it. This is the standard "tab bar hides on drill-down" architecture — `navigation.navigate('CategoryList', ...)` called from inside a tab screen bubbles up and is resolved by this outer stack, sliding the tab bar out of view; navigating back returns to the tabs. (Verified live: the footer tab bar is present on Home/Reminders/Profile and correctly absent on category/detail screens.)

### `MainTabs.tsx`
The bottom tab bar itself (the "footer") — `createBottomTabNavigator` with three screens: `HomeTab` → `HomeScreen`, `RemindersTab` → `RemindersListScreen`, `ProfileTab` → `ProfileScreen`. Emoji tab icons (🏠 🔔 👤) dim to 60% opacity when inactive. The Home tab keeps the gradient-banner header (`header-gradient.png` + centered `Remindly Font.png` logo, `headerTitleAlign: 'center'`) that used to live directly on `AppNavigator`'s Home screen entry before the tab restructure; Reminders/Profile get plain text-title headers via their `title` option.

---

## `src/screens/`

### `HomeScreen.tsx`
Unchanged behavior — 2-column grid of the 7 category tiles. Only its prop type changed (`HomeTabScreenProps` instead of a direct root-stack type) to reflect that it's now a tab screen.

### `RemindersListScreen.tsx`
New. Every reminder across every category, in one scrollable list (`useReminders()`, unfiltered — the DB already returns them ordered by due date), rendered as `ReminderCard`s; tapping one pushes `ReminderDetail`. No FAB — this is a viewing surface, not a creation one; adding still happens via Home → category → Add, matching how the feature was scoped.

### `ProfileScreen.tsx`
New. Loads `{ photoUri, mobileNumber }` from `profileRepository` on mount.
- **Avatar**: shows the photo if set, else an "R" initial placeholder. Tapping it requests media-library permission (`ImagePicker.requestMediaLibraryPermissionsAsync`) then launches the gallery picker (`launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1] })`); the picked `uri` is saved immediately via `profileRepository.saveProfile`.
- **Mobile number**: a plain `TextInput`, saved on blur.
- **Backup section**: "Export Backup" and "Restore from Backup" buttons call the context's `exportBackup`/`importBackup`.
- **Export section**: "Export as PDF" and "Export as Excel" buttons call `exportService` directly with the full `reminders` list from context (read-only, no context method needed for these).
- All four action buttons share a `runAction(name, fn)` helper that tracks a single `busyAction` string, so only the pressed button shows a spinner and disables itself; errors are caught and surfaced via `Alert.alert` rather than crashing the screen.

### `CategoryListScreen.tsx` / `AddEditReminderScreen.tsx`
Unchanged from earlier phases.

### `ReminderDetailScreen.tsx`
Gained a **Snooze** button (alongside Edit/Mark Done/Delete, hidden once the reminder is done) calling `snoozeReminder`, and a "Snoozed Until" row shown when `status === 'snoozed'` — added specifically so snoozing can be tested/used in-app without waiting for a real notification to fire.

---

## `src/components/`

### `SplashBanner.tsx`
The launch screen. Full-screen `Remindly App Background.png` (`position: absolute` fill, not a flex sibling — using explicit `top/left/right/bottom: 0` + `width/height: '100%'`, since an `Image` with only absolute-position insets and no explicit size renders at its *intrinsic* pixel dimensions instead of stretching — this bit twice: once on the splash image itself, once on the header gradient in `MainTabs.tsx`, both fixed the same way). A `SafeAreaView` overlay (`edges={['bottom']}`, `justifyContent: 'flex-end'`) holds the "Let's Get Started" button — flexbox-natural bottom placement was adopted after a manual `bottom: insets.bottom + 48` calculation proved unreliable on a real device (worked in the web preview, didn't reliably show up on-device — flexbox layout doesn't have that failure mode). The button itself is styled as **translucent glass**: `rgba(255,255,255,0.22)` background, a soft `rgba(255,255,255,0.55)` border, white text with a dark drop-shadow for legibility — chosen over a real blurred backdrop (`expo-blur`) specifically to avoid yet another native rebuild for a cosmetic effect.

### `AbstractBackground.tsx`, `ReminderCard.tsx`, `ChipSelector.tsx`, `DateTimeField.tsx`/`.web.tsx`, `StayOptionsEditor.tsx`
Unchanged from earlier phases (see prior notes if needed — all still exactly as originally built).

---

## `src/utils/dateFormat.ts`
Unchanged — `formatDisplayDate`/`formatDisplayDateTime`, locale-aware display formatting distinct from the `dd-mm-yyyy` shown in the date *picker* buttons.

---

## End-to-end example: creating a reminder

1. User taps a category tile on `HomeScreen` (inside `MainTabs`) → navigates to `CategoryListScreen` (root stack — tab bar hides).
2. Taps "+ Add Reminder" → navigates to `AddEditReminderScreen` with `{ category }` (no `reminderId`, so it's create-mode).
3. Fills the form; `handleSave` builds a `ReminderInput` and calls `addReminder()` from `RemindersContext`.
4. `RemindersContext.addReminder`: `reminderRepository.create()` inserts the row → `notificationService.scheduleReminder()` schedules an exact-alarm notification with Mark Done/Snooze buttons → dispatches `ADDED` to update in-memory state.
5. Navigates back; both `CategoryListScreen` and `RemindersListScreen` re-render from the shared context state and show the new `ReminderCard`.
6. At the due date/time, notifee fires the notification. Tapping **Mark Done** or **Snooze** — whether the app is foregrounded, backgrounded, or fully killed — routes through `actionHandlers.handleNotificationAction`, which is the same function regardless of app state.

---

## What's not built yet

- **Recurrence**: `notifications/recurrence.ts` (computing the next due date for `daily`/`weekly`/`monthly`/`yearly`/`custom_days` reminders) still doesn't exist. `markDone` on a recurring reminder just marks it done today — it does not reschedule itself for the next occurrence. `date-fns` is installed specifically for this, unused so far.
- **Further polish** (originally "Phase 6"): category dashboard counts, "notes" custom-category autocomplete (the repository function `listDistinctNoteSubcategories` already exists, just unused by any screen), empty-state/theming refinement.

## Notable decisions worth knowing if you keep working on this

- **Android only.** Web support exists solely as a fast local dev-preview convenience; nothing here is meant to ship to browsers. Several Stage-2-and-later native calls (file system, image picker, print) fail with a console warning on web rather than crashing — expected, not a bug.
- **Custom dev client, not Expo Go.** Rebuilding is only needed when a *new native module* is added or a native manifest permission changes (e.g. the exact-alarm permissions, or every package added for backup/export/profile). Pure JS/asset changes hot-reload without one.
- **`notification_id` cancel/reschedule always uses `String(reminder.id)`** rather than a separately generated id — the DB column exists but isn't populated.
- The **declarative** `<DateTimePicker>` React component was tried first and proved unreliable on Android; replaced with the imperative `DateTimePickerAndroid.open()` API.
- **Mark Done/Snooze logic lives in one place** (`actionHandlers.ts`), deliberately outside React, because it has to run identically from a headless background-event handler as from in-app buttons — resist the urge to inline this logic directly into `RemindersContext` even though that's where two of the three call sites are.
- **Restore is additive by design** — importing a backup never deletes or overwrites existing local reminders, only adds new ones. If literal "replace everything" restore is ever wanted, that's a deliberate behavior change, not a bug fix.
- **Excel export produces a real `.xlsx`** (via SheetJS), not a CSV — chosen explicitly over the simpler CSV option when this was built; revisit if app size becomes a concern (`xlsx` is a fairly large pure-JS library, and visibly increased both the Android and web bundle sizes when added).
- **`expo-file-system`'s API changed significantly in this Expo SDK** (SDK 57) — it's now class-based (`new File(...)`, `new Directory(...)`, `Paths.document`/`Paths.cache`), replacing the old `readAsStringAsync`/`writeAsStringAsync`/`documentDirectory` style (still available as a compat shim under `expo-file-system/legacy`, but not used here). This project also uses the new API's own built-in file picker (`File.pickFileAsync()`), so `expo-document-picker` was deliberately **not** installed as a separate dependency.
- **This dev machine can't practically run an Android emulator** (only ~3.9GB RAM). If someone sets one up later, the earlier attempts here found that image *choice* matters far more than AVD "RAM" settings — beta/16k-page-size/Play-Store-flavored system images hard-require 4096MB regardless of configuration; a stable `google_apis` image on a normal API level does not.
