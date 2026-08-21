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
  },
  {
    id: 'personal_event',
    label: 'Special Days',
    icon: '🎂',
    subcategories: ['Birthday', 'Anniversary', 'Other'],
  },
  {
    id: 'todo',
    label: 'Daily Tasks',
    icon: '✅',
    subcategories: [],
  },
  {
    id: 'maintenance',
    label: 'Upkeep',
    icon: '🔧',
    subcategories: ['Vehicle Service', 'Gas Refilling', 'TV Recharge', 'Water Purifier Maintenance', 'Other'],
  },
  {
    id: 'study',
    label: 'Study Buzz',
    icon: '📚',
    subcategories: [],
  },
  {
    id: 'note',
    label: 'Quick Notes',
    icon: '📝',
    subcategories: [], // free-text custom category, entered by the user
  },
  {
    id: 'vacation',
    label: 'Plans Ahead',
    icon: '🏖️',
    subcategories: [],
  },
];

export function getCategoryDef(id: Category): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown category: ${id}`);
  return def;
}
