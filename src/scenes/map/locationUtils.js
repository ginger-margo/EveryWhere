import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

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

