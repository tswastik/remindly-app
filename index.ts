import { registerRootComponent } from 'expo';

import App from './App';
import { onBackgroundAction } from './src/notifications/notificationService';
import { handleNotificationAction } from './src/notifications/actionHandlers';

// Registered before the app root so Mark Done / Snooze work even if the app
// process was fully killed - notifee wakes this handler up on its own.
onBackgroundAction(({ actionId, reminderId }) => handleNotificationAction(actionId, reminderId));

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
