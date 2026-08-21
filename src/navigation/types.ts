import type { Category } from '../types/reminder';

export type RootStackParamList = {
  Home: undefined;
  CategoryList: { category: Category };
  AddEditReminder: { category: Category; reminderId?: number };
  ReminderDetail: { reminderId: number };
};
