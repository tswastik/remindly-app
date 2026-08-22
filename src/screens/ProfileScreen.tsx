import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as profileRepository from '../db/profileRepository';
import { useReminders } from '../context/RemindersContext';
import * as exportService from '../export/exportService';
import AbstractBackground from '../components/AbstractBackground';
import type { ProfileTabScreenProps } from '../navigation/types';

type Props = ProfileTabScreenProps;

export default function ProfileScreen(_props: Props) {
  const { reminders, exportBackup, importBackup } = useReminders();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    profileRepository.getProfile().then((profile) => {
      setPhotoUri(profile.photoUri);
      setMobileNumber(profile.mobileNumber ?? '');
      setLoaded(true);
    });
  }, []);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    await profileRepository.saveProfile({ photoUri: uri, mobileNumber });
  }

  async function handleMobileNumberBlur() {
    await profileRepository.saveProfile({ photoUri, mobileNumber: mobileNumber.trim() || null });
  }

  async function runAction(name: string, action: () => Promise<void>) {
    setBusyAction(name);
    try {
      await action();
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(null);
    }
  }

  function handleExportBackup() {
    runAction('export-backup', exportBackup);
  }

  function handleImportBackup() {
    runAction('import-backup', async () => {
      const count = await importBackup();
      if (count > 0) {
        Alert.alert('Backup restored', `Added ${count} reminder${count === 1 ? '' : 's'} from the backup.`);
      }
    });
  }

  function handleExportPdf() {
    runAction('export-pdf', () => exportService.exportRemindersAsPdf(reminders));
  }

  function handleExportExcel() {
    runAction('export-excel', () => exportService.exportRemindersAsExcel(reminders));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AbstractBackground />

      <Pressable style={styles.avatar} onPress={handlePickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>R</Text>
        )}
      </Pressable>
      <Text style={styles.avatarHint}>{loaded ? 'Tap to change photo' : ' '}</Text>

      <Field label="Mobile Number">
        <TextInput
          style={styles.input}
          value={mobileNumber}
          onChangeText={setMobileNumber}
          onBlur={handleMobileNumberBlur}
          placeholder="e.g. +91 98765 43210"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
      </Field>

      <SectionTitle>Backup</SectionTitle>
      <ActionButton
        label="Export Backup"
        busy={busyAction === 'export-backup'}
        onPress={handleExportBackup}
      />
      <ActionButton
        label="Restore from Backup"
        busy={busyAction === 'import-backup'}
        onPress={handleImportBackup}
        style={styles.secondaryButton}
        labelStyle={styles.secondaryButtonLabel}
      />

      <SectionTitle>Export Reminders</SectionTitle>
      <ActionButton label="Export as PDF" busy={busyAction === 'export-pdf'} onPress={handleExportPdf} />
      <ActionButton
        label="Export as Excel"
        busy={busyAction === 'export-excel'}
        onPress={handleExportExcel}
        style={styles.secondaryButton}
        labelStyle={styles.secondaryButtonLabel}
      />
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ActionButton({
  label,
  onPress,
  busy,
  style,
  labelStyle,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  style?: object;
  labelStyle?: object;
}) {
  return (
    <Pressable style={[styles.button, style]} onPress={onPress} disabled={busy}>
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.buttonLabel, labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, alignItems: 'center', paddingBottom: 40 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: '#1F2937',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: '#2A6F5E' },
  avatarHint: { color: '#6B7280', fontSize: 12, marginTop: 8, marginBottom: 20 },
  field: { width: '100%', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2563EB' },
  buttonLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryButtonLabel: { color: '#2563EB' },
});
