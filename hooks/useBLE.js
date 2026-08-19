import { useState, useCallback, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

// ─── ESP32 BLE Configuration ──────────────────────────────────────────────
// Change ESP32_DEVICE_NAME to match the advertised BLE name of your ESP32.
// Replace SERVICE_UUID and CHARACTERISTIC_UUID with the UUIDs defined in
// your ESP32 firmware (e.g. from a custom GATT service you declare there).
export const ESP32_DEVICE_NAME = 'ESP32-BLE';
export const SERVICE_UUID       = '0000FFE0-0000-1000-8000-00805F9B34FB'; // TODO: replace with your ESP32 service UUID
export const CHARACTERISTIC_UUID = '0000FFE1-0000-1000-8000-00805F9B34FB'; // TODO: replace with your ESP32 characteristic UUID
// ────────────────────────────────────────────────────────────────────────────

// Single BleManager instance shared for the lifetime of the app.
const bleManager = new BleManager();

export default function useBluetooth() {
  const [isScanning, setIsScanning]           = useState(false);
  const [isConnected, setIsConnected]         = useState(false);
  const [scannedDevices, setScannedDevices]   = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [error, setError]                     = useState(null);

  const scanTimerRef = useRef(null);

  /** Request Android BLE permissions. */
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
   * Scan for BLE peripherals and collect results for 5 seconds.
   * Optionally filters by ESP32_DEVICE_NAME if set.
   */
  const scanForDevices = useCallback(async () => {
    console.log('BUTTON TAP DETECTED: Running BLE Scan...');
    setError(null);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('Permissions denied by user');
      setError('Bluetooth permissions denied.');
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);

    const seen = new Set();
    const found = [];

    bleManager.startDeviceScan(null, null, (err, device) => {
      if (err) {
        console.log('BLE scan error:', err.message);
        setError(err.message || 'Scan failed.');
        setIsScanning(false);
        bleManager.stopDeviceScan();
        clearTimeout(scanTimerRef.current);
        return;
      }
      if (!device) return;

      // Filter by name when ESP32_DEVICE_NAME is set
      const nameMatch = !ESP32_DEVICE_NAME || device.name === ESP32_DEVICE_NAME;
      if (nameMatch && !seen.has(device.id)) {
        seen.add(device.id);
        found.push({ id: device.id, name: device.name || 'Unknown', _device: device });
        setScannedDevices([...found]);
      }
    });

    // Stop scanning after 5 seconds
    scanTimerRef.current = setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      if (found.length === 0) {
        console.log(`WARNING: No BLE device named '${ESP32_DEVICE_NAME}' found nearby.`);
        setError(`No device named '${ESP32_DEVICE_NAME}' found. Make sure the ESP32 is powered on and advertising.`);
      } else {
        console.log(`BLE scan complete. Found ${found.length} device(s).`);
      }
    }, 5000);
  }, []);

  /** Connect to a device from scannedDevices. */
  const connectToDevice = useCallback(async (item) => {
    setError(null);
    try {
      console.log('Connecting to BLE device:', item.id);
      const device = await bleManager.connectToDevice(item.id);
      await device.discoverAllServicesAndCharacteristics();
      setConnectedDevice(device);
      setIsConnected(true);
      console.log('BLE device connected:', device.id);
    } catch (connectError) {
      console.log('BLE connection failed:', connectError.message);
      setError(connectError.message);
    }
  }, []);

  /** Disconnect from the connected device. */
  const disconnectFromDevice = useCallback(async () => {
    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      } catch (_) {
        // ignore errors on disconnect
      }
      setConnectedDevice(null);
      setIsConnected(false);
    }
  }, [connectedDevice]);

  /**
   * Write an actuator value (0–100) to the ESP32 over BLE.
   * The value is encoded as a UTF-8 string and base64-encoded for the
   * BLE characteristic write.
   */
  const writeLEDValue = useCallback(async (value) => {
    if (!connectedDevice || !isConnected) return;
    try {
      const payload = Buffer.from(`${Math.round(value)}\n`, 'utf-8').toString('base64');
      await bleManager.writeCharacteristicWithResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        payload,
      );
    } catch (writeError) {
      console.log('BLE write failed:', writeError.message);
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

  /** Request Android BLE permissions. */
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
   * Scan for BLE peripherals and collect results for 5 seconds.
   * Optionally filters by ESP32_DEVICE_NAME if set.
   */
  const scanForDevices = useCallback(async () => {
    console.log('BUTTON TAP DETECTED: Running BLE Scan...');
    setError(null);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log('Permissions denied by user');
      setError('Bluetooth permissions denied.');
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);

    const seen = new Set();
    const found = [];

    bleManager.startDeviceScan(null, null, (err, device) => {
      if (err) {
        console.log('BLE scan error:', err.message);
        setError(err.message || 'Scan failed.');
        setIsScanning(false);
        bleManager.stopDeviceScan();
        return;
      }
      if (!device) return;

      // Filter by name when ESP32_DEVICE_NAME is set
      const nameMatch = !ESP32_DEVICE_NAME || device.name === ESP32_DEVICE_NAME;
      if (nameMatch && !seen.has(device.id)) {
        seen.add(device.id);
        found.push({ id: device.id, name: device.name || 'Unknown', _device: device });
        setScannedDevices([...found]);
      }
    });

    // Stop scanning after 5 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      if (found.length === 0) {
        console.log(`WARNING: No BLE device named '${ESP32_DEVICE_NAME}' found nearby.`);
        setError(`No device named '${ESP32_DEVICE_NAME}' found. Make sure the ESP32 is powered on and advertising.`);
      } else {
        console.log(`BLE scan complete. Found ${found.length} device(s).`);
      }
    }, 5000);
  }, []);

  /** Connect to a device from scannedDevices. */
  const connectToDevice = useCallback(async (item) => {
    setError(null);
    try {
      console.log('Connecting to BLE device:', item.id);
      const device = await bleManager.connectToDevice(item.id);
      await device.discoverAllServicesAndCharacteristics();
      setConnectedDevice(device);
      setIsConnected(true);
      console.log('BLE device connected:', device.id);
    } catch (connectError) {
      console.log('BLE connection failed:', connectError.message);
      setError(connectError.message);
    }
  }, []);

  /** Disconnect from the connected device. */
  const disconnectFromDevice = useCallback(async () => {
    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      } catch (_) {
        // ignore errors on disconnect
      }
      setConnectedDevice(null);
      setIsConnected(false);
    }
  }, [connectedDevice]);

  /**
   * Write an actuator value (0–100) to the ESP32 over BLE.
   * The value is encoded as a UTF-8 string and base64-encoded for the
   * BLE characteristic write.
   */
  const writeLEDValue = useCallback(async (value) => {
    if (!connectedDevice || !isConnected) return;
    try {
      const payload = Buffer.from(`${Math.round(value)}\n`, 'utf-8').toString('base64');
      await bleManager.writeCharacteristicWithResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        payload,
      );
    } catch (writeError) {
      console.log('BLE write failed:', writeError.message);
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
