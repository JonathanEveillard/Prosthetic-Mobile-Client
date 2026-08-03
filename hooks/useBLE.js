import { useState, useMemo } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

// These UUIDs must match your ESP32 code exactly!
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

// Lightweight helper to convert a number (0-100) into a 1-byte Base64 string.
// Bluetooth transmits bytes encoded as Base64 strings.
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeByteToBase64(byteValue) {
  const first6 = (byteValue >> 2) & 0x3F;
  const last2 = (byteValue & 0x03) << 4;
  return base64Chars[first6] + base64Chars[last2] + '==';
}

export default function useBLE() {
  // Initialize the Bluetooth manager
  const bleManager = useMemo(() => new BleManager(), []);
  
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  // Request system permissions (required for BLE on Android)
  const requestPermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      const scanGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      const connectGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return (
        scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
        connectGranted === PermissionsAndroid.RESULTS.GRANTED &&
        locationGranted === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true; // iOS handles this automatically via plist
  };

  // Scan for our ESP32 device
  const scanForDevices = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log("Permissions denied");
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("Scan error: ", error);
        setIsScanning(false);
        return;
      }

      // Check if this device is our ESP32 controller
      if (device && device.name === 'ESP32-LED-CTRL') {
        setScannedDevices((prev) => {
          // Prevent duplicates in the list
          if (prev.findIndex((d) => d.id === device.id) > -1) {
            return prev;
          }
          return [...prev, device];
        });
      }
    });

    // Auto-stop scanning after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  // Connect to the selected device
  const connectToDevice = async (device) => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);

      console.log("Connecting to: ", device.name);
      const connection = await bleManager.connectToDevice(device.id);
      
      // Discover the services and characteristics exposed by the ESP32
      await connection.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(connection);
      console.log("Connected successfully!");
    } catch (e) {
      console.log("Connection error: ", e);
    }
  };

  // Disconnect from the active device
  const disconnectFromDevice = async () => {
    if (connectedDevice) {
      await bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      console.log("Disconnected.");
    }
  };

  // Send the slider value (0-100) to the ESP32
  const writeLEDValue = async (value) => {
    if (!connectedDevice) return;

    try {
      // Encode the slider number (0-100) to a Base64 string
      const base64Value = encodeByteToBase64(value);

      // Write the data to our characteristic (without expecting a response back to speed up transmission)
      await bleManager.writeCharacteristicWithoutResponseForDevice(
        connectedDevice.id,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64Value
      );
    } catch (error) {
      console.log("Write error: ", error);
    }
  };

  return {
    isScanning,
    scannedDevices,
    connectedDevice,
    scanForDevices,
    connectToDevice,
    disconnectFromDevice,
    writeLEDValue,
  };
}