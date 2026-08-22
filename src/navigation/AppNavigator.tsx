import { Image, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CategoryListScreen from '../screens/CategoryListScreen';
import AddEditReminderScreen from '../screens/AddEditReminderScreen';
import ReminderDetailScreen from '../screens/ReminderDetailScreen';
import { getCategoryDef } from '../constants/categories';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitleAlign: 'center',
            headerBackground: () => (
              <Image
                source={require('../../assets/header-gradient.png')}
                style={styles.headerBackground}
                resizeMode="cover"
              />
            ),
            headerTitle: () => (
              <Image
                source={require('../../assets/Remindly Font.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            ),
          }}
        />
        <Stack.Screen
          name="CategoryList"
          component={CategoryListScreen}
          options={({ route }) => ({ title: getCategoryDef(route.params.category).label })}
        />
        <Stack.Screen
          name="AddEditReminder"
          component={AddEditReminderScreen}
          options={({ route }) => ({
            title: route.params.reminderId ? 'Edit Reminder' : 'New Reminder',
          })}
        />
        <Stack.Screen
          name="ReminderDetail"
          component={ReminderDetailScreen}
          options={{ title: 'Reminder Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerLogo: { width: 122, height: 56 },
});
