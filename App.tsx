import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDb } from './src/database/db';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    try {
      initDb();
      setDbReady(true);
    } catch (e) {
      console.error("Error initializing DB:", e);
    }
  }, []);

  if (!dbReady) {
    return (
      <View style={{flex: 1, backgroundColor: '#0F0F0F', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: '#fff', fontSize: 18}}>Loading Gym App...</Text>
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <StatusBar style="light" />
    </>
  );
}
