import { requireNativeModule } from 'expo-modules-core';

interface SmsSenderNativeModule {
  sendSmsAsync(phoneNumber: string, message: string): Promise<void>;
}

const NativeSmsSender = requireNativeModule<SmsSenderNativeModule>('SmsSender');

export async function sendSmsAsync(phoneNumber: string, message: string): Promise<void> {
  await NativeSmsSender.sendSmsAsync(phoneNumber, message);
}
