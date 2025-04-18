import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { firestore } from "../firebase/config";
import { transformLocationsForRadius } from "./locationUtils";
import { startForegroundLocationTracking } from "./locationTracker";
import {
  startBackgroundLocationTracking,
  fetchAndGeocodeMostVisitedPlaces,
} from "./locationUtils";
import { detectHomeAndWork } from "./locationTracker";
import { seedMostVisitedPlaces } from "./mockMostVisitedPlaces";
import { useNavigation } from "@react-navigation/native";
import { Callout } from "react-native-maps";
import { getMostVisitedPlaces } from "./locationTracker";

const locationIcons = {
  gym: "🏋️‍♀️",
  home: "🏠",
  work: "🎒",
  groceries: "🛒",
  bar: "🍻",
  cafe: "☕️",
};

export default function Map() {
  const [location, setLocation] = useState(null);
  const [trail, setTrail] = useState([]);
  const [userId, setUserId] = useState(null);
  const [home, setHome] = useState(null);
  const [work, setWork] = useState(null);
  const [cafe, setCafe] = useState(null);
  const [mostVisitedPlaces, setMostVisitedPlaces] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const places = await getMostVisitedPlaces(userId);
      console.log(places, "These are the places");
      console.log("Got most visited places");

      const locations = await Promise.all(
        places
          .sort((a, b) => b.timeSpent - a.timeSpent)
          .filter((place) => place.type !== "home" && place.type !== "work")
          .map(async (place) => {
            let type = place.type;
            return {
              ...place,
              icon: locationIcons[type] || "🏆",
              name: "Unknown Place",
            };
          })
      );

      console.log("Locations to display", locations);
      setMostVisitedPlaces(locations);
    })();
  }, [userId]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchHomeAndWork = async () => {
      if (!userId) return;
      const { home, work } = await detectHomeAndWork(userId);
      setHome(home);
      setWork(work);
      setCafe({
        latitude: 53.3400223,
        longitude: -6.2662978,
        count: 10,
        timeSpent: 50,
        type: "cafe",
      });
    };
    fetchHomeAndWork();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchLocationData = async () => {
      try {
        const locationsRef = collection(
          firestore,
          `locations/${userId}/locationData`
        );
        const locationSnapshot = await getDocs(locationsRef);
        const locationData = locationSnapshot.docs.map((doc) => doc.data());
        const adjustedLocations = transformLocationsForRadius(
          locationData,
          1000
        );
        setTrail(adjustedLocations);
      } catch (error) {
        console.error("Error fetching location data:", error);
      }
    };

    fetchLocationData();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    startBackgroundLocationTracking();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const initialCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation({
        ...initialCoords,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });

      setTrail([initialCoords]);

      // ✅ Start real-time tracking
      startForegroundLocationTracking(userId);

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Update every 5 meters
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;

          setLocation((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));

          setTrail((prevTrail) => [...prevTrail, { latitude, longitude }]);
        }
      );

      return () => {
        locationSubscription.remove();
      };
    })();
  }, [userId]);

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsPointsOfInterest={false}
        >
          <Polyline
            coordinates={trail}
            strokeColor="rgba(218, 132, 195, 0.5)"
            strokeWidth={40}
          />
          {home && (
            <Marker coordinate={home} title="🏠 Home">
              <Callout
                onPress={() =>
                  navigation.navigate("Recommendations", {
                    location: home,
                    type: "home",
                  })
                }
              >
                <View style={{ padding: 5 }}>
                  <Text>Discover around Home</Text>
                </View>
              </Callout>
            </Marker>
          )}
          {work && (
            <Marker coordinate={work} title="💻 Work/Study">
              <Callout
                onPress={() =>
                  navigation.navigate("Recommendations", {
                    location: work,
                    type: "work",
                  })
                }
              >
                <View style={{ padding: 5 }}>
                  <Text>Discover around Work/Study</Text>
                </View>
              </Callout>
            </Marker>
          )}
          {mostVisitedPlaces?.map((place, index) => (
            <Marker coordinate={place} key={index}>
              <Text style={{ fontSize: 30 }}>
                {locationIcons[place.type] || "💟"}
              </Text>
              <Callout
                onPress={() =>
                  navigation.navigate("Recommendations", {
                    location: place,
                    type: place.type,
                  })
                }
              >
                <Text>See more</Text>
              </Callout>
            </Marker>
          ))}
        </MapView>
      ) : (
        <Text>Loading map...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { width: "100%", height: "100%" },
});
