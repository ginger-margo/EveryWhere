import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import ScreenTemplate from '../../components/ScreenTemplate';
import { colors, fontSize } from '../../theme';
import { mockTravelPoints } from '../../data/mockTravelData';

export default function Stats() {
  const [travelStats, setTravelStats] = useState(null);

  useEffect(() => {
    // Process raw points to calculate statistics
    const calculateStats = (points) => {
      const destination = "Aungier St TU Dublin";
      const duration = "30 minutes"; // Can calculate using timestamps if needed
      const distance = calculateDistance(points); // Custom function to calculate distance
      const steps = estimateSteps(distance); // Custom function to estimate steps

      return { destination, duration, distance, steps };
    };

    const stats = calculateStats(mockTravelPoints);
    setTravelStats(stats);
  }, []);

  const calculateDistance = (points) => {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += haversine(points[i - 1], points[i]);
    }
    return `${totalDistance.toFixed(2)} km`;
  };

  const estimateSteps = (distance) => {
    const distanceInKm = parseFloat(distance.split(" ")[0]);
    const averageStepLengthInMeters = 0.78; // Average step length in meters
    return Math.round((distanceInKm * 1000) / averageStepLengthInMeters);
  };

  const haversine = (point1, point2) => {
    const toRadians = (degree) => (degree * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRadians(point2.latitude - point1.latitude);
    const dLon = toRadians(point2.longitude - point1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(point1.latitude)) *
        Math.cos(toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  return (
    <ScreenTemplate>
      <ScrollView style={styles.main}>
        <Text style={styles.title}>Travel Statistics</Text>
        {travelStats ? (
          <View style={styles.statContainer}>
            <Text style={styles.statText}>Destination: {travelStats.destination}</Text>
            <Text style={styles.statText}>Duration: {travelStats.duration}</Text>
            <Text style={styles.statText}>Distance: {travelStats.distance}</Text>
            <Text style={styles.statText}>Steps: {travelStats.steps}</Text>
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading statistics...</Text>
        )}
      </ScrollView>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: fontSize.xxxLarge,
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: 20,
  },
  statContainer: {
    backgroundColor: colors.lightyellow,
    padding: 15,
    marginVertical: 10,
    borderRadius: 5,
  },
  statText: {
    fontSize: fontSize.large,
    color: colors.primaryText,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: fontSize.large,
    color: colors.gray,
  },
});
