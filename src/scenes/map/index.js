import React, { useState, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { startForegroundLocationTracking } from './locationTracker'
import { UID } from './constants'
import { mockTravelPoints } from '../../data/mockTravelData'; // Подключение MockTravelData
import { startBackgroundLocationTracking } from './locationUtils';

export default function Map() {
  const [location, setLocation] = useState(null)
  const [trail, setTrail] = useState([])

  useEffect(() => {
    // Инициализация мок-данных маршрута
    setTrail(mockTravelPoints);
    startBackgroundLocationTracking();

    (async () => {
      const requestPermissions = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Foreground location permission not granted');
          return;
        }

        console.log('Permissions granted for both foreground and background location');
      };

      requestPermissions();

      let currentLocation = await Location.getCurrentPositionAsync({})
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.001, // Сильный зум
        longitudeDelta: 0.001,
      })

      startForegroundLocationTracking(UID)
    })()
  }, [])

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={location}
          showsUserLocation={true}
        >
          <Marker coordinate={location} title="You are here now" />

          {/* Линия для отображения маршрута */}
          <Polyline
            coordinates={trail}
            strokeColor="rgba(0, 200, 0, 0.5)"
            strokeWidth={20}
          />
        </MapView>
      ) : null}
    </View>
  )
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
})

/* Код, связанный с Firestore, закомментирован
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../firebase/config';
import {transformLocationsForRadius} from './locationUtils';

// useEffect(() => {
//   // Loading location data from Firestore
//   const fetchLocationData = async () => {
//     const uid = UID;
//     try {
//       const locationsRef = collection(firestore, `coords/${uid}/locations`);
//       const locationSnapshot = await getDocs(locationsRef);

//       const locationData = locationSnapshot.docs.map((doc) => doc.data());
//       setLocations(locationData);
//     } catch (error) {
//       console.error('Error fetching location data:', error);
//     }

//     console.log('Locations fetched:', locations);
//     const adjustedLocations = transformLocationsForRadius(locations, 1000);
//     console.log(adjustedLocations[0]);
//     setTrail(adjustedLocations);
//   };

//   fetchLocationData();
// }, []);
*/
