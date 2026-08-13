import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, Share, FlatList } from 'react-native';
import { Link } from 'expo-router'; 


import StatusIndicator from '../components/StatusIndicator';
import ActuatorSlider from '../components/ActuatorSlider';
import useBluetooth from '../hooks/useBLE';


import {Colors} from "../constants/Colors"
// import { Colors } from 'react-native/types_generated/Libraries/Animated/AnimatedExports';
export default function App() {
  const [value, setValue] = useState(0);
  const {
    isScanning,
    isConnected,
    scannedDevices,
    connectedDevice,
    scanForDevices,
    connectToDevice,
    disconnectFromDevice,
    writeLEDValue,
  } = useBluetooth();
  const sendTimerRef = useRef(null);

  // Debounce sending the actuator value to the ESP32 (fires 200 ms after the
  // user stops moving the slider to avoid flooding the serial write queue).
  useEffect(() => {
    if (!isConnected) return;
    clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => {
      writeLEDValue(value);
    }, 200);
    return () => clearTimeout(sendTimerRef.current);
  }, [value, isConnected, writeLEDValue]);

  // Sharing telemetry feed mock (native share panel)
  const handleCopy = async () => {
    try {
      await Share.share({
        message: `Actuator Feed: ${value}%`,
      });
    } catch (shareError) {
      console.log(shareError.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Centered Actuator Card */}
      <View style={styles.card}>
        
        {/* Connection status dot component */}
        <StatusIndicator label="STATUS" connected={isConnected} />
        
        {/* Main Title */}
        <Text style={styles.title}></Text>

        {/* Reusable Slider Component (passes state & event down) */}
        <ActuatorSlider value={value} onChange={(val) => setValue(val)} />
           {/* 2. Place the Link inside the UI return block! */}
        
        <Link href="/calibration" style={styles.linkText}>
          Calibration Monitor
        </Link>

        {/* Bluetooth Connect / Disconnect button */}
        <TouchableOpacity
          style={[styles.bleButton, isConnected && styles.bleButtonConnected]}
          onPress={isConnected ? disconnectFromDevice : scanForDevices}
          disabled={isScanning}
        >
          <Text style={styles.bleButtonText}>
            {isScanning ? 'SCANNING…' : isConnected ? 'DISCONNECT' : 'SCAN FOR ESP32'}
          </Text>
        </TouchableOpacity>

        {/* Error message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Device picker — shown after scan, hidden once connected */}
        {!isConnected && scannedDevices.length > 0 && (
          <FlatList
            data={scannedDevices}
            keyExtractor={(item) => item.id}
            style={styles.deviceList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deviceItem}
                onPress={() => connectToDevice(item)}
              >
                <Text style={styles.deviceName}>{item.name || 'Unknown'}</Text>
                <Text style={styles.deviceId}>{item.id}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Raw Feed Output display */}
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>RAW FEED VALUE</Text>
          <View style={styles.outputBox}>
            <Text style={styles.outputText}>{Math.round(value)}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Text style={styles.copyButtonText}>SHARE</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Space dark theme
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  bleButton: {
    backgroundColor: 'rgba(0, 243, 255, 0.12)',
    borderColor: '#00f3ff4d',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  bleButtonConnected: {
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderColor: '#00ff884d',
  },
  bleButtonText: {
    color: '#f1f1f1',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  deviceList: {
    width: '100%',
    maxHeight: 120,
    marginTop: 8,
  },
  deviceItem: {
    backgroundColor: 'rgba(0, 243, 255, 0.06)',
    borderColor: '#00f3ff4d',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  deviceName: {
    color: '#f1f1f1',
    fontSize: 13,
    fontWeight: 'bold',
  },
  deviceId: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    marginTop: 2,
  },
  linkText:{
    color: '#1a1a1a',
    padding:12,
    borderRadius: 4,
    borderColor: '#f1f1f1',
    backgroundColor: '#f1f1f1',
  },
  card: {
    backgroundColor: 'rgba(13, 19, 36, 0.6',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  footer: {
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },
  outputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  outputText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  copyButton: {
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    borderColor: '#00f3ff4d',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  copyButtonText: {
    color: '#f1f1f1',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
