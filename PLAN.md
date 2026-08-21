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
