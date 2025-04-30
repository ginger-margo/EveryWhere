import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
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
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const fetchFavorites = async () => {
    try {
      const snapshot = await getDocs(
        collection(firestore, `users/${userId}/favorites`)
      );
      const favs = snapshot.docs.map((doc) => doc.data());
      setFavorites(favs);
      console.log("Fetched favorites:", favs);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  useEffect(() => {
    if (showFavorites && userId) {
      fetchFavorites();
    }
  }, [showFavorites, userId]);

  useEffect(() => {
    (async () => {
      const places = await getMostVisitedPlaces(userId);

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
        locationData.sort((a, b) => a.timestamp - b.timestamp);
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

      // Start real-time tracking
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

  useEffect(() => {
    if (userId) {
      fetchFavorites(); // когда юзер залогинился
    }
  }, [userId]);

  return (
    <View style={styles.container}>
      {/* Переключатель */}
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={[
            styles.switchButton,
            !showFavorites && styles.activeSwitchButton,
          ]}
          onPress={() => setShowFavorites(false)}
        >
          <Text
            style={!showFavorites ? styles.activeSwitchText : styles.switchText}
          >
            Popular
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchButton,
            showFavorites && styles.activeSwitchButton,
          ]}
          onPress={() => setShowFavorites(true)}
        >
          <Text
            style={showFavorites ? styles.activeSwitchText : styles.switchText}
          >
            Favorites
          </Text>
        </TouchableOpacity>
      </View>

      {/* Карта */}
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
          {/* Линия пути */}
          <Polyline
            coordinates={trail}
            strokeColor="rgba(218, 132, 195, 0.5)"
            strokeWidth={40}
          />

          {/* Дом */}
          {home && (
            <Marker coordinate={home} title="🏠 Home">
              <Callout
                onPress={() =>
                  navigation.navigate("Recommendations", {
                    location: home,
                    type: "home",
                    fetchFavoritesFromMap: fetchFavorites,
                  })
                }
              >
                <View style={{ padding: 5 }}>
                  <Text>Discover around Home</Text>
                </View>
              </Callout>
            </Marker>
          )}

          {/* Работа */}
          {work && (
            <Marker coordinate={work} title="💻 Work/Study">
              <Callout
                onPress={() =>
                  navigation.navigate("Recommendations", {
                    location: work,
                    type: "work",
                    fetchFavoritesFromMap: fetchFavorites,
                  })
                }
              >
                <View style={{ padding: 5 }}>
                  <Text>Discover around Work/Study</Text>
                </View>
              </Callout>
            </Marker>
          )}

          {showFavorites
            ? favorites?.length > 0 &&
              favorites.map((fav, index) => (
                <Marker
                  key={index}
                  coordinate={{
                    latitude: fav.latitude,
                    longitude: fav.longitude,
                  }}
                  title={fav.name || "Favorite Place"}
                  description={fav.address || ""}
                  pinColor="#DA84C3" 
                >
                  <Callout>
                    <View style={{ padding: 5 }}>
                      <Text>{fav.name || "Favorite Place"}</Text>
                      <Text>{fav.address || ""}</Text>
                    </View>
                  </Callout>
                </Marker>
              ))
            : mostVisitedPlaces?.length > 0 &&
              mostVisitedPlaces.map((place, index) => (
                <Marker
                  key={index}
                  coordinate={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                  }}
                >
                  <Text style={{ fontSize: 30 }}>
                    {locationIcons[place.type] || "💟"}
                  </Text>
                  <Callout
                    onPress={() =>
                      navigation.navigate("Recommendations", {
                        location: place,
                        type: place.type,
                        fetchFavoritesFromMap: fetchFavorites,
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
  switchContainer: {
    position: "absolute",
    top: 40,
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
    zIndex: 10,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  activeSwitchButton: {
    backgroundColor: "#DA84C3",
  },
  switchText: {
    color: "#3B3A36",
    fontWeight: "600",
  },
  activeSwitchText: {
    color: "white",
    fontWeight: "600",
  },
});
