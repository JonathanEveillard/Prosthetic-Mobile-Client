import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusIndicator({ label, isConnected }) {
  return (
    <View style={styles.statusContainer}>
      <View style={[
        styles.statusDot, 
        { backgroundColor: isConnected ? '#39ff14' : '#ff3b30' } // Green online, red offline
      ]} />
      <Text style={styles.statusText}>{label}</Text>
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
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});