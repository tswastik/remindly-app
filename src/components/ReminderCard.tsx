import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Reminder } from '../types/reminder';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateFormat';

interface Props {
  reminder: Reminder;
  onPress: () => void;
}

const STATUS_STYLES: Record<Reminder['status'], { bg: string; text: string; label: string }> = {
  active: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Active' },
  done: { bg: '#DCFCE7', text: '#15803D', label: 'Done' },
  snoozed: { bg: '#FEF3C7', text: '#B45309', label: 'Snoozed' },
};

export default function ReminderCard({ reminder, onPress }: Props) {
  const statusStyle = STATUS_STYLES[reminder.status];
  const dateLabel =
    reminder.category === 'vacation' && reminder.endDate
      ? `${formatDisplayDate(reminder.dueDate)} – ${formatDisplayDate(reminder.endDate)}`
      : formatDisplayDateTime(reminder.dueDate);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {reminder.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>
      {reminder.subcategory && <Text style={styles.subcategory}>{reminder.subcategory}</Text>}
      <Text style={styles.date}>{dateLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  subcategory: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  date: { fontSize: 13, color: '#374151', marginTop: 6 },
});
