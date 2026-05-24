import React, {useState, useEffect, useCallback} from 'react';
import {NativeModules, NativeEventEmitter} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import SettingsScreen from './screens/SettingsScreen';
import {calculateGigStats, GigStats} from './utils/calculations';

const Tab = createBottomTabNavigator();

function App(): React.JSX.Element {
  const [lastOffer, setLastOffer] = useState<GigStats | null>(null);
  const [costPerMile, setCostPerMile] = useState(0.18);

  const handleCostPerMileChange = useCallback((value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setCostPerMile(parsed);
    }
  }, []);

  useEffect(() => {
    const gigBridge = NativeModules.GigBridge;
    if (!gigBridge) {
      console.warn('GigBridge native module not available');
      return;
    }

    const eventEmitter = new NativeEventEmitter(gigBridge);
    const subscription = eventEmitter.addListener(
      'onGigOfferDetected',
      (event: {payout: number; miles: number}) => {
        console.log('Gig offer detected:', event);

        const stats = calculateGigStats(event.payout, event.miles, costPerMile);
        setLastOffer(stats);

        const floatingOverlay = NativeModules.FloatingOverlay;
        if (floatingOverlay && floatingOverlay.updateOverlay) {
          floatingOverlay
            .updateOverlay(stats.displayString, stats.colorCode)
            .catch((error: Error) => {
              console.error('Failed to update overlay:', error);
            });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [costPerMile]);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#888',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Tab.Screen
          name="Settings"
          options={{
            title: 'Gig Calculator',
            tabBarLabel: 'Settings',
          }}>
          {() => (
            <SettingsScreen
              lastOffer={lastOffer}
              onCostPerMileChange={handleCostPerMileChange}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
