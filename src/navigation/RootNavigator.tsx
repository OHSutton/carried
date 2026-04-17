import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Home, User, BarChart2, ClipboardList, Activity } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

import { ProfileScreen } from '../screens/ProfileScreen';

import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';

import { useSessionStore } from '../store/sessionStore';

export const RootNavigator = () => {
  const { isActive, tick } = useSessionStore();
  
  useEffect(() => {
      if (!isActive) return;
      const interval = setInterval(() => { tick(); }, 1000);
      return () => clearInterval(interval);
  }, [isActive]);

  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          headerStyle: { backgroundColor: '#1A1A1A', shadowColor: 'transparent' },
          headerTintColor: '#fff',
          tabBarStyle: { backgroundColor: '#1A1A1A', borderTopColor: '#2A2A2A', paddingBottom: 5, paddingTop: 5 },
          tabBarActiveTintColor: '#00E5FF', // Sleek neon cyan
          tabBarInactiveTintColor: '#666',
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === 'Home') {
                if (isActive) {
                    return (
                        <View>
                            <Activity color={focused ? color : '#88FF88'} size={size} />
                            <View style={{ position: 'absolute', top: -2, right: -4, width: 8, height: 8, backgroundColor: '#FF4444', borderRadius: 4 }} />
                        </View>
                    );
                }
                return <Home color={color} size={size} />;
            }
            if (route.name === 'Workouts') return <ClipboardList color={color} size={size} />;
            if (route.name === 'Analytics') return <BarChart2 color={color} size={size} />;
            if (route.name === 'Profile') return <User color={color} size={size} />;
            return null;
          },
          tabBarLabel: ({ color, focused }) => {
            let label = route.name;
            if (route.name === 'Home' && isActive) label = 'LIVE';
            return <Text style={{ color: (route.name === 'Home' && isActive && !focused) ? '#88FF88' : color, fontSize: 10, fontWeight: (route.name === 'Home' && isActive) ? 'bold' : 'normal' }}>{label}</Text>;
          }
        })}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} />
        <Tab.Screen name="Analytics" component={HistoryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: '600',
  }
});
