import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { transformLocationsForRadius } from './locationUtils';
import { startForegroundLocationTracking } from './locationTracker';
import { startBackgroundLocationTracking } from './locationUtils';

export default function Map() {
  const [location, setLocation] = useState(null);
  const [trail, setTrail] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get the currently authenticated user and set the UID dynamically
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        console.error("No user signed in");
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  useEffect(() => {
    if (!userId) return; // Wait for the user ID before fetching data

    const fetchLocationData = async () => {
      try {
        const locationsRef = collection(firestore, `locations/${userId}/locationData`);
        const locationSnapshot = await getDocs(locationsRef);

        const locationData = locationSnapshot.docs.map((doc) => doc.data());
        console.log('Locations fetched:', locationData);

        const adjustedLocations = transformLocationsForRadius(locationData, 1000);
        setTrail(adjustedLocations);
      } catch (error) {
        console.error('Error fetching location data:', error);
      }
    };

    fetchLocationData();
  }, [userId]); // Runs when userId changes

  useEffect(() => {
    if (!userId) return; // Start tracking only if user ID is available

    startBackgroundLocationTracking();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });

      startForegroundLocationTracking(userId); // ✅ Use dynamic userId
    })();
  }, [userId]); // Runs when userId changes

  return (
    <View style={styles.container}>
      {location ? (
        <MapView style={styles.map} initialRegion={location} showsUserLocation={true} showsPointsOfInterest={false}>
          <Marker coordinate={location} title="You are here now" />
          <Polyline coordinates={trail} strokeColor="rgba(0, 200, 0, 0.5)" strokeWidth={20} />
        </MapView>
      ) : (
        <Text>"No data"</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
