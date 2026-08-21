# Project Understanding — Remindly

A personal reminder/notification Android app built with React Native + Expo. Users create reminders across 7 life categories (financial, birthdays, daily tasks, maintenance, study, free-text notes, and vacation planning), each with a due date, and get a real Android notification when it's due. Data lives entirely on-device in SQLite — no backend, no accounts.

This document explains what every file in the project does and how they fit together, for anyone (including future-you) picking the codebase back up.

## Tech stack

| Concern | Library | Why |
|---|---|---|
| Framework | Expo (managed + custom dev client) | JS/TS-only workflow, but with native modules Expo Go can't load |
| Notifications | `@notifee/react-native` | Exact-alarm-capable Android trigger notifications with action buttons — `expo-notifications` isn't reliable enough for this |
| Local DB | `expo-sqlite` | First-party async SQLite API |
| Navigation | `@react-navigation/native` + `native-stack` | Standard stack navigation |
| Date/time picker | `@react-native-community/datetimepicker` | Native Android picker dialogs (imperative `DateTimePickerAndroid.open()` API) |
| Date math | `date-fns` | Installed for the upcoming recurrence logic (Phase 5), not yet used |
| State management | React Context + `useReducer` | Single entity type, no server sync — Context is enough |
| Fonts | `@expo-google-fonts/poppins` + `expo-font` | Modern-styled app title |

## How the app is currently tested

Because `@notifee/react-native` and `@react-native-community/datetimepicker` are native modules not bundled in Expo Go, the app can no longer run in plain Expo Go. Testing happens via a **custom dev client** — a one-time native build (via EAS cloud build, since no local Android SDK is installed) that gets installed once on a phone like a normal APK, after which `npx expo start` continues to hot-reload JS into it exactly like Expo Go would. `eas.json`'s `development` profile controls that build. A plain browser-based dev preview (`npx expo start --web`, wired up via `.claude/launch.json`) also works for fast UI iteration, with a couple of web-only shims described below.

---

## Project structure

```
App.tsx                          # root component: loads fonts, wraps providers
index.ts                         # Expo entry point, registers App as the root component
app.json                         # Expo config: app name/slug, Android package id, plugins, EAS project link
eas.json                         # EAS Build profile ("development" = internal APK w/ dev client)
metro.config.js                  # Web-only bundler tweaks (see below)
package.json / package-lock.json # dependencies
tsconfig.json                    # extends expo/tsconfig.base, strict mode on

src/
  types/reminder.ts              # Category, RecurrenceType, ReminderStatus, Reminder, ReminderInput
  constants/categories.ts        # the 7 categories: id, display label, icon, fixed subcategories
  db/
    database.ts                  # opens the SQLite DB, creates the schema
    reminderRepository.ts        # CRUD functions + row<->Reminder mapping
  notifications/
    notificationService.ts       # notifee channel/permission setup, schedule/cancel a notification
  context/
    RemindersContext.tsx         # Context+reducer wiring DB + notifications + UI state together
  navigation/
    types.ts                     # RootStackParamList (screen names + params)
    AppNavigator.tsx             # the stack navigator + per-screen header titles
  screens/
    HomeScreen.tsx                # category dashboard (2-column grid of tiles)
    CategoryListScreen.tsx        # list of reminders within one category + "Add Reminder" FAB
    AddEditReminderScreen.tsx     # the create/edit form (branches per category)
    ReminderDetailScreen.tsx      # view one reminder; Edit / Mark Done / Delete actions
  components/
    AbstractBackground.tsx        # decorative muted blue-green shapes, used on every screen
    ReminderCard.tsx              # one reminder row in the category list
    ChipSelector.tsx              # generic pill-button single-select (subcategory, recurrence)
    DateTimeField.tsx             # date/time picker button — Android native picker (via DateTimePickerAndroid)
    DateTimeField.web.tsx         # same component, web version — Metro auto-picks this on web builds
    StayOptionsEditor.tsx         # add/remove list editor for vacation's "shortlisted stays"
  utils/
    dateFormat.ts                 # human-readable date/date-time formatting for display

Not yet built (see "What's not built yet" at the end):
  notifications/recurrence.ts     # Phase 5 — computing next due date for repeating reminders
  notifications/permissions.ts    # Phase 4 — exact-alarm permission check/prompt UI
```

---

## Root files

