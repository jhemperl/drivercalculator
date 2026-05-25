import React, {useState, useEffect, useCallback, useRef} from 'react';
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
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GigStats} from '../utils/calculations';

const {FloatingOverlay, GigBridge} = NativeModules;

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

  const appState = useRef(AppState.currentState);
  const initialLoadDone = useRef(false);

  const checkPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      if (FloatingOverlay) {
        const overlayGranted = await FloatingOverlay.isPermissionGranted();
        setOverlayEnabled(overlayGranted);
      }

      if (GigBridge) {
        const accessibilityGranted =
          await GigBridge.isAccessibilityServiceEnabled();
        setAccessibilityEnabled(accessibilityGranted);
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  }, []);

  useEffect(() => {
    setLastOffer(propLastOffer ?? null);
  }, [propLastOffer]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedCost = await AsyncStorage.getItem('costPerMile');
        if (savedCost !== null) {
          setCostPerMile(savedCost);
          // Propagate loaded value to parent on initial load
          if (!initialLoadDone.current && onCostPerMileChange) {
            onCostPerMileChange(savedCost);
          }
        }
        initialLoadDone.current = true;
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkPermissions();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermissions, onCostPerMileChange]);

  const handleCostPerMileChange = useCallback(
    async (value: string) => {
      const cleanValue = value.replace(/[^0-9.]/g, '');
      if (cleanValue.split('.').length > 2) {
        return;
      }

      setCostPerMile(cleanValue);
      try {
        await AsyncStorage.setItem('costPerMile', cleanValue);
        if (onCostPerMileChange) {
          onCostPerMileChange(cleanValue);
        }
      } catch (error) {
        console.error('Failed to save cost per mile:', error);
      }
    },
    [onCostPerMileChange],
  );

  const handleToggleMonitoring = useCallback(
    async (value: boolean) => {
      if (value) {
        if (!accessibilityEnabled || !overlayEnabled) {
          Alert.alert(
            'Permissions Required',
            'Please enable both Accessibility Service and Overlay permission to start monitoring.',
          );
          return;
        }

        if (FloatingOverlay) {
          try {
            await FloatingOverlay.createOverlay();
            setIsMonitoring(true);
          } catch (error) {
            console.error('Failed to start overlay:', error);
            Alert.alert('Error', 'Failed to create floating overlay.');
          }
        }
      } else {
        if (FloatingOverlay) {
          try {
            await FloatingOverlay.removeOverlay();
            setIsMonitoring(false);
          } catch (error) {
            console.error('Failed to remove overlay:', error);
          }
        }
      }
    },
    [accessibilityEnabled, overlayEnabled],
  );

  const handleAccessibilityPress = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS').catch(
        () => {
          Alert.alert(
            'Error',
            'Could not open Accessibility Settings. Please open them manually in System Settings.',
          );
        },
      );
    }
  }, []);

  const handleOverlayPermissionPress = useCallback(async () => {
    if (FloatingOverlay) {
      try {
        await FloatingOverlay.requestPermission();
      } catch (error) {
        console.error('Failed to request overlay permission:', error);
      }
    }
  }, []);

  const handleSimulateOffer = useCallback(() => {
    if (GigBridge && GigBridge.simulateOffer) {
      // Simulate: $15.00 for 6 miles in 20 minutes
      GigBridge.simulateOffer(15.0, 6.0, 'Uber (Simulated)', 20.0);
    } else {
      Alert.alert('Error', 'Simulation not available');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Gig Calculator</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Vehicle Cost Per Mile ($)</Text>
        <TextInput
          style={styles.input}
          value={costPerMile}
          onChangeText={handleCostPerMileChange}
          keyboardType="numeric"
          placeholder="0.18"
          accessibilityLabel="Cost per mile input"
        />
        <Text style={styles.helperText}>
          Used to calculate net profit (fuel, wear, etc.)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>

        <View style={styles.permissionRow}>
          <View>
            <Text style={styles.permissionLabel}>Accessibility Service</Text>
            <Text style={styles.permissionSubLabel}>
              Required to read Uber/DoorDash data
            </Text>
          </View>
          {accessibilityEnabled ? (
            <Text style={styles.statusEnabled}>Enabled</Text>
          ) : (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={handleAccessibilityPress}>
              <Text style={styles.statusDisabled}>Setup</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.permissionRow}>
          <View>
            <Text style={styles.permissionLabel}>Display Over Other Apps</Text>
            <Text style={styles.permissionSubLabel}>
              Required for the floating bubble
            </Text>
          </View>
          {overlayEnabled ? (
            <Text style={styles.statusEnabled}>Granted</Text>
          ) : (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={handleOverlayPermissionPress}>
              <Text style={styles.statusDisabled}>Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Floating Bubble Active</Text>
          <Switch
            value={isMonitoring}
            onValueChange={handleToggleMonitoring}
            trackColor={{false: '#ccc', true: '#81b0ff'}}
            thumbColor={isMonitoring ? '#2196F3' : '#f4f3f4'}
            disabled={!accessibilityEnabled || !overlayEnabled}
          />
        </View>
      </View>

      {lastOffer && (
        <View
          style={[
            styles.offerCard,
            {backgroundColor: cardColor, borderColor: cardBorderColor},
          ]}>
          <Text style={styles.offerCardTitle}>Last Detected Offer</Text>

          {lastOffer.appName && (
            <Text style={styles.sourceAppText}>{lastOffer.appName}</Text>
          )}

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
            <Text style={styles.offerStatLabel}>Est. Time:</Text>
            <Text style={styles.offerStatValue}>
              {lastOffer.timeMinutes.toFixed(0)} min
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Gross/mi:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.grossPerMile.toFixed(2)}
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Est. Net Hourly:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.netHourly.toFixed(0)}/hr
            </Text>
          </View>
          <View style={styles.offerStatRow}>
            <Text style={styles.offerStatLabel}>Net Profit:</Text>
            <Text style={styles.offerStatValue}>
              ${lastOffer.netProfit.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.offerDisplayString}>
            {lastOffer.displayString}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.simulateButton}
        onPress={handleSimulateOffer}>
        <Text style={styles.simulateButtonText}>Simulate Uber Offer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 24,
    color: '#1a73e8',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#202124',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#5f6368',
  },
  helperText: {
    fontSize: 12,
    color: '#80868b',
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    backgroundColor: '#fff',
    color: '#202124',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
  },
  permissionSubLabel: {
    fontSize: 12,
    color: '#5f6368',
  },
  statusEnabled: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e8e3e',
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusDisabled: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d93025',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fce8e6',
    borderRadius: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  offerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    elevation: 4,
  },
  offerCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    color: '#202124',
    textAlign: 'center',
  },
  sourceAppText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5f6368',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  offerStatLabel: {
    fontSize: 16,
    color: '#5f6368',
  },
  offerStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  offerDisplayString: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 16,
    color: '#202124',
  },
  simulateButton: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a73e8',
    alignItems: 'center',
  },
  simulateButtonText: {
    color: '#1a73e8',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SettingsScreen;
