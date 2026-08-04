import React, { useState } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import StatusIndicator from '../components/StatusIndicator';
import ActuatorSlider from '../components/ActuatorSlider';
import { Colors } from '../constants/Colors';
import useBLE from '../hooks/useBLE'; 

export default function App() {
  const [value, setValue] = useState(0);

  const {
    isScanning,
    scannedDevices,
    connectedDevice,
    scanForDevices,
    connectToDevice,
    disconnectFromDevice,
    writeLEDValue,
  } = useBLE();

  const handleSliderChange = (val) => {
    setValue(val);
    if (connectedDevice) {
      writeLEDValue(Math.round(val));
    }
  };

  const handleSliderRelease = (val) => {
  if (connectedDevice) {
    console.log("Transmitting value:", Math.round(val));
    writeLEDValue(Math.round(val));
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.card}>
        
        {/* Dynamic connection indicator */}
        <StatusIndicator 
          label={connectedDevice ? "CONNECTED" : "OFFLINE"} 
          isConnected={!!connectedDevice} 
        />
        
        <Text style={styles.title}>ACTUATOR // CHANNEL 01</Text>

        {/* Scan & Connect Bluetooth Panel */}
        <View style={styles.blePanel}>
          {!connectedDevice ? (
            <View>
              <TouchableOpacity 
                style={[styles.actionButton, isScanning && styles.buttonDisabled]} 
                onPress={scanForDevices}
                disabled={isScanning}
              >
                {isScanning ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={Colors.cyan} />
                    <Text style={styles.scanBtnText}>SCANNING...</Text>
                  </View>
                ) : (
                  <Text style={styles.actionBtnText}>SCAN FOR CONTROLLER</Text>
                )}
              </TouchableOpacity>

              {scannedDevices.length > 0 && (
                <View style={styles.deviceListContainer}>
                  <Text style={styles.listLabel}>FOUND DEVICES:</Text>
                  <ScrollView style={styles.deviceScroll}>
                    {scannedDevices.map((device) => (
                      <TouchableOpacity 
                        key={device.id} 
                        style={styles.deviceRow}
                        onPress={() => connectToDevice(device)}
                      >
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.connectText}>TAP TO CONNECT</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.connectedRow}>
              <Text style={styles.connectedInfo}>Linked: ESP32-LED-CTRL</Text>
              <TouchableOpacity 
                style={styles.disconnectButton} 
                onPress={disconnectFromDevice}
              >
                <Text style={styles.disconnectBtnText}>DISCONNECT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Slider Area (Locked when offline) */}
        <View style={[styles.sliderArea, !connectedDevice && styles.disabledArea]}>
          <ActuatorSlider 
            value={value} 
            onChange={handleSliderChange}
            onRelease={handleSliderRelease}
            disabled={!connectedDevice} 
          />
          {!connectedDevice && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockText}>CONNECT BLUETOOTH TO ACTIVATE</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLabel}>RAW FEED VALUE</Text>
          <View style={styles.outputBox}>
            <Text style={styles.outputText}>{Math.round(value)}</Text>
            <Text style={styles.byteLabel}>1 BYTE (HEX: 0x{Math.round(value).toString(16).toUpperCase().padStart(2, '0')})</Text>
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