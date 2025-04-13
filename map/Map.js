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

const PLACES = [
  {
    latitude: 53.3509935,
    longitude: -6.2773878,
    count: 8,
    timeSpent: 300,
    type: "home",
  },
  {
    latitude: 53.3385303,
    longitude: -6.2691175,
    count: 5,
    timeSpent: 200,
    type: "work",
  },
  {
    //it's a trap cafe
    latitude: 53.3400223,
    longitude: -6.2662978,
    count: 10,
    timeSpent: 50,
    type: "cafe",
  },
  {
    //gym
    latitude: 53.348242,
    longitude: -6.2811017,
    count: 5,
    timeSpent: 5,
    type: "gym",
  },
  {
    // cobblestones pub
    latitude: 53.3488314,
    longitude: -6.2808707,
    count: 1,
    timeSpent: 11,
    type: "bar",
  },
  {
    //lidl
    latitude: 53.3502178,
    longitude: -6.279085,
    count: 10,
    timeSpent: 2,
    type: "grocery",
  },
  {
    //ohenix park
    latitude: 53.3539102,
    longitude: -6.3229063,
    count: 3,
    timeSpent: 4,
    type: "parks",
  },
];

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
    setMostVisitedPlaces(PLACES);
  }, []);

  useEffect(() => {
    (async () => {
      const places = await getMostVisitedPlaces(auth.currentUser.uid);
      console.log("Got most visited places");
      let locations = places
        .sort((a, b) => {
          return b.timeSpent - a.timeSpent;
        })
        .filter((place) => {
          return place.type != "home" && place.type != "work";
        })
        .map(async (place) => {
          let type = place.type;
          //const result = await returnGeocodedLocation(place);
          return {
            ...place,
            icon: locationIcons[type] || "🏆",
            //name: result[0]?.name || "Unknown Place"
            name: "Unknown Place",
          };
        });
      console.log("Locations to display", locations);
      setMostVisitedPlaces(locations);
    })();
  }, []);

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
      fetchAndGeocodeMostVisitedPlaces(userId);
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
                  <Text>Go to Home Details</Text>
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
                  <Text>Go to Work Details</Text>
                </View>
              </Callout>
            </Marker>
          )}
          {mostVisitedPlaces?.map((place, index) => (
            <Marker
              key={`${place.latitude}-${place.longitude}-${index}`}
              coordinate={place}
            >
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
                <View style={{ padding: 5 }}>
                  <Text numberOfLines={1} ellipsizeMode="tail">
                    Go to {place.type} Details
                  </Text>
                </View>
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
