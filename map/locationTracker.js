import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

let locationSubscription;

export const startForegroundLocationTracking = async (uid) => {
  if (!uid) {
    console.error("UID is missing. Please provide a valid user ID.");
    return;
  }

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 1000, // in milliseconds
      distanceInterval: 10, // in meters
    },
    async (location) => {
      const data = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      };

      try {
        // ✅ Correct Firestore Path: locations/{userId}/locationData/
        const locationsRef = collection(firestore, `locations/${uid}/locationData`);
        await addDoc(locationsRef, data);
        console.log('Location saved in Firestore:', new Date(location.timestamp).toLocaleString());
      } catch (error) {
        console.error('Error saving location in Firestore:', error);
      }
    }
  );
};

export const stopForegroundLocationTracking = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
};
