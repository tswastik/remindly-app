# Reminder & Notification App (Android, React Native + Expo)

## Context

The user wants a personal Android app to create reminders with a due date across several life categories (financial obligations, birthdays, daily to-dos, maintenance, study, free-text "memorize" notes, and vacation/outing plans), and to have the reminder/notification automatically stop once the task is marked done — with recurring reminders (e.g. monthly bills, yearly birthdays) rescheduling themselves to the next occurrence instead of disappearing. Vacation/outing plans are a distinct shape from the rest: instead of a single due date, they block a **range of dates** and carry a preferred destination plus a shortlist of candidate places to stay.

The project directory is currently empty — this is a greenfield build. The user has confirmed: **React Native (Expo)**, **Android only**, **local-only storage (no backend)**, and a **learning-focused** approach where code should be clear and buildable in incremental, testable steps rather than maximally polished/production-hardened.

A key technical constraint drives several choices below: reminders must fire via **exact alarms**, even when the app is backgrounded or fully killed, and must support **Mark Done / Snooze action buttons directly on the notification**. Expo Go cannot deliver this reliably, so the plan uses Expo's managed workflow with a **custom dev client** (`expo prebuild` + `expo run:android`) instead of Expo Go from Phase 3 onward.

## Tech Stack & Libraries

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo (managed + custom dev client) | Keeps JS/TS-only workflow and config plugins, but unlocks native modules Expo Go can't load |
| Notifications | `@notifee/react-native` | Only mainstream RN lib exposing Android exact-alarm triggers (`AlarmManager.setExactAndAllowWhileIdle`), custom notification action buttons, and a background event handler that runs even when the app process is killed. `expo-notifications` isn't reliable enough for exact/killed-state delivery. |
| Local DB | `expo-sqlite` | First-party Expo module, simple async API, fits a single-table relational model well |
| Navigation | `@react-navigation/native` + `native-stack` | Standard, easy to reason about for a learner |
| Date/time picker | `@react-native-community/datetimepicker` | Standard native Android picker |
| Date math | `date-fns` | Clear, pure helpers (`addDays`, `addMonths`, `addYears`) for recurrence |
| State management | React Context + `useReducer` (no Redux) | Single entity type, no sync — Context is sufficient and simpler to learn |

## Data Model (SQLite)

One `reminders` table. Category is a constrained text field (validated in-app, not via DB `CHECK`, to keep migrations simple). `subcategory` doubles as the fixed sub-item label (e.g. `credit_card_due`, `vehicle_service`) and as the free-text custom category for the "notes" bucket. Three extra nullable columns support the vacation category's date-range + destination + stay-shortlist shape without needing a second table.

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,              -- 'financial' | 'personal_event' | 'todo' | 'maintenance' | 'study' | 'note' | 'vacation'
  subcategory TEXT,                    -- e.g. 'credit_card_due', 'birthday', 'vehicle_service', or custom free-text label
  title TEXT NOT NULL,
  notes TEXT,
  due_date TEXT NOT NULL,              -- ISO 8601; for 'vacation' this is the trip START date
  end_date TEXT,                       -- ISO 8601; only used for 'vacation' — the trip END date, defines the blocked range
  destination TEXT,                    -- only used for 'vacation' — preferred destination
  stay_options TEXT,                   -- only used for 'vacation' — JSON array of shortlisted places to stay, e.g. ["Hotel A","Resort B"]
  recurrence_type TEXT NOT NULL DEFAULT 'none',   -- 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days'
  recurrence_interval INTEGER,         -- only used when recurrence_type = 'custom_days'
  status TEXT NOT NULL DEFAULT 'active',          -- 'active' | 'done' | 'snoozed'
  snoozed_until TEXT,
  notification_id TEXT,                -- == id as string; used to cancel/reschedule with notifee
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_category ON reminders(category);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
```

Personal events (birthdays/anniversaries) need no special schema — just `category='personal_event'`, `recurrence_type='yearly'`. No separate custom-categories table: for the "notes" bucket, the Add/Edit screen offers autocomplete via `SELECT DISTINCT subcategory FROM reminders WHERE category='note'`.

Vacation entries store `stay_options` as a JSON-encoded string array (parsed/serialized in `reminderRepository.ts`) rather than a separate join table — kept simple since each trip typically has a handful of shortlisted places and there's no need to query into that list independently. Recurrence isn't meaningful for vacations, so the Add/Edit form fixes `recurrence_type='none'` when `category='vacation'`. The notification is scheduled against `due_date` (trip start) as a "trip coming up" alert; `end_date` exists purely to record/display the blocked range (e.g. greying out those days in a future calendar view) and is not itself an alarm trigger.

## App Architecture

**Folder structure:**
```
src/
  types/reminder.ts
  db/database.ts               # open/init SQLite + migrations
  db/reminderRepository.ts     # CRUD functions
  notifications/notificationService.ts   # schedule/cancel via notifee
  notifications/permissions.ts
  notifications/recurrence.ts  # computeNextDueDate(date, type, interval)
  context/RemindersContext.tsx # Context + useReducer, wraps repository + notifications
  navigation/AppNavigator.tsx
  screens/HomeScreen.tsx               # 7 category tiles w/ counts
  screens/CategoryListScreen.tsx       # reminders within one category
  screens/AddEditReminderScreen.tsx    # shared create/edit form (branches to a date-range + destination + stay-options layout for 'vacation')
  screens/ReminderDetailScreen.tsx
  components/ (ReminderCard, CategoryTile, RecurrencePicker, DateTimeField, DateRangeField, StayOptionsEditor)
  constants/categories.ts
