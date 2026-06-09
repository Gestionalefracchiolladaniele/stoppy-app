import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';

/**
 * Forest-green app background — replaces the old purple `PurpleBg`.
 * Deep-dark gradient + a soft mint glow at the top.
 * Palette source: pandafap/mascotte-nofap.html + STOPPY.md.
 */
export function ForestBg() {
  return (
    <>
      <LinearGradient
        colors={['#0F2218', '#0A180F', '#070D09']}
        locations={[0, 0.52, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(56,201,122,0.18)', 'rgba(56,201,122,0.05)', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={[StyleSheet.absoluteFillObject, { height: '40%' }]}
        pointerEvents="none"
      />
    </>
  );
}
