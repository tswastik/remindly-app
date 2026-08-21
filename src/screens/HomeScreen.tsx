import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CATEGORIES } from '../constants/categories';
import AbstractBackground from '../components/AbstractBackground';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <AbstractBackground />
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Pressable
            style={styles.tile}
            onPress={() => navigation.navigate('CategoryList', { category: item.id })}
          >
            <Text style={styles.tileIcon}>{item.icon}</Text>
            <Text style={styles.tileLabel}>{item.label}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { padding: 12 },
  tile: {
    flex: 1,
    margin: 8,
    minHeight: 110,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#1F2937',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tileIcon: { fontSize: 32, marginBottom: 8 },
  tileLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#1F2937' },
});
