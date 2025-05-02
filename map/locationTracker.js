import { collection, addDoc, getDocs } from "firebase/firestore";
import { firestore, auth } from "../firebase/config";
import * as Location from "expo-location";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

let currentLocation = null;
let arrivalTime = null;

const updateMostVisitedPlaces = async (latitude, longitude) => {
  const user = auth.currentUser;
  if (!user) return;
  
  const uid = user.uid;

  const mostVisitedRef = collection(firestore, `locations/${uid}/mostVisitedPlaces`);
  
  try {
    const querySnapshot = await getDocs(mostVisitedRef);
    const places = [];
    querySnapshot.forEach((doc) => {
      places.push(doc.data());
    });

    let updated = false;
    const currentTime = Date.now();
    const timeSpent = arrivalTime ? (currentTime - arrivalTime) / 60000 : 0; // Convert ms to minutes

    const updatedPlaces = places.map((place) => {
      const dist = calculateDistance(place.latitude, place.longitude, latitude, longitude);
      if (dist < 0.1) { // If within 100m, consider it the same place
        updated = true;
        return { 
          ...place, 
          count: place.count + 1, 
          timeSpent: (place.timeSpent || 0) + timeSpent 
        };
      }
      return place;
    });

    // If no place was updated, add a new one
    if (!updated) {
      updatedPlaces.push({ latitude, longitude, count: 1, timeSpent: timeSpent });
    }

    // Sort by time spent & visits
    updatedPlaces.sort((a, b) => b.timeSpent - a.timeSpent || b.count - a.count);

    // Keep only top 10 places
    const top10Places = updatedPlaces.slice(0, 10);

    for (const place of top10Places) {
      await addDoc(mostVisitedRef, place);
    }

  } catch (error) {
    console.error("Error updating most visited places:", error);
  }
};

export const getMostVisitedPlaces = async (uid) => {
  if (!uid) return [];
  try {
    const mostVisitedCollection = collection(firestore, "locations", uid, "mostVisitedPlaces");
    const snapshot = await getDocs(mostVisitedCollection);

    if (snapshot.empty) return { home: null, work: null };

    const places = snapshot.docs.map(doc => doc.data());
    return places;
  } catch (e) {
    console.error("Error getting most visited places", e);
    return [];
  }
}

export const detectHomeAndWork = async (uid) => {
  if (!uid) return { home: null, work: null };

  try {
    const mostVisitedCollection = collection(firestore, "locations", uid, "mostVisitedPlaces");
    const snapshot = await getDocs(mostVisitedCollection);

    if (snapshot.empty) return { home: null, work: null };

    const places = snapshot.docs.map(doc => doc.data());
    let home = null;
    let work = null;

    places.forEach((place) => {
      if (place.timeSpent > (home?.timeSpent || 0) && place.timeSpent >= 300) {
        home = place;
      }
      if (
        place.timeSpent > (work?.timeSpent || 0) &&
        place.timeSpent >= 60 &&
        place.timeSpent <= 200
      ) {
        work = place;
      }
    });

    return { home, work };
  } catch (error) {
    console.error("Error detecting Home & Work:", error);
    return { home: null, work: null };
  }
};

export const startForegroundLocationTracking = async (uid) => {
  if (!uid) {
    console.error("UID is missing. Please provide a valid user ID.");
    return;
  }

  await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000, // Check location every 30 seconds
      distanceInterval: 10, // Minimum 10 meters before updating
    },
    async (location) => {
      const data = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };

      try {
        const locationsRef = collection(firestore, `locations/${uid}/locationData`);
        await addDoc(locationsRef, data);
      
        if (!currentLocation || calculateDistance(currentLocation.latitude, currentLocation.longitude, data.latitude, data.longitude) > 0.1) {
          // User moved to a new location
          if (currentLocation) {
            updateMostVisitedPlaces(currentLocation.latitude, currentLocation.longitude);
          }
          arrivalTime = Date.now();
          currentLocation = data;
        }
      } catch (error) {
        console.error("Error saving location in Firestore:", error);
      }
      
    }
  );
};
