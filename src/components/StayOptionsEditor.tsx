import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  options: string[];
  onChange: (options: string[]) => void;
}

export default function StayOptionsEditor({ options, onChange }: Props) {
  const [draft, setDraft] = useState('');

  function addOption() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...options, trimmed]);
    setDraft('');
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <View>
      {options.map((option, index) => (
        <View key={`${option}-${index}`} style={styles.optionRow}>
          <Text style={styles.optionText}>{option}</Text>
          <Pressable onPress={() => removeOption(index)} hitSlop={8}>
            <Text style={styles.removeLabel}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. Hotel Ganga View"
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={addOption}
        />
        <Pressable style={styles.addButton} onPress={addOption}>
          <Text style={styles.addButtonLabel}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionText: { fontSize: 14, color: '#111827', flex: 1 },
  removeLabel: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonLabel: { color: '#fff', fontWeight: '600' },
});
