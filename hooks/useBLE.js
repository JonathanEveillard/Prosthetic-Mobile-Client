import { useState, useCallback, useRef, useEffect } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

// ─── ESP32 BLE Configuration ───────────────────────────────────────────────
// Change these to match the UUIDs defined in your ESP32 firmware.
export const ESP32_DEVICE_NAME = 'ProstheticESP32';
export const SERVICE_UUID      = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHAR_UUID         = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
// ────────────────────────────────────────────────────────────────────────────

export default function useBluetooth() {
  const [isScanning, setIsScanning]         = useState(false);
  const [isConnected, setIsConnected]       = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [error, setError]                   = useState(null);

  const managerRef   = useRef(null);
  const deviceRef    = useRef(null);
  const scanTimerRef = useRef(null);

  // Create the BleManager once and destroy it when the component unmounts
  useEffect(() => {
    managerRef.current = new BleManager();
    return () => {
      clearTimeout(scanTimerRef.current);
      managerRef.current.destroy();
    };
  }, []);

  /** Request Android BLE permissions (Android 12+). */
  async function requestAndroidPermissions() {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]    === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  /** Scan for nearby BLE devices and populate scannedDevices. */
  const scanForDevices = useCallback(async () => {
    setError(null);
    setScannedDevices([]);
    const granted = await requestAndroidPermissions();
    if (!granted) {
      setError('Bluetooth permissions denied.');
      return;
    }

    setIsScanning(true);
    managerRef.current.startDeviceScan(null, null, (scanError, scannedDevice) => {
      if (scanError) {
        setError(scanError.message);
        setIsScanning(false);
        return;
      }

      if (scannedDevice?.name) {
        setScannedDevices((prev) => {
          const alreadyFound = prev.some((d) => d.id === scannedDevice.id);
          return alreadyFound ? prev : [...prev, scannedDevice];
        });
      }
    });

    // Stop scanning after 10 s
    scanTimerRef.current = setTimeout(() => {
      managerRef.current.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  }, []);

  /** Connect to a specific device from scannedDevices. */
  const connectToDevice = useCallback(async (device) => {
    setError(null);
    managerRef.current.stopDeviceScan();
    clearTimeout(scanTimerRef.current);
    setIsScanning(false);
    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      deviceRef.current = connected;
      setConnectedDevice(connected);
      setIsConnected(true);

      // Listen for disconnection
      connected.onDisconnected(() => {
        deviceRef.current = null;
        setConnectedDevice(null);
        setIsConnected(false);
      });
    } catch (connectError) {
      setError(connectError.message);
    }
  }, []);

  /** Disconnect from the connected device. */
  const disconnectFromDevice = useCallback(async () => {
    if (deviceRef.current) {
      await deviceRef.current.cancelConnection();
      deviceRef.current = null;
      setConnectedDevice(null);
      setIsConnected(false);
    }
  }, []);

  /**
   * Write an LED/actuator value (0–100) to the ESP32.
   * The value is encoded as a Base64 string of a single byte (0–100).
   */
  const writeLEDValue = useCallback(async (value) => {
    if (!deviceRef.current || !isConnected) return;
    try {
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
    scannedDevices,
    connectedDevice,
    error,
    scanForDevices,
    connectToDevice,
    disconnectFromDevice,
    writeLEDValue,
  };
}
