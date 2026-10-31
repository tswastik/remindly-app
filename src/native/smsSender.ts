import { PermissionsAndroid, Platform } from 'react-native';
import { sendSmsAsync } from '../../modules/sms-sender';

export async function sendSms(phoneNumber: string, message: string): Promise<void> {
  await sendSmsAsync(phoneNumber, message);
}

// SEND_SMS is a dangerous Android permission with no Expo-level wrapper
// (unlike notifee's POST_NOTIFICATIONS), so it's requested directly via
// React Native core's PermissionsAndroid - same "request on first use"
// pattern as notifee's exact-alarm permission prompt.
export async function requestSendSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
    title: 'Allow SMS reminders?',
    message:
      'Remindly needs the SMS permission to send a text reminder for Special Days you’ve enabled this for.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function hasSendSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
}
