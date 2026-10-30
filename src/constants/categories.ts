import type { Category } from '../types/reminder';

export interface CategoryDef {
  id: Category;
  label: string;
  icon: string; // emoji used as a placeholder icon for now
  subcategories: string[]; // fixed sub-item choices offered in the Add/Edit form; empty = free text
  defaultAdvanceMinutes: number; // suggested "remind me earlier" lead time for new reminders; 0 = none
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'financial',
    label: 'Money Matters',
    icon: '💳',
    subcategories: [
      'Credit Card Due',
      'Investment Due',
      'Insurance Premium Due',
      'Bill Payment Due',
      'Liability Due',
      'Other',
    ],
    defaultAdvanceMinutes: 1440,
  },
  {
    id: 'personal_event',
    label: 'Special Days',
    icon: '🎂',
    subcategories: ['Birthday', 'Anniversary', 'Other'],
    defaultAdvanceMinutes: 1440,
  },
  {
    id: 'todo',
    label: 'Daily Tasks',
    icon: '✅',
    subcategories: [],
    defaultAdvanceMinutes: 0,
  },
  {
    id: 'maintenance',
    label: 'Upkeep',
    icon: '🔧',
    subcategories: ['Vehicle Service', 'Gas Refilling', 'TV Recharge', 'Water Purifier Maintenance', 'Other'],
    defaultAdvanceMinutes: 0,
  },
  {
    id: 'study',
    label: 'Study Buzz',
    icon: '📚',
    subcategories: [],
    defaultAdvanceMinutes: 0,
  },
  {
    id: 'note',
    label: 'Quick Notes',
    icon: '📝',
    subcategories: [], // free-text custom category, entered by the user
    defaultAdvanceMinutes: 0,
  },
  {
    id: 'vacation',
    label: 'Plans Ahead',
    icon: '🏖️',
    subcategories: [],
    defaultAdvanceMinutes: 1440,
  },
];

export function getCategoryDef(id: Category): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown category: ${id}`);
  return def;
}
