import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusIndicator({ label, connected = false }) {
  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusDot, connected ? styles.dotConnected : styles.dotDisconnected]} />
      <Text style={styles.statusText}>
        {label} — {connected ? 'CONNECTED' : 'DISCONNECTED'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dotConnected: {
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
  },
  dotDisconnected: {
    backgroundColor: '#00f3ff4d',
    shadowColor: '#00f3ff4d',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
