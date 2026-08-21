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
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Reminders' }} />
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
