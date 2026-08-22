import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Category } from '../types/reminder';

// Root stack: the always-visible tab shell, plus drill-down screens that
// push on top of it and hide the tab bar (standard "detail view" pattern).
export type RootStackParamList = {
  MainTabs: undefined;
  CategoryList: { category: Category };
  AddEditReminder: { category: Category; reminderId?: number };
  ReminderDetail: { reminderId: number };
};

// The bottom tab bar itself: Home, Reminders, Profile.
export type MainTabParamList = {
  HomeTab: undefined;
  RemindersTab: undefined;
  ProfileTab: undefined;
};

// Screens rendered inside a tab need both the tab navigator's props and the
// root stack's, since tapping into a reminder pushes onto the root stack.
export type HomeTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RemindersTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'RemindersTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ProfileTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ProfileTab'>,
  NativeStackScreenProps<RootStackParamList>
>;
