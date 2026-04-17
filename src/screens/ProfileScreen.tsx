import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Activity, RefreshCw, Flame, Bell, Scale } from 'lucide-react-native';
import { resetExercises, resetHistory, resetDatabase, resetBodyWeightEntries, getConfig, setConfig } from '../database/queries';
import { useFocusEffect } from '@react-navigation/native';

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const [globalNotifSetting, setGlobalNotifSetting] = useState('never');

  useFocusEffect(
    React.useCallback(() => {
      setGlobalNotifSetting(getConfig('notification_frequency', 'never'));
    }, [])
  );

  const handleSaveGlobalNotif = (val: string) => {
    setConfig('notification_frequency', val);
    setGlobalNotifSetting(val);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Exercise Library?',
      "This will restore all default exercises to their factory settings, and DELETE any custom exercises you've created. Your templates and historical workout logs will be preserved.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            resetExercises();
            Alert.alert('Success', 'Exercise database reset to defaults.');
          },
        },
      ],
    );
  };

  const handleResetHistory = () => {
    Alert.alert(
      'Reset Workout History?',
      "This will permanently delete all your logged session and set data. Your exercise library and templates will be preserved.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete History',
          style: 'destructive',
          onPress: () => {
            resetHistory();
            Alert.alert('Success', 'Workout history reset.');
          },
        },
      ],
    );
  };

  const handleResetBodyWeight = () => {
    Alert.alert(
      'Reset Body Weight Data?',
      'This will permanently delete all logged body weight entries. Your workouts, plans, and exercise library will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Body Weight Data',
          style: 'destructive',
          onPress: () => {
            resetBodyWeightEntries();
            Alert.alert('Success', 'Body weight data reset.');
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>

          <View style={{ gap: 12, marginBottom: 32 }}>
            <TouchableOpacity style={[styles.freqBtn, globalNotifSetting === 'alternating' && styles.freqBtnActive]} onPress={() => handleSaveGlobalNotif('alternating')}>
                <Text style={[styles.freqText, globalNotifSetting === 'alternating' && styles.freqTextActive]}>Alternating Days (Every 48 hrs)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.freqBtn, globalNotifSetting === 'mwf' && styles.freqBtnActive]} onPress={() => handleSaveGlobalNotif('mwf')}>
                <Text style={[styles.freqText, globalNotifSetting === 'mwf' && styles.freqTextActive]}>M-W-F Style (Set specific days)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.freqBtn, globalNotifSetting === 'never' && { backgroundColor: '#FF4444' }]} onPress={() => handleSaveGlobalNotif('never')}>
                <Text style={[styles.freqText, globalNotifSetting === 'never' && { color: '#FFF' }]}>Never</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Database Management</Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleReset}>
            <View style={styles.actionIconBg}>
              <RefreshCw color="#FF4444" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Factory Reset Exercises</Text>
              <Text style={styles.actionDesc}>
                Purge custom exercises and restore defaults.
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, { marginTop: 16 }]} onPress={handleResetHistory}>
            <View style={styles.actionIconBg}>
              <Activity color="#FF4444" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Factory Reset History</Text>
              <Text style={styles.actionDesc}>
                Purge all logged workouts and historical data.
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, { marginTop: 16 }]} onPress={handleResetBodyWeight}>
            <View style={styles.actionIconBg}>
              <Scale color="#FF4444" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Factory Reset Body Weight</Text>
              <Text style={styles.actionDesc}>
                Purge all logged body weight entries.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { marginTop: 32, borderLeftColor: '#FF0000', backgroundColor: '#2C0000' }]} onPress={() => {
            Alert.alert(
              'NUCLEAR DATABASE RESET?',
              "This will permanently drop all tables and erase ALL custom data, workouts, plans, routines, and exercises, reverting the application to a pristine installation state.",
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'NUKE IT',
                  style: 'destructive',
                  onPress: () => {
                    resetDatabase();
                    Alert.alert('Success', 'Nuclear wipe complete. Restarting app may be required.');
                  },
                },
              ],
            );
          }}>
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(255, 0, 0, 0.2)' }]}>
              <Flame color="#FF0000" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: '#FF4444' }]}>Nuclear Wipe Database</Text>
              <Text style={[styles.actionDesc, { color: '#FF8888' }]}>
                Destroy and reinstall the complete schema and seeds.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { padding: 24, paddingBottom: 10 },
  heading: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  content: { padding: 24 },

  profileCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  nameText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsText: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold' },

  sectionBlock: { marginBottom: 32 },
  sectionTitle: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionDesc: { color: '#666', fontSize: 12 },

  freqBtn: { flex: 1, backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, alignItems: 'center' },
  freqBtnActive: { backgroundColor: '#00E5FF' },
  freqText: { color: '#FFF', fontWeight: 'bold' },
  freqTextActive: { color: '#000' },
});
