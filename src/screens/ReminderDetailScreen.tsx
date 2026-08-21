import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReminderDetail'>;

export default function ReminderDetailScreen({ route }: Props) {
  const { reminderId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Detail view for reminder #{reminderId} arrives in Phase 2, with Mark Done / Snooze / Delete
        actions wired up in later phases.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  placeholder: { color: '#6B7280' },
});
