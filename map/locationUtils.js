import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../firebase/config";
import { GOOGLE_PLACES_API_KEY } from "@env";


const LOCATION_TASK_NAME = "background-location-task";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    console.log("Received new locations:", locations);
    // Send locations to your backend or store them locally
  }
});

export const startBackgroundLocationTracking = async () => {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status === "granted") {
    console.log("Location Tracking started");
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 50, // Minimum change in meters for an update
      deferredUpdatesInterval: 60000, // Minimum time in ms for updates
    });
  } else {
    console.log("Permission denied");
  }
};


const adjustCoordinatesForRadius = (location, radius) => {
  const earthRadiusInMeters = 111320; // Радиус земли для широты
  const latitude = location.latitude;
  const longitude = location.longitude;

  const deltaLatitude = radius / earthRadiusInMeters; // Смещение по широте
  const deltaLongitude = radius / (earthRadiusInMeters * Math.cos(latitude * Math.PI / 180)); // Смещение по долготе

  return {
    minLatitude: latitude - deltaLatitude,
    maxLatitude: latitude + deltaLatitude,
    minLongitude: longitude - deltaLongitude,
    maxLongitude: longitude + deltaLongitude,
  };
};

// Преобразование данных для расширения зоны захвата
export const transformLocationsForRadius = (locations, radius) => {
  return locations.map((location) => {
    const adjusted = adjustCoordinatesForRadius(location, radius);
    return {
      ...location,
      latitude: location.latitude, // Центр остается неизменным
      longitude: location.longitude, // Центр остается неизменным
      minLatitude: adjusted.minLatitude, // Нижняя граница
      maxLatitude: adjusted.maxLatitude, // Верхняя граница
      minLongitude: adjusted.minLongitude, // Левая граница
      maxLongitude: adjusted.maxLongitude, // Правая граница
    };
  });
};

export const returnGeocodedLocation = async ({latitude, longitude}) => {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      console.log(result, "returnGeocodedLocation");
      return result;
}

const reverseGeocode = async (latitude, longitude) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results.length > 0) {
      return data.results[0]; // Первый результат (самый точный)
    }
    return null;
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
    return null;
  }
};


// Get geocoded most visited places
export const fetchAndGeocodeMostVisitedPlaces = async (uid) => {
  if (!uid) {
    console.error("UID is required.");
    return [];
  }

  try {
    // Reference to the 'mostVisitedPlaces' subcollection
    const mostVisitedRef = collection(firestore, `locations/${uid}/mostVisitedPlaces`);
    const querySnapshot = await getDocs(mostVisitedRef);

    if (querySnapshot.empty) {
      console.log("No most visited places found.");
      return [];
    }

    // Iterate over each location and geocode it
    const geocodedLocations = [];
    for (const doc of querySnapshot.docs) {
      const locationData = doc.data();
      if (locationData.latitude && locationData.longitude) {
        const geocoded = await returnGeocodedLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });
        const placeType = await reverseGeocode(locationData.latitude, locationData.longitude);
        console.log(placeType);
        geocodedLocations.push({ ...locationData, geocoded });
      }
    }

    return geocodedLocations;
  } catch (error) {
    console.error("Error fetching and geocoding most visited places:", error);
    return [];
  }
};

//Get type for most visited places
const getLocationTypeFromGoogle = async (latitude, longitude) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=70&key=${GOOGLE_PLACES_API_KEY}`;
  console.log(url);
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.results.length > 0) {
      const placeType = data.results[0].types; // Example: ["restaurant", "food", "point_of_interest"]
      return placeType;
    }

    return ["unknown"];
  } catch (error) {
    console.error("Error fetching location type:", error);
    return ["unknown"];
  }
};