### `App.tsx`
Loads the `Poppins_700Bold` font via `useFonts` (renders nothing until it's ready, avoiding a flash of the wrong font), then wraps the app in `SafeAreaProvider` → `RemindersProvider` → `AppNavigator`.

### `index.ts`
Standard Expo entry point — calls `registerRootComponent(App)`.

### `app.json`
- `name`/`slug`: `"Remindly"` / `"remindly"` — the slug is tied to the linked EAS project and shouldn't be changed casually.
- `android.package`: `com.tswastik.reminderapp` — required for the native Android build.
- `plugins`: config plugins auto-added by `expo install` for `expo-sqlite`, the datetimepicker, and `expo-font`.
- `extra.eas.projectId` / `owner`: link to the EAS project the dev-client APK is built from.

### `eas.json`
One build profile, `development`: `developmentClient: true` + `distribution: internal` + Android `buildType: apk`. This is what `eas build --profile development --platform android` uses to produce an installable dev-client APK.

### `metro.config.js`
Only affects the **web** dev-preview convenience, not Android. `expo-sqlite`'s web backend (`wa-sqlite`) ships a `.wasm` file and needs cross-origin-isolation headers to run in a browser — this file adds `wasm` to Metro's asset extensions and sets the `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` headers so that works.

---

## `src/types/reminder.ts` — the data model

```ts
Category = 'financial' | 'personal_event' | 'todo' | 'maintenance' | 'study' | 'note' | 'vacation'
RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days'
ReminderStatus = 'active' | 'done' | 'snoozed'
```

`Reminder` is the full shape read from the DB (includes `id`, `createdAt`, `updatedAt`, `notificationId`). `ReminderInput` is what the Add/Edit form produces — same shape minus those repository-managed fields.

Key fields specific to the `vacation` category: `endDate` (trip end, vs. `dueDate` as the trip start), `destination`, `stayOptions` (string array). These are `null` for every other category.

---

## `src/constants/categories.ts`

`CATEGORIES` is the single source of truth for the 7 category tiles: internal `id` (never shown to the user, and matches what's stored in the DB — renaming a label here is purely cosmetic and safe), display `label`, an emoji `icon`, and a `subcategories` list.

- `financial`, `personal_event`, `maintenance` have a **fixed chip list** ending in `'Other'` — picking "Other" reveals a free-text "Please specify" field in the form.
- `todo` and `study` have an empty list — no subcategory field is shown for them at all.
- `note` also has an empty list, but is handled specially in the form as a free-text "Custom Category" input (see `AddEditReminderScreen`).
- `vacation` has no subcategory concept — it uses `destination`/`stayOptions` instead.

`getCategoryDef(id)` looks up a category's definition, throwing if the id is somehow invalid.

---

## `src/db/` — SQLite persistence

### `database.ts`
`getDatabase()` lazily opens (once, memoized in `dbPromise`) a SQLite database file `reminders.db` via `expo-sqlite`'s async API, and runs the schema (`CREATE TABLE IF NOT EXISTS` + two indexes) on first open. Single table, `reminders`, with snake_case columns mirroring `Reminder` but with `due_date`/`end_date` as ISO strings and `stay_options` as a JSON-encoded string.

### `reminderRepository.ts`
Pure data-access functions — no React, no notification logic:
- `rowToReminder()` — maps a raw SQL row to the camelCase `Reminder` type, parsing `stay_options` JSON.
- `listAll()`, `listByCategory()`, `getById()` — reads.
- `create()`, `update()` — writes; both stamp `updated_at`, `create()` also stamps `created_at`.
- `updateStatus()` — narrow helper used by "Mark Done".
- `remove()` — delete.
- `listDistinctNoteSubcategories()` — written for a future autocomplete on the "notes" category's custom labels; not currently called anywhere.

---

## `src/notifications/notificationService.ts`

Wraps `@notifee/react-native` for the current (Phase 3) feature set — a plain notification that fires once at the due date, no action buttons or exact-alarm guarantee yet (that's Phase 4).

- `ensureChannel()` — creates the `reminders-default` Android notification channel (`HIGH` importance), called once on app start.
- `requestPermissions()` — asks for the `POST_NOTIFICATIONS` runtime permission, also called on app start.
- `scheduleReminder(reminder)` — creates a `TriggerType.TIMESTAMP` notification at `reminder.dueDate`. **Skips scheduling silently if the due date is already in the past** (Phase 3 doesn't have overdue-reminder handling). The notification's id is always just `String(reminder.id)` — simplest possible mapping, no separate id bookkeeping needed.
- `cancelReminder(id)` — cancels by that same derived id.

---

## `src/context/RemindersContext.tsx` — the app's state hub

A React Context + `useReducer` that is the *only* place UI code should mutate reminders — it keeps the SQLite write, the notification schedule/cancel call, and the in-memory list update atomic from the screen's point of view.

- On mount: calls `ensureChannel()` + `requestPermissions()`, then loads all reminders from the repository into state.
- `addReminder(input)` → insert row → schedule its notification → update state.
- `updateReminder(id, input)` → **cancel the old notification, then update the row, then schedule a new notification** (always cancel-then-reschedule rather than diffing — simplest correct approach, per the original implementation plan).
- `deleteReminder(id)` → cancel notification → delete row → update state.
- `markDone(id)` → cancel notification → set status to `'done'` → update state. (No recurrence handling yet — a "done" recurring reminder doesn't currently reschedule itself; that's Phase 5.)

Exposed hooks:
- `useReminders()` — the raw context (full list + all actions).
- `useRemindersByCategory(category)` — same, pre-filtered.
- `useReminder(id)` — find one reminder by id from the already-loaded list (used by the detail/edit screens; relies on the list being loaded already, which is true in every real navigation path since you always arrive from a list that already fetched it).

---

## `src/navigation/`

### `types.ts`
`RootStackParamList` — the 4 screens and their route params. `CategoryList` needs a `category`; `AddEditReminder` needs a `category` and an optional `reminderId` (its presence distinguishes "edit" from "create"); `ReminderDetail` needs a `reminderId`.

### `AppNavigator.tsx`
A single native-stack navigator: `Home → CategoryList → AddEditReminder / ReminderDetail`. Screen titles are set dynamically from route params (e.g. the category list's header shows that category's label). The Home screen's header title is styled with the Poppins bold font in a muted teal (`#2A6F5E`) — the app's "modern branding" touch.

---

## `src/screens/`

### `HomeScreen.tsx`
The dashboard — a 2-column `FlatList` of the 7 category tiles (icon + label), each navigating to `CategoryList` for that category. Tiles are opaque white cards with a subtle shadow so they read clearly over `AbstractBackground`.

### `CategoryListScreen.tsx`
Shows all reminders in one category via `useRemindersByCategory`, rendered as `ReminderCard`s; empty state if none. A floating "+ Add Reminder" button navigates to `AddEditReminder`. Uses `useSafeAreaInsets()` to push that button above the phone's system nav bar/gesture pill (this was a bug fix — it used to get visually cut off/covered on some devices).

### `AddEditReminderScreen.tsx`
The most complex screen — one form that adapts its fields based on the category:
- **Subcategory**: fixed chip list (`financial`/`personal_event`/`maintenance`) with an "Other → free text" escape hatch, OR a free-text field (`note`), OR nothing (`todo`/`study`/`vacation`).
- **Title / Notes**: always shown.
- **Due date+time** (non-vacation) vs **Start/End date** (vacation, date-only, no time): via `DateTimeField`.
- **Recurrence** chips + a "repeat every N days" field when "Custom" is picked (non-vacation only — recurrence isn't meaningful for a trip).
- **Destination + shortlisted stays** (vacation only), via `StayOptionsEditor`.

New (non-vacation) reminders default their due time to **9:00 AM** today (`defaultDueTime`). When editing, if the loaded reminder's subcategory isn't one of the category's fixed options, the form correctly reopens with "Other" selected and the custom text pre-filled (`existingSubcategoryIsCustom`).

On save, builds a `ReminderInput` and calls `addReminder`/`updateReminder` from context, then navigates back.

### `ReminderDetailScreen.tsx`
Read-only view of one reminder (fields vary by category, same vacation-vs-not branching as the form) with three actions: **Edit** (→ AddEditReminder pre-filled), **Mark Done** (hidden once already done), **Delete** (confirms via `Alert.alert` — note this dialog does nothing on the web dev-preview, since RN's `Alert` isn't implemented there; it works normally on Android).

---

## `src/components/`

### `AbstractBackground.tsx`
Four large, softly-colored, overlapping circles (muted greens/blues, low opacity) absolutely positioned behind the screen content, `pointerEvents="none"` so it never intercepts taps. Pure `View`/`StyleSheet` — no SVG or image assets, so it added zero new dependencies. Rendered as the first child on every screen; every screen's own content sits on top (opaque cards/inputs) so the shapes stay a low-contrast backdrop, not something you read text over.

### `ReminderCard.tsx`
One row in a category list: title, a status badge (Active/Done/Snoozed, color-coded), the subcategory if present, and a date line — a date *range* for vacation reminders, a single date+time otherwise.

### `ChipSelector.tsx`
Generic single-select pill-button row — reused for both subcategory selection and recurrence-type selection, so that UI pattern only exists once.

### `DateTimeField.tsx` (Android) / `DateTimeField.web.tsx` (web)
Same props (`label`, `value: Date`, `onChange`, `mode?: 'date'|'datetime'`), two different implementations that Metro picks automatically per platform:
- **Android**: buttons showing `dd-mm-yyyy` / `HH:MM`, tapping opens `DateTimePickerAndroid.open()` — the library's imperative API (chosen over the declarative `<DateTimePicker>` component after that turned out unreliable on Android — see history below). Picking a date auto-chains into the time picker when `mode==='datetime'`, so one flow sets both.
- **Web**: plain HTML `<input type="date">`/`<input type="time">`, since `DateTimePickerAndroid` doesn't exist on that platform. Exists purely so the dev-preview in a browser stays usable — not part of the shipped app.

### `StayOptionsEditor.tsx`
A simple add/remove list editor (text input + "Add" button, each entry with a "Remove" link) for the vacation category's shortlisted places to stay, stored as a plain string array.

---

## `src/utils/dateFormat.ts`
Two small display-formatting helpers used by `ReminderCard`/`ReminderDetailScreen`: `formatDisplayDate` ("Sep 1, 2026") and `formatDisplayDateTime` ("Sep 1, 2026, 09:00 AM"), both locale-aware via `toLocaleDateString`/`toLocaleString`. (Note: this is a different, more human-readable format than the `dd-mm-yyyy` shown in the date *picker* buttons — that distinction was an explicit choice, not an inconsistency.)

---

## End-to-end example: creating a reminder

1. User taps a category tile on `HomeScreen` → navigates to `CategoryListScreen`.
2. Taps "+ Add Reminder" → navigates to `AddEditReminderScreen` with `{ category }` (no `reminderId`, so it's create-mode).
3. Fills the form; `handleSave` builds a `ReminderInput` and calls `addReminder()` from `RemindersContext`.
4. `RemindersContext.addReminder`: `reminderRepository.create()` inserts the row → `notificationService.scheduleReminder()` schedules the Android notification for the due date → dispatches `ADDED` to update in-memory state.
5. Navigates back to `CategoryListScreen`, which re-renders from the now-updated context state and shows the new `ReminderCard`.
6. At the due date/time, notifee fires the notification (channel + permission were set up once at app start).

---

## What's not built yet (per the original phased plan)

- **Phase 4** — Exact-alarm scheduling (`alarmManager: allowWhileIdle`), notification action buttons (Mark Done / Snooze directly on the notification), a background event handler (`notifee.onBackgroundEvent`) so those actions work even with the app fully killed, and the exact-alarm permission check/prompt flow (`notifications/permissions.ts`).
- **Phase 5** — Recurrence: `notifications/recurrence.ts` to compute the next due date, and wiring `markDone` to reschedule instead of just marking done for recurring reminders.
- **Phase 6** — Further polish: category dashboard counts, "notes" custom-category autocomplete (the repository function already exists, just unused), empty-state/theming refinement.

## Notable decisions worth knowing if you keep working on this

- **Android only.** Web support exists solely as a fast local dev-preview convenience (hence the two web-only files); nothing here is meant to ship to browsers.
- **Custom dev client, not Expo Go**, from Phase 3 onward — required by `@notifee/react-native`. Built via EAS cloud (no local Android SDK on this machine). Rebuilding is only needed when a *new native module* is added — pure JS/asset additions (like the Poppins font, which reuses the already-linked `expo-font` native module) don't require it.
- **`notification_id` cancel/reschedule always uses `String(reminder.id)`** rather than a separately generated id — the DB column exists but isn't populated, since it isn't needed under this scheme.
- The **declarative** `<DateTimePicker>` React component was tried first for date entry and proved unreliable on Android (dialog wouldn't reliably reopen); it was replaced with the imperative `DateTimePickerAndroid.open()` API, which is now the pattern to follow for any future picker-like native dialog needs.
