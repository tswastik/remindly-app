import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { RemindersProvider } from './src/context/RemindersContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashBanner from './src/components/SplashBanner';

const SPLASH_MIN_DURATION_MS = 2000;

export default function App() {
  const [fontsLoaded] = useFonts({ Poppins_700Bold });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      {started ? (
        <RemindersProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </RemindersProvider>
      ) : (
        <SplashBanner
          readyToContinue={fontsLoaded && minTimeElapsed}
          onGetStarted={() => setStarted(true)}
        />
      )}
    </SafeAreaProvider>
  );
}
