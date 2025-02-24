import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import useLocationTracker from "./map/useLocationTracker";
import * as Location from "expo-location";

export default function ProfileScreen() {
  const { locationDurations, totalDistance, mostVisitedPlaces, error } = useLocationTracker();
  const [currentPlace, setCurrentPlace] = useState("Fetching location...");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentPlace("Location permission denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const placeName = await reverseGeocode(location.coords.latitude, location.coords.longitude);
      setCurrentPlace(placeName);
    })();
  }, []);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      return result[0]?.name || "Unknown Place";
    } catch (error) {
      console.error("Reverse Geocoding Error:", error);
      return "Error fetching location";
    }
  };

  if (error) {
    return <Text style={styles.errorText}>Error: {error}</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Profile Insights</Text>

      {/* Current Location */}
      <Text style={styles.sectionTitle}>📍 Current Location</Text>
      <Text style={styles.statText}>{currentPlace}</Text>

      {/* Distance Walked */}
      <Text style={styles.sectionTitle}>🚶 Distance Walked Today</Text>
      <Text style={styles.statText}>{totalDistance.toFixed(2)} km</Text>

      {/* Most Visited Places */}
      <Text style={styles.sectionTitle}>📍 Most Visited Places</Text>
      {mostVisitedPlaces.length > 0 ? (
        mostVisitedPlaces.map((place, index) => (
          <Text key={index} style={styles.statText}>
            {index + 1}. Lat: {place.latitude.toFixed(3)}, Lon: {place.longitude.toFixed(3)} ({place.count} visits)
          </Text>
        ))
      ) : (
        <Text style={styles.statText}>No data available</Text>
      )}

      {/* Time Spent at Locations */}
      <Text style={styles.sectionTitle}>⏳ Time Spent at Locations</Text>
      {locationDurations.map((loc, index) => (
        <Text key={index} style={styles.statText}>
          Lat: {loc.latitude.toFixed(3)}, Lon: {loc.longitude.toFixed(3)} - {Math.round(loc.duration / 60000)} mins
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", marginTop: 50 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 15 },
  statText: { fontSize: 16, marginTop: 5 },
  errorText: { fontSize: 16, color: "red", marginTop: 10 },
});
