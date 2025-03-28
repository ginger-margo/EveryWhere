import { collection, addDoc, doc, getDocs, getDoc, setDoc } from "firebase/firestore";
import { firestore, auth } from "../firebase/config";
import * as Location from "expo-location";

// Helper function to calculate distance between two points (Haversine Formula)
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

  console.log("LOG: updating most visited places");
  
  const uid = user.uid;
  console.log(uid, "This is UID");
  console.log("Firestore instance:", firestore);

  // Reference to the 'mostVisitedPlaces' subcollection under the 'locations' document
  const mostVisitedRef = collection(firestore, `locations/${uid}/mostVisitedPlaces`);
  
  try {
    console.log("Checking Firestore subcollection...");
    const querySnapshot = await getDocs(mostVisitedRef);
    const places = [];
    querySnapshot.forEach((doc) => {
      places.push(doc.data());
    });

    let updated = false;
    const currentTime = Date.now();
    const timeSpent = arrivalTime ? (currentTime - arrivalTime) / 60000 : 0; // Convert ms to minutes

    // Merge or add new places
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

    // Clear the subcollection and add updated places
    await deleteDocs(mostVisitedRef); // Delete existing docs
    for (const place of top10Places) {
      await addDoc(mostVisitedRef, place);
    }

    console.log("Updated most visited places in Firestore under locations/{userId}/mostVisitedPlaces.");
  } catch (error) {
    console.error("Error updating most visited places:", error);
  }
};

// Helper function to delete all documents in a subcollection
const deleteDocs = async (ref) => {
  const querySnapshot = await getDocs(ref);
  querySnapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });
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
    console.log("Error getting most visited places", e);
    return [];
  }
}


// Function to detect Home & Work locations based on time spent
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

// Function to start tracking location & detect time spent at places
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
        await addDoc(locationsRef, data); // Generates a unique document ID automatically
        console.log("Location saved in Firestore:", new Date(data.timestamp).toLocaleString());
      
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
