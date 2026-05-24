import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Linking,
  Platform,
  NativeModules,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {calculateGigStats, GigStats} from '../utils/calculations';

interface SettingsScreenProps {
  lastOffer?: GigStats | null;
  onCostPerMileChange?: (value: string) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  lastOffer: propLastOffer,
  onCostPerMileChange,
}) => {
  const [costPerMile, setCostPerMile] = useState('0.18');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [lastOffer, setLastOffer] = useState<GigStats | null>(
    propLastOffer ?? null,
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedCost = await AsyncStorage.getItem('costPerMile');
        if (savedCost !== null) {
          setCostPerMile(savedCost);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleCostPerMileChange = useCallback(
    async (value: string) => {
      setCostPerMile(value);
      try {
        await AsyncStorage.setItem('costPerMile', value);
        if (onCostPerMileChange) {
          onCostPerMileChange(value);
        }
      } catch (error) {
        console.error('Failed to save cost per mile:', error);
      }
    },
    [onCostPerMileChange],
  );

  const handleToggleMonitoring = useCallback(
    async (value: boolean) => {
      setIsMonitoring(value);
      if (value) {
        if (NativeModules.FloatingOverlay) {
          try {
            if (!overlayEnabled) {
              await NativeModules.FloatingOverlay.requestPermission();
              setOverlayEnabled(true);
            }
            await NativeModules.FloatingOverlay.createOverlay();
          } catch (error) {
            console.error('Failed to start overlay:', error);
            Alert.alert('Error', 'Failed to create floating overlay.');
            setIsMonitoring(false);
          }
        } else {
          Alert.alert(
            'Not Available',
            'Floating overlay is not available in this configuration.',
          );
          setIsMonitoring(false);
        }
      } else {
        if (NativeModules.FloatingOverlay) {
          try {
            await NativeModules.FloatingOverlay.removeOverlay();
          } catch (error) {
            console.error('Failed to remove overlay:', error);
          }
        }
      }
    },
    [overlayEnabled],
  );

  const handleAccessibilityPress = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS').catch(
        () => {
          Alert.alert(
            'Error',
            'Could not open Accessibility Settings manually.',
          );
        },
      );
    } else {
      Alert.alert(
        'Info',
        'Accessibility Services are configured automatically on iOS.',
      );
    }
  }, []);

  const handleOverlayPermissionPress = useCallback(async () => {
    if (NativeModules.FloatingOverlay) {
      try {
        await NativeModules.FloatingOverlay.requestPermission();
        setOverlayEnabled(true);
      } catch (error) {
        console.error('Failed to request overlay permission:', error);
        Alert.alert('Error', 'Failed to request overlay permission.');
      }
    } else {
      Alert.alert('Not Available', 'Floating overlay module not found.');
    }
  }, []);

  const cardColor =
    lastOffer?.colorCode === 'green'
      ? '#d4edda'
      : lastOffer?.colorCode === 'red'
      ? '#f8d7da'
      : lastOffer
      ? '#fff3cd'
      : '#ffffff';

  const cardBorderColor =
    lastOffer?.colorCode === 'green'
      ? '#28a745'
      : lastOffer?.colorCode === 'red'
      ? '#dc3545'
      : lastOffer
      ? '#ffc107'
      : '#cccccc';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Gig Calculator Settings</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Cost Per Mile ($)</Text>
        <TextInput
          style={styles.input}
          value={costPerMile}
          onChangeText={handleCostPerMileChange}
          keyboardType="numeric"
          placeholder="0.18"
          accessibilityLabel="Cost per mile input"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permission Status</Text>

        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>Accessibility Service</Text>
          {accessibilityEnabled ? (
            <Text style={styles.statusEnabled}>Enabled</Text>
          ) : (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={handleAccessibilityPress}>
              <Text style={styles.statusDisabled}>Disabled</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>Overlay Permission</Text>
          {overlayEnabled ? (
            <Text style={styles.statusEnabled}>Granted</Text>
          ) : (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={handleOverlayPermissionPress}>
              <Text style={styles.statusDisabled}>Not Granted</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Start Monitoring</Text>
          <Switch
            value={isMonitoring}
            onValueChange={handleToggleMonitoring}
            trackColor={{false: '#ccc', true: '#81b0ff'}}
            thumbColor={isMonitoring ? '#2196F3' : '#f4f3f4'}
          />
        </View>
        <Text
          style={[
            styles.monitoringStatus,
            {color: isMonitoring ? '#28a745' : '#dc3545'},
          ]}>
          {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
        </Text>
      </View>

      {lastOffer && (
        <View
          style={[
            styles.offerCard,
            {backgroundColor: cardColor, borderColor: cardBorderColor},
          ]}>
          <Text style={styles.offerCardTitle}>Last Offer</Text>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Payout:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.payout.toFixed(2)}
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Distance:</Text>
            <Text style={styles.offerStatValue}>
              {lastOffer.miles.toFixed(1)} mi
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Gross/mi:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.grossPerMile.toFixed(2)}
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Net Profit:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.netProfit.toFixed(2)}
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Net Hourly:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.netHourly.toFixed(2)}/hr
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Est. Time:</Text>
            <Text style={styles.offerStatValue}>
              {lastOffer.estimatedMinutes.toFixed(0)} min
            </Text>
          </View>
          <Text style={styles.offerDisplayString}>
            {lastOffer.displayString}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  permissionLabel: {
    fontSize: 16,
    color: '#555',
  },
  statusEnabled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
  },
  statusDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
  },
  monitoringStatus: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  offerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  offerCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  offerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  offerStatLabel: {
    fontSize: 15,
    color: '#555',
  },
  offerStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  offerDisplayString: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    color: '#333',
  },
});

export default SettingsScreen;
