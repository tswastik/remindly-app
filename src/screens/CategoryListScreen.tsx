import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCategoryDef } from '../constants/categories';
import { useRemindersByCategory } from '../context/RemindersContext';
import ReminderCard from '../components/ReminderCard';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryList'>;

export default function CategoryListScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const def = getCategoryDef(category);
  const { reminders, loading } = useRemindersByCategory(category);

  return (
    <View style={styles.container}>
      {!loading && reminders.length === 0 ? (
        <Text style={styles.placeholder}>No reminders yet in "{def.label}".</Text>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReminderCard
              reminder={item}
              onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}
            />
          )}
        />
      )}
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
  list: { paddingBottom: 12 },
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
