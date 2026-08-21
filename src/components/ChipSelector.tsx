import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ChipOption {
  label: string;
  value: string;
}

interface Props {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function ChipSelector({ options, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F2F5FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipLabel: { color: '#374151', fontSize: 13, fontWeight: '500' },
  chipLabelSelected: { color: '#fff' },
});
