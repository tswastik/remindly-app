import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RemindersProvider } from './src/context/RemindersContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <RemindersProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </RemindersProvider>
    </SafeAreaProvider>
  );
}
