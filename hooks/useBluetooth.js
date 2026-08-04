import { useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function useBluetooth() {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  // 1. Request Legacy Bluetooth Bond Permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const androidVersion = parseInt(Platform.Version, 10);
      if (androidVersion >= 31) {
        // Android 12+ requires structural scanning permissions
        const scanGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const connectGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        return scanGranted === PermissionsAndroid.RESULTS.GRANTED && connectGranted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 11 (Your Tecno Pova 2) requires location clearing to view serial interfaces
        const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; 
  };

  // 2. Scan and fetch your phone's system paired devices list directly
  const scanForDevices = async () => {
    console.log("🚀 BUTTON TAP DETECTED: Running Classic Scan...");
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log("Permissions denied by user");
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);

    try {
      console.log("Pulling bonded registry devices from your Android settings menu...");
      // Instantly grabs everything paired in your Android Bluetooth settings page
      const pairedList = await RNBluetoothClassic.getBondedDevices();
      console.log(`Found ${pairedList.length} total paired devices in system memory.`);

      // Find your modern target board by name or matching MAC address
      const targetESP32 = pairedList.filter(
        (d) => d.name === 'ESP32-LED-CLASSIC' || d.id === '2C:F5:B7:85:40:C6'
      );

      if (targetESP32.length > 0) {
        console.log("🎯 SUCCESS: Located your ESP32 Classic controller!");
        setScannedDevices(targetESP32);
      } else {
        console.log("⚠️ WARNING: Device not found in list. Make sure you paired 'ESP32-LED-CLASSIC' in your phone's main settings first!");
      }
    } catch (err) {
      console.log("Classic scan array failure: ", err.message || err);
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Connect cleanly over direct Serial Socket protocol (RFCOMM)
  const connectToDevice = async (device) => {
    try {
      console.log("Attempting direct Serial socket stream connection to: ", device.name);
      
      // Connect directly without dealing with annoying BLE GATT profile contexts
      const isConnected = await device.connect();
      
      if (isConnected) {
        setConnectedDevice(device);
        console.log("🎉 SUCCESS: Bound cleanly to Serial stream socket!");
      } else {
        console.log("Connection failed: Handshake was rejected.");
      }
    } catch (e) {
      console.log("Classic connection block error: ", e.message || e);
    }
  };

  // 4. Disconnect cleanly
  const disconnectFromDevice = async () => {
    if (connectedDevice) {
      console.log("Closing serial port link...");
      await connectedDevice.disconnect();
      setConnectedDevice(null);
      console.log("Disconnected completely.");
    }
  };

  // 5. Write the value as plain text string followed by newline code (\n)
  const writeLEDValue = async (value) => {
    if (!connectedDevice) return;

    try {
      const sanitizedValue = Math.max(0, Math.min(255, value));
      
      // Delivers clean text numbers (like "150\n") straight over the antenna 
      // Your ESP32 reads this instantly using SerialBT.readStringUntil('\n')
      await connectedDevice.write(`${sanitizedValue}\n`);
    } catch (error) {
      console.log("Serial write failure: ", error.message || error);
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