index.js                        # registers notifee background handler before app root
```

**Data/notification flow** — all mutations go through `RemindersContext` actions, which do DB write + notification schedule/cancel + in-memory state update together:
- `addReminder` → insert row → `scheduleReminder`
- `updateReminder` → update row → cancel old notification → schedule new one (always cancel-then-reschedule, no diffing)
- `markDone` → cancel notification → if recurring, compute next `due_date` via `recurrence.ts`, keep `status='active'`, reschedule; else `status='done'`
- `snoozeReminder` → cancel current notification → `status='snoozed'`, `snoozed_until` set → schedule one-off notification at snooze time

## Notification Scheduling (notifee)

```ts
const trigger: TimestampTrigger = {
  type: TriggerType.TIMESTAMP,
  timestamp: new Date(reminder.due_date).getTime(),
  alarmManager: { allowWhileIdle: true },   // exact alarm
};
await notifee.createTriggerNotification({
  id: String(reminder.id),
  title: reminder.title,
  body: reminder.notes ?? categoryLabel(reminder.category),
  android: {
    channelId: 'reminders-default',
    pressAction: { id: 'default' },
    actions: [
      { title: 'Mark Done', pressAction: { id: 'mark-done' } },
      { title: 'Snooze', pressAction: { id: 'snooze' } },
    ],
  },
}, trigger);
```

`index.js` registers `notifee.onBackgroundEvent` **before** the app root, so action presses are handled even from a killed process — it calls into `reminderRepository`/`notificationService` directly (no React tree available), mirroring the same mark-done/snooze logic used in-app. Also add `notifee.onForegroundEvent` so in-app state refreshes immediately when the app is open.

**Permissions:**
- `POST_NOTIFICATIONS` (Android 13+): request via `notifee.requestPermission()` on first launch.
- `SCHEDULE_EXACT_ALARM` (Android 12+): no runtime dialog — check `notifee.getNotificationSettings().android.alarm`, and if disabled, show an explanatory prompt and deep-link via `notifee.openAlarmPermissionSettings()`.

## Build Phases (incremental, each independently testable)

1. **Scaffold + navigation shell** — `create-expo-app`, install navigation, stub screens (Home → Category List → Add/Edit → Detail) with no data. Runs fine in Expo Go at this stage.
2. **SQLite CRUD** — `expo-sqlite`, `database.ts`, `reminderRepository.ts`, `RemindersContext`. Working add/edit/delete + list for one category, no notifications yet. Verify persistence across restarts.
3. **Basic local notification** — install `@notifee/react-native`, `expo prebuild` + `expo run:android` (leave Expo Go here for good), create a channel, schedule a plain trigger notification (no exact alarm, no actions) on create. Verify it fires while backgrounded.
4. **Exact alarms + Mark Done/Snooze actions** — add `alarmManager: { allowWhileIdle: true }`, action buttons, `index.js` background/foreground handlers, permission prompts. Test thoroughly on a real device, both backgrounded and fully killed (highest-risk phase).
5. **Recurrence logic** — `recurrence.ts` (`computeNextDueDate`), wire `markDone` to reschedule recurring reminders, apply the same logic inside the background handler. Verify next occurrence is computed and scheduled correctly.
6. **Category UI polish** — dashboard tiles/counts, subcategory pickers per fixed category, free-text + custom-category input with autocomplete for the "notes" bucket, snooze UI, empty states, basic theming, and the vacation category's dedicated form (start/end date range picker, destination text field, add/remove list of shortlisted stay options via `StayOptionsEditor`).

## Verification

- Phases 1–2: Expo Go or dev client, straightforward manual testing of CRUD + navigation.
- Phase 3+: must use the dev client (`expo run:android` or `eas build --profile development` APK), since Expo Go can't load `@notifee/react-native`.
- Prefer a **real Android device** for Phase 4+ (emulator doze/battery behavior doesn't match real hardware; manufacturer battery-optimization quirks — e.g. Xiaomi/Samsung — are worth being aware of).
- Backgrounded test: schedule ~2 min out, press Home (don't force-stop), confirm notification + both actions work.
- Killed-app test: schedule, force-stop the app (or swipe from recents), confirm the notification still fires at the exact time and that pressing an action correctly runs `index.js`'s background handler and updates the DB (verify by reopening the app).
- Exact-alarm permission test: manually disable "Alarms & reminders" in system Settings, confirm the app detects `DISABLED` via `notifee.getNotificationSettings()` and that `openAlarmPermissionSettings()` deep-links correctly.
- Recurrence test: mark a recurring reminder done, confirm a new occurrence is scheduled with the correct next `due_date` (a simple hidden debug screen dumping all DB rows is a reasonable Phase 2 addition to make this easy to check).

## Critical Files
- `src/db/database.ts`, `src/db/reminderRepository.ts`
- `src/notifications/notificationService.ts`, `src/notifications/recurrence.ts`
- `src/context/RemindersContext.tsx`
- `index.js` (background notification handler)
- `app.json` (notifee config plugin + Android permissions)

---

## Phase 6 — Advance Reminder Notifications (all categories)

**Goal:** in addition to the existing at-due-time exact-alarm notification, fire an earlier "heads up" notification before the due moment, across all 7 categories.

**Schema:** add a nullable `advance_minutes INTEGER` column to `reminders` (migration in `database.ts`). `NULL`/`0` = no advance notice. Editable per reminder in the Add/Edit form via a picker (None / 15 min / 1 hour / 1 day / 3 days / 1 week). The form suggests a category-based default when creating a new reminder (e.g. `personal_event`/`financial`/`vacation` → 1 day, `todo`/`maintenance`/`study`/`note` → None) but it's always explicitly stored per reminder, never recomputed from category later.

**Scheduling (`notificationService.ts`):**
- `scheduleReminder()` gains a sibling `scheduleAdvanceNotification()` — id `${reminder.id}-advance`, trigger timestamp = `due_date - advance_minutes`, only scheduled if that timestamp is still in the future.
- `cancelReminder()` cancels both `String(id)` and `${id}-advance`.
- The advance notification is display-only: title "Upcoming: {title}", body = due date/time + category label, `pressAction: { id: 'default' }` — same as the main notification, which currently just opens the app (no existing deep-link-to-detail-screen infra in this codebase, so Phase 6 doesn't add one). No Mark Done/Snooze actions on it — those stay exclusively on the real due-time alert so nothing can be marked done early.
- Same cancel-then-reschedule pattern as the main notification on edit.

**UI:** Add/Edit form gets a new "Remind me earlier" picker next to the due date/time field.

**No new native dependency.** Pure JS/SQLite + notifee (already linked) — **no EAS rebuild needed**, hot-reloads like any other JS change.

**Verification:** schedule a reminder a few minutes out with a short advance notice to confirm both notifications fire independently and on time; confirm the skip-if-past-due logic doesn't schedule an advance notification that would fire after (or very close to) the main one; confirm editing/deleting cancels both.

## Phase 7 — Special Days SMS Alert (1 day before, silent auto-send)

**Goal:** for `personal_event` ("Special Days") reminders specifically, silently send a real SMS 1 day before, in addition to the Phase 6 advance notification.

**Why SMS, not WhatsApp:** WhatsApp has no free silent-send option — the only fully automatic route is the paid Meta/Twilio Business API (per-message cost + Business account + template approval), overkill for a personal single-recipient app. Device-native SMS is free (your own SIM/carrier plan) but Expo's own `expo-sms` module isn't silent either — it just opens the Messages app for you to tap Send. True silent sending needs a module that calls Android's `SmsManager` directly; the community packages for this (`react-native-send-sms`, `react-native-sms-x`, `react-native-get-sms-android`) are all abandoned (last released 2016–2020, predate the New Architecture this project already requires), so instead of depending on one, Phase 7 adds a small custom native module.

**Recipient:** defaults to the phone number already stored on the Profile screen (Phase 5); an optional per-reminder override field (shown only when category = `personal_event`) lets a specific Special Day SMS a different number instead.

**Schema:** add `sms_enabled INTEGER NOT NULL DEFAULT 0` and `sms_phone_override TEXT` (nullable) columns to `reminders`.

**New native module — `modules/sms-sender/` (custom, in-repo, not a 3rd-party dependency):**
- A small Kotlin Android module (~30-40 lines) exposing `sendSms(phoneNumber: string, message: string): Promise<void>`, calling `android.telephony.SmsManager.getDefault().sendTextMessage(...)` directly.
- Scaffolded with `npx create-expo-module --local` so it autolinks into the existing dev client exactly like any other Expo module.
- `SEND_SMS` manifest permission added to `app.json`'s `android.permissions` array (same place `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` already live).
- Runtime permission requested via React Native core's `PermissionsAndroid.request('android.permission.SEND_SMS')`, prompted the first time a `personal_event` reminder with SMS enabled is saved — mirrors the existing exact-alarm permission-prompt pattern already used in `RemindersContext`'s startup check.

**Trigger mechanism — reuses Phase 6's scheduling, no separate alarm:**
- The Phase 6 `${id}-advance` trigger notification, for a `personal_event` reminder with `sms_enabled`, carries extra notifee notification data (`{ smsEnabled: true, phoneNumber }`), and its lead time defaults to a fixed 1 day (reusing the same `advance_minutes` column, just not user-editable for this category).
- `index.ts`'s existing `notifee.onBackgroundEvent`/`onForegroundEvent` handlers (already wired for Mark Done/Snooze) get a new case: `EventType.DELIVERED` on a `-advance` notification with `smsEnabled` data → call `SmsSender.sendSms(...)`. This fires identically whether the app is foregrounded, backgrounded, or fully killed, the same way action-button presses already do.

**Build impact:** this is a new native module, so it needs one EAS dev-client rebuild (same category of work as the original notifee setup in Phase 3/4) — JS/UI changes after that hot-reload as normal.

**Cost:** $0 — your own SIM via Android's native SMS API, no account, no API key, no per-message fee beyond whatever your carrier plan already charges for SMS (most Indian plans bundle these free).

**Verification:** real-device test with `SEND_SMS` granted — confirm the SMS actually arrives at the target number (shorten the lead time to a few minutes for testing rather than waiting a real day); test with the app foregrounded, backgrounded, and fully killed, same 3-state matrix as the original Phase 4 exact-alarm testing; test the permission-denied path — confirm it fails gracefully (no crash, the regular push notification still fires) if `SEND_SMS` is refused.

**New critical files:**
- `src/db/database.ts` — migration for `advance_minutes`, `sms_enabled`, `sms_phone_override`
- `src/notifications/notificationService.ts` — advance notification scheduling/cancellation
- `index.ts` — new `EventType.DELIVERED` case
- `modules/sms-sender/` — new local native module (Kotlin)
- `app.json` — `SEND_SMS` permission
