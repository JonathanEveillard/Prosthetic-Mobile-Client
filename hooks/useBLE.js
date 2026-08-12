import { useState, useCallback, useRef } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

// ─── ESP32 BLE Configuration ───────────────────────────────────────────────
// Change these to match the UUIDs defined in your ESP32 firmware.
export const ESP32_DEVICE_NAME = 'ProstheticESP32';
export const SERVICE_UUID      = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHAR_UUID         = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
// ────────────────────────────────────────────────────────────────────────────

const manager = new BleManager();

export default function useBLE() {
  const [isScanning, setIsScanning]     = useState(false);
  const [device, setDevice]             = useState(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [error, setError]               = useState(null);
  const deviceRef = useRef(null);

  /** Request Android BLE permissions (Android 12+). */
  async function requestAndroidPermissions() {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]  === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  /** Scan for the ESP32 and connect once found. */
  const connectToESP32 = useCallback(async () => {
    setError(null);
    const granted = await requestAndroidPermissions();
    if (!granted) {
      setError('Bluetooth permissions denied.');
      return;
    }

    setIsScanning(true);
    manager.startDeviceScan(null, null, async (scanError, scannedDevice) => {
      if (scanError) {
        setError(scanError.message);
        setIsScanning(false);
        return;
      }

      if (scannedDevice?.name === ESP32_DEVICE_NAME) {
        manager.stopDeviceScan();
        setIsScanning(false);
        try {
          const connected = await scannedDevice.connect();
          await connected.discoverAllServicesAndCharacteristics();
          deviceRef.current = connected;
          setDevice(connected);
          setIsConnected(true);

          // Listen for disconnection
          connected.onDisconnected(() => {
            deviceRef.current = null;
            setDevice(null);
            setIsConnected(false);
          });
        } catch (connectError) {
          setError(connectError.message);
        }
      }
    });

    // Stop scanning after 10 s if not found
    setTimeout(() => {
      if (!deviceRef.current) {
        manager.stopDeviceScan();
        setIsScanning(false);
        setError(`Could not find "${ESP32_DEVICE_NAME}". Make sure the device is on and nearby.`);
      }
    }, 10000);
  }, []);

  /** Disconnect from the ESP32. */
  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      await deviceRef.current.cancelConnection();
      deviceRef.current = null;
      setDevice(null);
      setIsConnected(false);
    }
  }, []);

  /**
   * Send an actuator value (0–100) to the ESP32.
   * The value is encoded as a Base64 string of a single byte (0–100).
   */
  const sendValue = useCallback(async (value) => {
    if (!deviceRef.current || !isConnected) return;
    try {
      // Encode the integer 0-100 as a single byte in Base64
      const byte   = Math.round(value);
      const base64 = btoa(String.fromCharCode(byte));
      await deviceRef.current.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_UUID,
        base64,
      );
    } catch (writeError) {
      setError(writeError.message);
    }
  }, [isConnected]);

  return {
    isScanning,
    isConnected,
    error,
    connectToESP32,
    disconnect,
    sendValue,
  };
}
