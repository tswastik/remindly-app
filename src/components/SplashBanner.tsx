import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  readyToContinue: boolean;
  onGetStarted: () => void;
}

export default function SplashBanner({ readyToContinue, onGetStarted }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Remindly App Background.png')}
        style={styles.image}
        resizeMode="cover"
      />
      {readyToContinue && (
        <Pressable
          style={[styles.button, { bottom: insets.bottom + 48 }]}
          onPress={onGetStarted}
        >
          <Text style={styles.buttonLabel}>Let's Get Started</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E88C7' },
  image: { flex: 1, width: '100%', height: '100%' },
  button: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonLabel: { color: '#1E88C7', fontWeight: '700', fontSize: 16 },
});
