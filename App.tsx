import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { RemindersProvider } from './src/context/RemindersContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({ Poppins_700Bold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <RemindersProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </RemindersProvider>
    </SafeAreaProvider>
  );
}
