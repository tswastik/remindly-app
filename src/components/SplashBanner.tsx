import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  readyToContinue: boolean;
  onGetStarted: () => void;
}

export default function SplashBanner({ readyToContinue, onGetStarted }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Remindly App Background.png')}
        style={styles.image}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.overlay} edges={['bottom']} pointerEvents="box-none">
        {readyToContinue && (
          <Pressable style={styles.button} onPress={onGetStarted}>
            <Text style={styles.buttonLabel}>Let's Get Started</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E88C7' },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 48,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
