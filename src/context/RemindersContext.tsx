import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import * as reminderRepository from '../db/reminderRepository';
import * as notificationService from '../notifications/notificationService';
import type { Category, Reminder, ReminderInput } from '../types/reminder';

interface State {
  reminders: Reminder[];
  loading: boolean;
}

type Action =
  | { type: 'LOADED'; reminders: Reminder[] }
  | { type: 'ADDED'; reminder: Reminder }
  | { type: 'UPDATED'; reminder: Reminder }
  | { type: 'REMOVED'; id: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { reminders: action.reminders, loading: false };
    case 'ADDED':
      return { ...state, reminders: [...state.reminders, action.reminder] };
    case 'UPDATED':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.reminder.id ? action.reminder : r)),
      };
    case 'REMOVED':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };
  }
}

interface RemindersContextValue {
  reminders: Reminder[];
  loading: boolean;
  addReminder: (input: ReminderInput) => Promise<Reminder>;
  updateReminder: (id: number, input: ReminderInput) => Promise<Reminder>;
  deleteReminder: (id: number) => Promise<void>;
  markDone: (id: number) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextValue | undefined>(undefined);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { reminders: [], loading: true });

  useEffect(() => {
    notificationService.ensureChannel();
    notificationService.requestPermissions();
    reminderRepository.listAll().then((reminders) => dispatch({ type: 'LOADED', reminders }));
  }, []);

  const addReminder = useCallback(async (input: ReminderInput) => {
    const reminder = await reminderRepository.create(input);
    await notificationService.scheduleReminder(reminder);
    dispatch({ type: 'ADDED', reminder });
    return reminder;
  }, []);

  const updateReminder = useCallback(async (id: number, input: ReminderInput) => {
    await notificationService.cancelReminder(id);
    const reminder = await reminderRepository.update(id, input);
    await notificationService.scheduleReminder(reminder);
    dispatch({ type: 'UPDATED', reminder });
    return reminder;
  }, []);

  const deleteReminder = useCallback(async (id: number) => {
    await notificationService.cancelReminder(id);
    await reminderRepository.remove(id);
    dispatch({ type: 'REMOVED', id });
  }, []);

  const markDone = useCallback(async (id: number) => {
    await notificationService.cancelReminder(id);
    const reminder = await reminderRepository.updateStatus(id, 'done');
    dispatch({ type: 'UPDATED', reminder });
  }, []);

  const value = useMemo<RemindersContextValue>(
    () => ({
      reminders: state.reminders,
      loading: state.loading,
      addReminder,
      updateReminder,
      deleteReminder,
      markDone,
    }),
    [state, addReminder, updateReminder, deleteReminder, markDone],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used within a RemindersProvider');
  return ctx;
}

export function useRemindersByCategory(category: Category) {
  const ctx = useReminders();
  const reminders = useMemo(
    () => ctx.reminders.filter((r) => r.category === category),
    [ctx.reminders, category],
  );
  return { ...ctx, reminders };
}

export function useReminder(id: number | undefined): Reminder | undefined {
  const { reminders } = useReminders();
  return useMemo(() => reminders.find((r) => r.id === id), [reminders, id]);
}
