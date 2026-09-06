import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DEVICE_NAME = 'ESP32-LED-CTRL';
const bleManager = new BleManager();

const toBase64Byte = (value) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  return `${alphabet[value >> 2]}${alphabet[(value & 3) << 4]}==`;
};

export default function useBluetooth() {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => () => {
    bleManager.stopDeviceScan();
    bleManager.destroy();
  }, []);

  // Android 12+ requires scan/connect permissions; older Android requires location for BLE scans.
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const androidVersion = parseInt(Platform.Version, 10);
      if (androidVersion >= 31) {
        // Android 12+ requires structural scanning permissions
        const scanGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const connectGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        return scanGranted === PermissionsAndroid.RESULTS.GRANTED && connectGranted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 11 requires location clearing to view serial interfaces
        const locationGranted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; 
  };

  const scanForDevices = async () => {
    console.log('BUTTON TAP DETECTED: Running BLE scan...');
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.log("Permissions denied by user");
      return;
    }

    setScannedDevices([]);
    setIsScanning(true);
    bleManager.stopDeviceScan();

    const devices = new Map();
    try {
      bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          console.log('BLE scan failure:', error.message || error);
          bleManager.stopDeviceScan();
          setIsScanning(false);
          return;
        }

        if (device?.name === DEVICE_NAME || device?.localName === DEVICE_NAME) {
          devices.set(device.id, device);
          setScannedDevices(Array.from(devices.values()));
        }
      });

      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        if (devices.size === 0) {
          console.log(`WARNING: BLE device '${DEVICE_NAME}' was not found.`);
        }
      }, 8000);
    } catch (error) {
      console.log('BLE scan failure:', error.message || error);
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device) => {
    try {
      bleManager.stopDeviceScan();
      console.log('Attempting BLE connection to:', device.name || device.localName);
      const connected = await device.connect();
      const readyDevice = await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(readyDevice);
      console.log('SUCCESS: BLE services discovered.');
    } catch (error) {
      console.log('BLE connection error:', error.message || error);
    }
  };

  const disconnectFromDevice = async () => {
    if (!connectedDevice) return;

    try {
      console.log('Closing BLE connection...');
      await bleManager.cancelDeviceConnection(connectedDevice.id);
    } finally {
      setConnectedDevice(null);
    }
  };

  const writeLEDValue = async (value) => {
    if (!connectedDevice) return;

    try {
      const sliderValue = Math.round(Math.max(0, Math.min(100, value)));
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        toBase64Byte(sliderValue)
      );
    } catch (error) {
      console.log('BLE write failure:', error.message || error);
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
