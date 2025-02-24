import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

// Haversine Formula to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const useLocationTracker = (distanceInterval = 50, timeInterval = 1000) => {
  const [totalDistance, setTotalDistance] = useState(0);
  const [mostVisitedPlaces, setMostVisitedPlaces] = useState([]);
  const [locationDurations, setLocationDurations] = useState([]);
  const [error, setError] = useState(null);

  const currentLocationRef = useRef(null);
  const arrivalTimeRef = useRef(null);
  const locationSubscriptionRef = useRef(null);

  useEffect(() => {
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied.');
          return;
        }

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

            // Distance Calculation
            if (currentLocationRef.current) {
              const dist = calculateDistance(
                currentLocationRef.current.latitude,
                currentLocationRef.current.longitude,
                newCoords.latitude,
                newCoords.longitude
              );
              setTotalDistance((prev) => prev + dist);
            }

            // Track Most Visited Places
            setMostVisitedPlaces((prevPlaces) => {
              const existingPlace = prevPlaces.find(
                (place) =>
                  calculateDistance(place.latitude, place.longitude, newCoords.latitude, newCoords.longitude) < 0.1 // Within 100m
              );

              if (existingPlace) {
                return prevPlaces.map((place) =>
                  place.latitude === existingPlace.latitude && place.longitude === existingPlace.longitude
                    ? { ...place, count: place.count + 1 }
                    : place
                );
              } else {
                return [...prevPlaces, { ...newCoords, count: 1 }];
              }
            });

            // Track time spent at locations
            if (currentLocationRef.current) {
              const timeSpent = Date.now() - arrivalTimeRef.current;
              setLocationDurations((prev) => [
                ...prev,
                { ...currentLocationRef.current, duration: timeSpent },
              ]);
            }

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
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [distanceInterval, timeInterval]);

  return { locationDurations, totalDistance, mostVisitedPlaces, error };
};

export default useLocationTracker;
