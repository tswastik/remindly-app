import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime'; // 'date' hides the time field entirely (used by vacation start/end)
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date): string {
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DateTimeField({ label, value, onChange, mode = 'datetime' }: Props) {
  function openTimePicker(base: Date) {
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      display: 'default',
      is24Hour: true,
      onChange: (event, selected) => {
        if (event.type !== 'set' || !selected) return;
        const merged = new Date(base);
        merged.setHours(selected.getHours(), selected.getMinutes());
        onChange(merged);
      },
    });
  }

  function openDatePicker() {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      display: 'default',
      onChange: (event, selected) => {
        if (event.type !== 'set' || !selected) return;
        const merged = new Date(value);
        merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        onChange(merged);
        // chain straight into the time picker so one flow picks both
        if (mode === 'datetime') openTimePicker(merged);
      },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.field, styles.dateField]} onPress={openDatePicker}>
          <Text style={styles.value}>{formatDate(value)}</Text>
        </Pressable>
        {mode === 'datetime' && (
          <Pressable style={[styles.field, styles.timeField]} onPress={() => openTimePicker(value)}>
            <Text style={styles.value}>{formatTime(value)}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  field: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateField: { flex: 2 },
  timeField: { flex: 1 },
  value: { fontSize: 14, color: '#111827' },
});
