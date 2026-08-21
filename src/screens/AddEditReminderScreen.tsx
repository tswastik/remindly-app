import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCategoryDef } from '../constants/categories';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditReminder'>;

export default function AddEditReminderScreen({ route }: Props) {
  const { category, reminderId } = route.params;
  const def = getCategoryDef(category);

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        {reminderId ? 'Edit' : 'Add'} reminder form for "{def.label}" arrives in Phase 2
        {category === 'vacation' ? ' (with date-range, destination, and stay options in Phase 6)' : ''}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  placeholder: { color: '#6B7280' },
});
