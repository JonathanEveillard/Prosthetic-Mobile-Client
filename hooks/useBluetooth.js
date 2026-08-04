import { useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

// These UUIDs must match your ESP32 code exactly!
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

// 🎯 FIX 1: Move BleManager globally outside the hook so it is NEVER destroyed on re-render
const manager = new BleManager();

// Lightweight helper to convert a number (0-255) into a 1-byte Base64 string.
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeByteToBase64(byteValue) {
  const first6 = (byteValue >> 2) & 0x3F;
  const last2 = (byteValue & 0x03) << 4;
  return base64Chars[first6] + base64Chars[last2] + '==';
}

export default function useBLE() {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  // Request system permissions (Supports Android 11 and older)
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const androidVersion = parseInt(Platform.Version, 10);
      if (androidVersion >= 31) {
        const scanGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const connectGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return (
          scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
          connectGranted === PermissionsAndroid.RESULTS.GRANTED &&
          locationGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; 
  };

  // Scan for our ESP32 device
  const scanForDevices = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log("Permissions denied by user");
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);

    const state = await manager.state();
    if (state !== 'PoweredOn') {
      console.log("HARDWARE ERROR: Bluetooth is off! State:", state);
      setIsScanning(false);
      return;
    }

    // Using global 'manager' instance
    manager.startDeviceScan(null, { legacyScan: true }, (error, device) => {
      if (error) {
        console.log("SCAN FAILURE: ", error.message);
        setIsScanning(false);
        return;
      }

      if (device) {
        const isTargetESP32 = 
          device.id === '2C:F5:B7:85:40:C6' || 
          device.name === 'ESP32-LED-CTRL' ||
          (device.serviceUUIDs && device.serviceUUIDs.includes(SERVICE_UUID));

        if (isTargetESP32) {
          console.log("🎯 SUCCESS: Targeted your ESP32 board directly!");
          const formattedDevice = { ...device, name: 'ESP32-LED-CTRL (Connected via MAC)' };
          setScannedDevices((prev) => {
            if (prev.findIndex((d) => d.id === device.id) > -1) return prev;
            return [...prev, formattedDevice];
          });
        }
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  // Connect to the selected device
  const connectToDevice = async (device) => {
    try {
      const targetId = '2C:F5:B7:85:40:C6';
      
      // 🎯 FIXED: DO NOT stop the scan here! Leave the scanner running 
      // so Android maintains a live hardware GATT context memory space.
      console.log("Initiating pure BLE handshake while preserving context with ID: ", targetId);

      const connection = await manager.connectToDevice(targetId, {
        autoConnect: false,
        timeout: 8000,
      });
      
      console.log("Establishing data link... Waiting 500ms for stack to settle.");
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("Discovering hardware endpoints...");
      const discoveredConnection = await connection.discoverAllServicesAndCharacteristics();
      
      // 🎯 SUCCESS HYBRID: Now that we are securely connected, 
      // it is completely safe to turn off the scanner engine!
      console.log("Connection verified. Safely shutting down scanner...");
      manager.stopDeviceScan();
      setIsScanning(false);
      
      setConnectedDevice(discoveredConnection);
      console.log("Connected successfully!");
    } catch (e) {
      console.log("Connection error: ", e.message || e);
      
      // Fallback: If it still errors out, make sure the scan state is cleared
      manager.stopDeviceScan();
      setIsScanning(false);
    }
  };



  // Disconnect from the active device
  const disconnectFromDevice = async () => {
    if (connectedDevice) {
      await manager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      console.log("Disconnected.");
    }
  };

  // Send the slider value (0-255) to the ESP32
  const writeLEDValue = async (value) => {
    if (!connectedDevice) return;

    try {
      const sanitizedValue = Math.max(0, Math.min(255, value));
      const base64Value = encodeByteToBase64(sanitizedValue);

      // Using global 'manager' instance
      await manager.writeCharacteristicWithoutResponseForDevice(
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
