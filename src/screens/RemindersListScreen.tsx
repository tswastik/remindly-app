import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useReminders } from '../context/RemindersContext';
import ReminderCard from '../components/ReminderCard';
import AbstractBackground from '../components/AbstractBackground';
import type { RemindersTabScreenProps } from '../navigation/types';

type Props = RemindersTabScreenProps;

export default function RemindersListScreen({ navigation }: Props) {
  const { reminders, loading } = useReminders();

  return (
    <View style={styles.container}>
      <AbstractBackground />
      {!loading && reminders.length === 0 ? (
        <Text style={styles.placeholder}>No reminders yet. Add one from a category on Home.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { paddingBottom: 12 },
  placeholder: { color: '#6B7280' },
});
