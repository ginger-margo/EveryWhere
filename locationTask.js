// locationTask.js
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the actual background task
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    console.log('Background locations:', locations);
    // Do something with the locations array
  }
});

// Start location updates for the background task
export async function startBackgroundUpdate() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status === 'granted') {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,  // ms between updates
      distanceInterval: 0, // minimum meters traveled
      showsBackgroundLocationIndicator: true,
      // iOS foreground service notification
      foregroundService: {
        notificationTitle: 'MyApp is using your location',
        notificationBody: 'To track your route.',
      },
    });
  } else {
    console.log('Background location permission not granted');
  }
}

// Stop location updates for the background task
export async function stopBackgroundUpdate() {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
