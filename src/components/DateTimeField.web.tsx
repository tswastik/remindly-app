import type { ChangeEvent, CSSProperties } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Web-only implementation (Metro picks this file automatically when
// bundling for web). @react-native-community/datetimepicker's
// DateTimePickerAndroid is Android-only, so this uses plain HTML date/time
// inputs purely so the app is exercisable in the browser dev-preview —
// Android (the shipped target) uses DateTimeField.tsx instead.

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInputValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DateTimeField({ label, value, onChange, mode = 'datetime' }: Props) {
  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    const [year, month, day] = event.target.value.split('-').map(Number);
    if (!year || !month || !day) return;
    const merged = new Date(value);
    merged.setFullYear(year, month - 1, day);
    onChange(merged);
  }

  function handleTimeChange(event: ChangeEvent<HTMLInputElement>) {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
    const merged = new Date(value);
    merged.setHours(hours, minutes);
    onChange(merged);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <input
          type="date"
          value={toDateInputValue(value)}
          onChange={handleDateChange}
          style={{ ...webInputStyle, flex: 2 }}
        />
        {mode === 'datetime' && (
          <input
            type="time"
            value={toTimeInputValue(value)}
            onChange={handleTimeChange}
            style={{ ...webInputStyle, flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

const webInputStyle: CSSProperties = {
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 12,
  paddingRight: 12,
  fontSize: 14,
  color: '#111827',
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
});
