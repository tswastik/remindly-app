import { registerRootComponent } from 'expo';

import App from './App';
import { registerBackgroundHandlers } from './src/notifications/notificationService';
import { handleNotificationAction, handleAdvanceSms } from './src/notifications/actionHandlers';

// Registered before the app root so Mark Done / Snooze (and Phase 7's
// silent SMS on a Special Day's advance notification) work even if the app
// process was fully killed - notifee wakes this handler up on its own. Both
// cases are dispatched from this single registration since notifee only
// allows one onBackgroundEvent listener for the whole app.
registerBackgroundHandlers({
  onAction: ({ actionId, reminderId }) => handleNotificationAction(actionId, reminderId),
  onAdvanceSms: ({ reminderId, phoneNumber }) => handleAdvanceSms(reminderId, phoneNumber),
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
