import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCategoryDef } from '../constants/categories';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryList'>;

export default function CategoryListScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const def = getCategoryDef(category);

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        No reminders yet in "{def.label}". Reminder storage arrives in Phase 2.
      </Text>
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditReminder', { category })}
      >
        <Text style={styles.fabLabel}>+ Add Reminder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  placeholder: { color: '#6B7280', marginBottom: 16 },
  fab: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fabLabel: { color: '#fff', fontWeight: '600' },
});
