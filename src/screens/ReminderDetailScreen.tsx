import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCategoryDef } from '../constants/categories';
import { useReminder, useReminders } from '../context/RemindersContext';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateFormat';
import AbstractBackground from '../components/AbstractBackground';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReminderDetail'>;

export default function ReminderDetailScreen({ route, navigation }: Props) {
  const { reminderId } = route.params;
  const reminder = useReminder(reminderId);
  const { markDone, deleteReminder } = useReminders();

  if (!reminder) {
    return (
      <View style={styles.container}>
        <AbstractBackground />
        <Text style={styles.placeholder}>Reminder not found.</Text>
      </View>
    );
  }

  const def = getCategoryDef(reminder.category);

  function handleDelete() {
    Alert.alert('Delete reminder?', `"${reminder!.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReminder(reminder!.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <AbstractBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.category}>
        {def.icon} {def.label}
      </Text>
      <Text style={styles.title}>{reminder.title}</Text>
      {reminder.subcategory && <Text style={styles.subcategory}>{reminder.subcategory}</Text>}

      {reminder.category === 'vacation' ? (
        <>
          <DetailRow
            label="Dates"
            value={
              reminder.endDate
                ? `${formatDisplayDate(reminder.dueDate)} – ${formatDisplayDate(reminder.endDate)}`
                : formatDisplayDate(reminder.dueDate)
            }
          />
          {reminder.destination && <DetailRow label="Destination" value={reminder.destination} />}
          {reminder.stayOptions && reminder.stayOptions.length > 0 && (
            <DetailRow label="Shortlisted Stays" value={reminder.stayOptions.join(', ')} />
          )}
        </>
      ) : (
        <>
          <DetailRow label="Due" value={formatDisplayDateTime(reminder.dueDate)} />
          <DetailRow label="Repeats" value={formatRecurrence(reminder)} />
        </>
      )}

      {reminder.notes && <DetailRow label="Notes" value={reminder.notes} />}
      <DetailRow label="Status" value={reminder.status} />

      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={() =>
            navigation.navigate('AddEditReminder', {
              category: reminder.category,
              reminderId: reminder.id,
            })
          }
        >
          <Text style={styles.actionLabel}>Edit</Text>
        </Pressable>
        {reminder.status !== 'done' && (
          <Pressable
            style={[styles.actionButton, styles.doneButton]}
            onPress={() => markDone(reminder.id)}
          >
            <Text style={styles.actionLabel}>Mark Done</Text>
          </Pressable>
        )}
        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
          <Text style={[styles.actionLabel, styles.deleteLabel]}>Delete</Text>
        </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}

function formatRecurrence(reminder: { recurrenceType: string; recurrenceInterval: number | null }) {
  if (reminder.recurrenceType === 'none') return 'Does not repeat';
  if (reminder.recurrenceType === 'custom_days') return `Every ${reminder.recurrenceInterval} days`;
  return reminder.recurrenceType.charAt(0).toUpperCase() + reminder.recurrenceType.slice(1);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  placeholder: { color: '#6B7280' },
  category: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subcategory: { fontSize: 14, color: '#374151', marginBottom: 16 },
  row: { marginBottom: 12 },
  rowLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 2 },
  rowValue: { fontSize: 15, color: '#111827' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  doneButton: { backgroundColor: '#16A34A' },
  deleteButton: { backgroundColor: '#FEE2E2' },
  actionLabel: { color: '#fff', fontWeight: '600' },
  deleteLabel: { color: '#DC2626' },
});
