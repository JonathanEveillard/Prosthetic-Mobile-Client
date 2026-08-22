import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, Share, FlatList, ScrollView } from 'react-native';
import { Link } from 'expo-router';

import StatusIndicator from '../components/StatusIndicator';
import ActuatorSlider from '../components/ActuatorSlider';
import useBluetooth from '../hooks/useBLE';
import { Colors } from '../constants/Colors';

export default function App() {
  const [value, setValue] = useState(0);
  const {
    isScanning,
    isConnected,
    scannedDevices,
    connectedDevice,
    error,
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

      <View style={styles.card}>
        {/* Connection status dot */}
        <StatusIndicator label="STATUS" connected={isConnected} />

        {/* Main Title */}
        <Text style={styles.title}>PROSTHETIC CONTROLLER</Text>

        {/* BLE panel — scan / device list / connected state */}
        <View style={styles.blePanel}>
          {!isConnected ? (
            <>
              {/* Scan button */}
              <TouchableOpacity
                style={[styles.actionButton, isScanning && styles.buttonDisabled]}
                onPress={scanForDevices}
                disabled={isScanning}
              >
                {isScanning ? (
                  <View style={styles.loaderContainer}>
                    <Text style={styles.scanBtnText}>SCANNING…</Text>
                  </View>
                ) : (
                  <Text style={styles.actionBtnText}>SCAN FOR ESP32</Text>
                )}
              </TouchableOpacity>

              {/* Error message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Device list */}
              {scannedDevices.length > 0 && (
                <View style={styles.deviceListContainer}>
                  <Text style={styles.listLabel}>NEARBY DEVICES</Text>
                  <ScrollView style={styles.deviceScroll}>
                    {scannedDevices.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.deviceRow}
                        onPress={() => connectToDevice(item)}
                      >
                        <Text style={styles.deviceName}>{item.name || 'Unknown'}</Text>
                        <Text style={styles.connectText}>CONNECT</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            /* Connected state — show device name and disconnect button */
            <View style={styles.connectedRow}>
              <Text style={styles.connectedInfo}>
                {connectedDevice?.name || connectedDevice?.id || 'Connected'}
              </Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={disconnectFromDevice}
              >
                <Text style={styles.disconnectBtnText}>DISCONNECT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Slider — dimmed with lock overlay when not connected */}
        <View style={[styles.sliderArea, !isConnected && styles.disabledArea]}>
          <ActuatorSlider value={value} onChange={(val) => setValue(val)} />
          {!isConnected && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockText}>CONNECT TO UNLOCK</Text>
            </View>
          )}
        </View>

        <Link href="/calibration" style={styles.linkText}>
          Calibration Monitor
        </Link>

        {/* Raw Feed Output display */}
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>RAW FEED VALUE</Text>
          <View style={styles.outputBox}>
            <View>
              <Text style={styles.outputText}>{Math.round(value)}</Text>
              <Text style={styles.byteLabel}>/ 100</Text>
            </View>
            <TouchableOpacity onPress={handleCopy}>
              <Text style={styles.actionBtnText}>SHARE</Text>
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
    backgroundColor: '#060812',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(13, 19, 36, 0.6)',
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 16,
  },
  blePanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    borderColor: Colors.cyan,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scanBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  deviceListContainer: {
    marginTop: 12,
  },
  listLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  deviceScroll: {
    maxHeight: 100,
  },
  deviceRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deviceName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: 'bold',
  },
  connectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedInfo: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#ff3b30',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  disconnectBtnText: {
    color: '#ff3b30',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sliderArea: {
    position: 'relative',
  },
  disabledArea: {
    opacity: 0.25,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    backgroundColor: 'rgba(6, 8, 18, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.2)',
  },
  linkText: {
    color: '#1a1a1a',
    padding: 12,
    borderRadius: 4,
    borderColor: '#f1f1f1',
    backgroundColor: '#f1f1f1',
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
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
  byteLabel: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});
