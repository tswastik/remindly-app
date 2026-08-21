import type { Category } from '../types/reminder';

export interface CategoryDef {
  id: Category;
  label: string;
  icon: string; // emoji used as a placeholder icon for now
  subcategories: string[]; // fixed sub-item choices offered in the Add/Edit form; empty = free text
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'financial',
    label: 'Financial Obligations',
    icon: '💳',
    subcategories: [
      'Credit Card Due',
      'Investment Due',
      'Insurance Premium Due',
      'Bill Payment Due',
      'Liability Due',
      'Other',
    ],
  },
  {
    id: 'personal_event',
    label: 'Birthdays & Anniversaries',
    icon: '🎂',
    subcategories: ['Birthday', 'Anniversary', 'Other'],
  },
  {
    id: 'todo',
    label: 'Daily To-Do',
    icon: '✅',
    subcategories: [],
  },
  {
    id: 'maintenance',
    label: 'Maintenance Due',
    icon: '🔧',
    subcategories: ['Vehicle Service', 'Gas Refilling', 'TV Recharge', 'Water Purifier Maintenance', 'Other'],
  },
  {
    id: 'study',
    label: 'Study Reminder',
    icon: '📚',
    subcategories: [],
  },
  {
    id: 'note',
    label: 'Memorize / Notes',
    icon: '📝',
    subcategories: [], // free-text custom category, entered by the user
  },
  {
    id: 'vacation',
    label: 'Vacation / Outing Plan',
    icon: '🏖️',
    subcategories: [],
  },
];

export function getCategoryDef(id: Category): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown category: ${id}`);
  return def;
}
