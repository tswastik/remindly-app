import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCategoryDef } from '../constants/categories';
import { useReminder, useReminders } from '../context/RemindersContext';
import ChipSelector from '../components/ChipSelector';
import DateTimeField from '../components/DateTimeField';
import StayOptionsEditor from '../components/StayOptionsEditor';
import AbstractBackground from '../components/AbstractBackground';
import type { RecurrenceType, ReminderInput } from '../types/reminder';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditReminder'>;

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom_days' },
];

// Encoded as strings (minutes, or 'none') to fit ChipSelector's string-only value type.
const ADVANCE_OPTIONS: { label: string; value: string }[] = [
  { label: 'None', value: 'none' },
  { label: '15 min before', value: '15' },
  { label: '1 hour before', value: '60' },
  { label: '1 day before', value: '1440' },
  { label: '3 days before', value: '4320' },
  { label: '1 week before', value: '10080' },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function defaultDueTime(date: Date): Date {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  return d;
}

const OTHER_SUBCATEGORY = 'Other';

export default function AddEditReminderScreen({ route, navigation }: Props) {
  const { category, reminderId } = route.params;
  const def = getCategoryDef(category);
  const existing = useReminder(reminderId);
  const { addReminder, updateReminder } = useReminders();
  const isVacation = category === 'vacation';
  const hasFixedSubcategories = def.subcategories.length > 0;
  const hasFreeTextSubcategory = category === 'note';
  const existingSubcategoryIsCustom =
    hasFixedSubcategories && !!existing?.subcategory && !def.subcategories.includes(existing.subcategory);

  const [subcategory, setSubcategory] = useState(() => {
    if (existingSubcategoryIsCustom) return OTHER_SUBCATEGORY;
    return existing?.subcategory ?? (hasFixedSubcategories ? def.subcategories[0] : '');
  });
  const [customSubcategory, setCustomSubcategory] = useState(
    existingSubcategoryIsCustom ? (existing!.subcategory as string) : '',
  );
  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [dueDate, setDueDate] = useState(
    existing ? new Date(existing.dueDate) : isVacation ? startOfDay(new Date()) : defaultDueTime(new Date()),
  );
  const [endDate, setEndDate] = useState(
    existing?.endDate ? new Date(existing.endDate) : startOfDay(new Date()),
  );
  const [destination, setDestination] = useState(existing?.destination ?? '');
  const [stayOptions, setStayOptions] = useState<string[]>(existing?.stayOptions ?? []);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    existing?.recurrenceType ?? 'none',
  );
  const [recurrenceIntervalInput, setRecurrenceIntervalInput] = useState(
    existing?.recurrenceInterval ? String(existing.recurrenceInterval) : '',
  );
  const [advanceMinutes, setAdvanceMinutes] = useState<string>(() => {
    if (existing) return existing.advanceMinutes ? String(existing.advanceMinutes) : 'none';
    return def.defaultAdvanceMinutes > 0 ? String(def.defaultAdvanceMinutes) : 'none';
  });

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this reminder.');
      return;
    }

    const resolvedSubcategory =
      hasFixedSubcategories && subcategory === OTHER_SUBCATEGORY
        ? customSubcategory.trim() || OTHER_SUBCATEGORY
        : subcategory;

    const input: ReminderInput = {
      category,
      subcategory: resolvedSubcategory.trim() ? resolvedSubcategory.trim() : null,
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      dueDate: dueDate.toISOString(),
      endDate: isVacation ? endDate.toISOString() : null,
      destination: isVacation ? destination.trim() || null : null,
      stayOptions: isVacation && stayOptions.length > 0 ? stayOptions : null,
      advanceMinutes: advanceMinutes === 'none' ? null : Number(advanceMinutes),
      recurrenceType: isVacation ? 'none' : recurrenceType,
      recurrenceInterval:
        !isVacation && recurrenceType === 'custom_days' ? Number(recurrenceIntervalInput) || null : null,
      status: existing?.status ?? 'active',
      snoozedUntil: existing?.snoozedUntil ?? null,
    };

    if (reminderId) {
      await updateReminder(reminderId, input);
    } else {
      await addReminder(input);
    }
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <AbstractBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {hasFixedSubcategories && (
        <Field label="Type">
          <ChipSelector
            options={def.subcategories.map((s) => ({ label: s, value: s }))}
            value={subcategory}
            onChange={setSubcategory}
          />
        </Field>
      )}

      {hasFixedSubcategories && subcategory === OTHER_SUBCATEGORY && (
        <Field label="Please specify">
          <TextInput
            style={styles.input}
            value={customSubcategory}
            onChangeText={setCustomSubcategory}
            placeholder="e.g. Loan EMI"
            placeholderTextColor="#9CA3AF"
          />
        </Field>
      )}

      {hasFreeTextSubcategory && (
        <Field label="Custom Category">
          <TextInput
            style={styles.input}
            value={subcategory}
            onChangeText={setSubcategory}
            placeholder="e.g. Recipes, Gift Ideas"
            placeholderTextColor="#9CA3AF"
          />
        </Field>
      )}

      <Field label="Title">
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Reminder title"
          placeholderTextColor="#9CA3AF"
        />
      </Field>

      <Field label="Notes">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional details"
          placeholderTextColor="#9CA3AF"
          multiline
        />
      </Field>

      {isVacation ? (
        <>
          <DateTimeField label="Start Date" value={dueDate} onChange={setDueDate} mode="date" />
          <DateTimeField label="End Date" value={endDate} onChange={setEndDate} mode="date" />
          <Field label="Preferred Destination">
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Manali"
              placeholderTextColor="#9CA3AF"
            />
          </Field>
          <Field label="Shortlisted Places to Stay">
            <StayOptionsEditor options={stayOptions} onChange={setStayOptions} />
          </Field>
        </>
      ) : (
        <>
          <DateTimeField label="Due" value={dueDate} onChange={setDueDate} />
          <Field label="Repeats">
            <ChipSelector options={RECURRENCE_OPTIONS} value={recurrenceType} onChange={(v) => setRecurrenceType(v as RecurrenceType)} />
          </Field>
          {recurrenceType === 'custom_days' && (
            <Field label="Repeat every N days">
              <TextInput
                style={styles.input}
                value={recurrenceIntervalInput}
                onChangeText={setRecurrenceIntervalInput}
                placeholder="e.g. 45"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </Field>
          )}
        </>
      )}

      <Field label="Remind Me Earlier">
        <ChipSelector options={ADVANCE_OPTIONS} value={advanceMinutes} onChange={setAdvanceMinutes} />
      </Field>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonLabel}>{reminderId ? 'Save Changes' : 'Create Reminder'}</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  saveButtonLabel: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
