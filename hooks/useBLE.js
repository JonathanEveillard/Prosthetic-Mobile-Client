import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

// ─── ESP32 Classic Bluetooth Configuration ────────────────────────────────
// Change these to match your ESP32's advertised name or MAC address.
export const ESP32_DEVICE_NAME = 'ESP32-LED-CLASSIC';
export const ESP32_MAC_ADDRESS = '2C:F5:B7:85:40:C6';
// ────────────────────────────────────────────────────────────────────────────

export default function useBluetooth() {
  const [isScanning, setIsScanning]           = useState(false);
  const [isConnected, setIsConnected]         = useState(false);
  const [scannedDevices, setScannedDevices]   = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [error, setError]                     = useState(null);

  /** Request Android Bluetooth permissions. */
  async function requestPermissions() {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED,
      );
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  /**
   * Scan and fetch your phone's system paired devices list directly.
   * Filters for the ESP32 by name or MAC address.
   */
  const scanForDevices = useCallback(async () => {
    console.log('BUTTON TAP DETECTED: Running Classic Scan...');
    setError(null);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('Permissions denied by user');
      setError('Bluetooth permissions denied.');
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);

    try {
      console.log('Pulling bonded registry devices from your Android settings menu...');
      // Instantly grabs everything paired in your Android Bluetooth settings page
      const pairedList = await RNBluetoothClassic.getBondedDevices();
      console.log(`Found ${pairedList.length} total paired devices in system memory.`);

      // Find your target board by name or matching MAC address
      const targetESP32 = pairedList.filter(
        (d) => d.name === ESP32_DEVICE_NAME || d.id === ESP32_MAC_ADDRESS,
      );

      if (targetESP32.length > 0) {
        console.log('SUCCESS: Located your ESP32 Classic controller!');
        setScannedDevices(targetESP32);
      } else {
        console.log(
          `WARNING: Device not found. Make sure you paired '${ESP32_DEVICE_NAME}' in your phone's Bluetooth settings first!`,
        );
        setError(
          `Device not found. Pair '${ESP32_DEVICE_NAME}' in your phone's Bluetooth settings first.`,
        );
      }
    } catch (err) {
      console.log('Classic scan failure: ', err.message || err);
      setError(err.message || 'Scan failed.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  /** Connect to a device from scannedDevices. */
  const connectToDevice = useCallback(async (device) => {
    setError(null);
    try {
      const connected = await device.connect();
      setConnectedDevice(connected);
      setIsConnected(true);
    } catch (connectError) {
      console.log('Connection failed:', connectError.message);
      setError(connectError.message);
    }
  }, []);

  /** Disconnect from the connected device. */
  const disconnectFromDevice = useCallback(async () => {
    if (connectedDevice) {
      try {
        await connectedDevice.disconnect();
      } catch (_) {
        // ignore errors on disconnect
      }
      setConnectedDevice(null);
      setIsConnected(false);
    }
  }, [connectedDevice]);

  /**
   * Write an LED/actuator value (0–100) to the ESP32 as a plain string.
   * The ESP32 firmware should read this as a numeric ASCII string.
   */
  const writeLEDValue = useCallback(async (value) => {
    if (!connectedDevice || !isConnected) return;
    try {
      await connectedDevice.write(`${Math.round(value)}\n`);
    } catch (writeError) {
      console.log('Write failed:', writeError.message);
      setError(writeError.message);
    }
  }, [connectedDevice, isConnected]);

  return {
    isScanning,
    isConnected,
    scannedDevices,
    connectedDevice,
    error,
    scanForDevices,
    connectToDevice,
    disconnectFromDevice,
    writeLEDValue,
  };
}
