import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

const useLocationTracker = (distanceInterval = 50, timeInterval = 1000) => {
  const [locationDurations, setLocationDurations] = useState([]);
  const [error, setError] = useState(null);

  const currentLocationRef = useRef(null);
  const arrivalTimeRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  useEffect(() => {
    const startTracking = async () => {
      try {
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied.');
          return;
        }

        // Start tracking location
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval,
            distanceInterval,
          },
          (location) => {
            const newCoords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            // Calculate time spent at the previous location
            if (currentLocationRef.current) {
              const timeSpent = Date.now() - arrivalTimeRef.current;
              setLocationDurations((prev) => [
                ...prev,
                { ...currentLocationRef.current, duration: timeSpent },
              ]);
            }

            // Update current location and arrival time
            currentLocationRef.current = newCoords;
            arrivalTimeRef.current = Date.now();
          }
        );
      } catch (err) {
        setError(err.message);
      }
    };

    startTracking();

    return () => {
      // Stop tracking when the component unmounts
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [distanceInterval, timeInterval]);

  return { locationDurations, error };
};

export default useLocationTracker;
