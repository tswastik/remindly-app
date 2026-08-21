import { StyleSheet, View } from 'react-native';

// Muted blue-green abstract shapes — calm, low-contrast backdrop that sits
// behind screen content (opaque cards/tiles/inputs render on top of it).
export default function AbstractBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.shape, styles.shapeOne]} />
      <View style={[styles.shape, styles.shapeTwo]} />
      <View style={[styles.shape, styles.shapeThree]} />
      <View style={[styles.shape, styles.shapeFour]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F4F8F6',
    overflow: 'hidden',
  },
  shape: {
    position: 'absolute',
    borderRadius: 999,
  },
  shapeOne: {
    width: 320,
    height: 320,
    top: -90,
    right: -110,
    backgroundColor: '#BFE0D6',
    opacity: 0.55,
  },
  shapeTwo: {
    width: 260,
    height: 260,
    top: 160,
    left: -120,
    backgroundColor: '#A7C7D9',
    opacity: 0.45,
  },
  shapeThree: {
    width: 220,
    height: 220,
    bottom: -70,
    right: -60,
    backgroundColor: '#8FB7AE',
    opacity: 0.4,
  },
  shapeFour: {
    width: 180,
    height: 180,
    bottom: 130,
    left: -70,
    backgroundColor: '#CFE3D8',
    opacity: 0.5,
  },
});
