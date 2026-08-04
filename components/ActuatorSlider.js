import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

export default function ActuatorSlider({ value, onChange, onRelease, disabled }) {
  return (
    <View style={styles.sliderContainer}>
      {/* Readout Display */}
      <View style={styles.readoutContainer}>
        <Text style={styles.valueNumber}>{Math.round(value)}</Text>
        <Text style={styles.valueUnit}>%</Text>
      </View>

      {/* Slider Bar */}
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={value}
        onValueChange={onChange}
        onSlidingComplete={onRelease} 
        minimumTrackTintColor="#f1f1f1" // Glowing cyan track
        maximumTrackTintColor="rgba(255, 255, 255, 0.15)"
        thumbTintColor="#ffffff"
      />

      {/* Slider Ticks / Labels */}
      <View style={styles.ticksContainer}>
        <Text style={styles.tickText}>RELEASED (0%)</Text>
        <Text style={styles.tickText}>50%</Text>
        <Text style={styles.tickText}>PULLED (100%)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
    width: '100%',
    marginVertical: 20,
  },
  readoutContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    height: 100,
    marginBottom: 20,
  },
  valueNumber: {
    fontSize: 90,
    fontWeight: '800',
    color: '#ffffff',
  },
  valueUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f1f1f1', // Cyan
    marginLeft: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  ticksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  tickText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
  },
});
