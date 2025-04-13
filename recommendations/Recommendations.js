import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import DropDownPicker from "react-native-dropdown-picker";
import { getNearbyPlaces } from "./utils";
import { GOOGLE_PLACES_API_KEY } from "@env";
import { useRoute } from "@react-navigation/native";

// Получаем ширину экрана
const { width } = Dimensions.get("window");

// Карточки будут 2 в ряд, 3:4 (75% от ширины)
const CARD_WIDTH = width / 2.3;
const CARD_HEIGHT = CARD_WIDTH * 1.6;

export default function RecommendationsScreen() {
  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const route = useRoute();
  const { location: placeLocation, type = "current" } = route.params || {};

  // Dropdown state
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([
    { label: "Restaurants", value: "restaurant" },
    { label: "Cafes", value: "cafe" },
    { label: "Bars", value: "bar" },
    { label: "Parks", value: "park" },
    { label: "Museums", value: "museum" },
    { label: "Shopping", value: "shopping_mall" },
    { label: "Sport", value: "gym" },
    { label: "Groceries", value: "grocery_or_supermarket" },
  ]);

  useEffect(() => {
    (async () => {
      if (type === "current") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          alert("Permission to access location was denied");
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } else {
        // Use passed location (home or work)
        setLocation(placeLocation);
      }
    })();
  }, []);

  useEffect(() => {
    if (placeLocation) {
      setLocation(placeLocation); // если передано вручную
    }

    // Установим умолчания
    if (type === "home") {
      setSelectedCategory("park");
    } else if (type === "work") {
      setSelectedCategory("cafe");
    } else if (type) {
      setSelectedCategory(type);
    }
  }, [type, placeLocation]);

  const fetchPlaces = async () => {
    if (!selectedCategory) {
      alert("Please select a category!");
      return;
    }
    if (!location) {
      alert("Location not available yet. Please wait...");
      return;
    }

    const typeToCategoryMap = {
      home: "park",
      work: "cafe",
      cafe: "cafe",
      restaurant: "restaurant",
      gym: "gym",
      groceries: "grocery_or_supermarket",
      bar: "bar",
    };

    setLoading(true);
    const category = typeToCategoryMap[type] || selectedCategory || "bar";
    const results = await getNearbyPlaces(
      location.latitude,
      location.longitude,
      category
    );

    setPlaces(results);
    setLoading(false);
  };

  const renderPlace = ({ item }) => {
    const photoUrl = item.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
      : "https://via.placeholder.com/400";

    return (
      <View style={styles.card}>
        <Image source={{ uri: photoUrl }} style={styles.image} />
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="tail">
            {item.vicinity}
          </Text>
          <Text style={styles.rating}>
            ⭐ {item.rating || "N/A"} | 💰 {item.price_level ?? "N/A"}
          </Text>
          <Text style={styles.status}>
            {item.opening_hours?.open_now ? "🟢 Open Now" : "🔴 Closed"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.topSection}>
          <Text style={styles.screenTitle}>Explore more</Text>
          <Text style={styles.sectionTitle}>
            Showing places near{" "}
            <Text style={styles.weekRange}>
              {type === "home"
                ? "🏠 Home"
                : type === "work"
                ? "💻 Work"
                : type === "cafe"
                ? "☕️ Cafe"
                : type === "gym"
                ? "🏋️ Gym"
                : type === "bar"
                ? "🍻 Bar"
                : "📍 Current Location"}
            </Text>
          </Text>
        </View>
        <View style={styles.header}>
          {/* Dropdown Selector */}
          <DropDownPicker
            open={open}
            value={selectedCategory}
            items={categories}
            setOpen={setOpen}
            setValue={setSelectedCategory}
            setItems={setCategories}
            placeholder="Select a category..."
            containerStyle={styles.dropdownContainer}
            style={styles.dropdown}
            dropDownStyle={styles.dropdownBox}
          />

          {/* Find Button */}
          <TouchableOpacity style={styles.button} onPress={fetchPlaces}>
            <Text style={styles.buttonText}>Find</Text>
          </TouchableOpacity>
        </View>

        {/* Loading & Results */}
        {loading ? (
          <Text style={styles.loadingText}>Searching...</Text>
        ) : places.length === 0 ? (
          <Text style={styles.noResultsText}>
            No places found. Choose a category and click Find.
          </Text>
        ) : (
          <FlatList
            data={places}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderPlace}
            numColumns={2} // 2 карточки в ряд
            columnWrapperStyle={styles.row} // Добавляет отступы между колонками
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F3EB",
    padding: 20,
    marginTop: 60,
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B3A36",
    textAlign: "center",
    marginBottom: 15,
  },
  dropdownContainer: {
    height: 50,
    marginBottom: 15,
  },
  dropdown: {
    borderColor: "#CCC",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  dropdownBox: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CCC",
  },
  button: {
    backgroundColor: "#DA84C3",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#3B3A36",
    marginVertical: 10,
  },
  noResultsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#A18A96",
    marginTop: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: "65%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  details: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#3B3A36",
  },
  address: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  rating: {
    fontSize: 12,
    color: "#444",
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#3B3A36",
  },
  locationInfo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DA84C3",
    marginBottom: 8,
    textAlign: "center",
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#3B3A36",
    textAlign: "left",
    marginBottom: 20,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "500",
    color: "#3B3A36",
    marginBottom: 20,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  highlight: {
    fontWeight: "600",
    color: "#DA84C3",
  },
  topSection: {
    width: "100%",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#3B3A36",
    marginBottom: 20,
    textAlign: "left",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B3A36",
    marginBottom: 10,
    textAlign: "left",
  },
  weekRange: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A18A96",
  },
});
