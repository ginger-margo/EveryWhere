import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { firestore, auth } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import * as turf from "@turf/turf";
import moment from "moment";
import { PanGestureHandler } from "react-native-gesture-handler";
import useCityBoundary from "./useCityBoundary";
import { getMostVisitedPlaces } from "../map/locationTracker";
import { returnGeocodedLocation } from "../map/locationUtils";
import { fetchLocationPoints } from "../dataLayer";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Helper functions
const calculateShadedArea = (trail, trailWidthInMeters = 10) => {
  if (trail.length < 2) return 0;

  let totalArea = 0;
  for (let i = 1; i < trail.length; i++) {
    const point1 = turf.point([trail[i - 1].longitude, trail[i - 1].latitude]);
    const point2 = turf.point([trail[i].longitude, trail[i].latitude]);
    const distance = turf.distance(point1, point2, { units: "meters" });
    totalArea += distance * trailWidthInMeters;
  }
  return totalArea / 1e6; // Convert m² to km²
};

const isWithinBoundingBox = (point, bounds) => {
  return (
    point.latitude >= bounds.minLatitude &&
    point.latitude <= bounds.maxLatitude &&
    point.longitude >= bounds.minLongitude &&
    point.longitude <= bounds.maxLongitude
  );
};

const cropTrailToBox = (trail, bounds) => {
  return trail.filter((point) => isWithinBoundingBox(point, bounds));
};

export default function ProfileScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyDistances, setWeeklyDistances] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [trail, setTrail] = useState([]);
  const [mostVisitedPlace, setMostVisitedPlace] = useState(
    "Fetching location..."
  );
  const [cityExplored, setCityExplored] = useState("0.00");
  const [worldExplored, setWorldExplored] = useState("0.000000");
  const [cityName, setCityName] = useState("City");

  const worldLandArea = 148940000; // km²
  const cityArea = 117.8; // Dublin km²
  const { boundingBox, cityName: city, loading } = useCityBoundary();

  useEffect(() => {
    if (trail.length === 0) return;

    let shadedArea = 0;

    // Проверка на реалистичность boundingBox
    const boxIsValid =
      boundingBox &&
      Math.abs(boundingBox.maxLatitude - boundingBox.minLatitude) > 0.01 &&
      Math.abs(boundingBox.maxLongitude - boundingBox.minLongitude) > 0.01;

    if (!loading && boxIsValid) {
      const filteredTrail = cropTrailToBox(trail, boundingBox);
      shadedArea = calculateShadedArea(filteredTrail);
    } else {
      shadedArea = calculateShadedArea(trail);
    }

    const cityPercent = (shadedArea / cityArea) * 100;
    const worldPercent = (shadedArea / worldLandArea) * 100;

    setCityExplored(cityPercent.toFixed(2));
    setWorldExplored(worldPercent.toFixed(6));
    setCityName(city || "your city");
  }, [boundingBox, loading, trail]);

  useEffect(() => {
    const fetchTrail = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const locationsRef = collection(
        firestore,
        "locations",
        uid,
        "locationData"
      );
      const snapshot = await getDocs(locationsRef);
      const locationData = snapshot.docs.map((doc) => doc.data());
      setTrail(locationData);
    };
    fetchTrail();
  }, []);

  useEffect(() => {
    const fetchWeeklyDistances = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const allPoints = await fetchLocationPoints(uid);

      const start = moment()
        .startOf("isoWeek")
        .add(weekOffset, "weeks")
        .valueOf();
      const end = moment().endOf("isoWeek").add(weekOffset, "weeks").valueOf();

      const filtered = allPoints.filter(
        (point) => point.timestamp >= start && point.timestamp <= end
      );

      const grouped = {
        Mon: new Set(),
        Tue: new Set(),
        Wed: new Set(),
        Thu: new Set(),
        Fri: new Set(),
        Sat: new Set(),
        Sun: new Set(),
      };
      filtered.forEach((point) => {
        const day = moment(point.timestamp).format("ddd");
        const key = `${point.latitude.toFixed(3)},${point.longitude.toFixed(
          3
        )}`;
        if (grouped[day]) grouped[day].add(key);
      });

      const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const distances = orderedDays.map((day) => grouped[day].size);

      setWeeklyDistances(distances);
    };

    fetchWeeklyDistances();
  }, [weekOffset]);

  useEffect(() => {
    const fetchTopSpot = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const places = await getMostVisitedPlaces(uid);
      const bestPlace = places
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .find((place) => place.type !== "home" && place.type !== "work");

      const locationIcons = {
        gym: "🏋️‍♀️",
        home: "🏠",
        work: "🎒",
        groceries: "🛒",
        bar: "🍻",
        cafe: "☕️",
      };

      if (bestPlace) {
        const result = await returnGeocodedLocation(bestPlace);
        const icon = locationIcons[bestPlace.type] || "🏆";
        setMostVisitedPlace(icon + " " + (result[0]?.name || "Unknown Place"));
      }
    };

    fetchTopSpot();
  }, []);

  const startOfWeek = moment().startOf("isoWeek").add(weekOffset, "weeks");
  const endOfWeek = moment().endOf("isoWeek").add(weekOffset, "weeks");
  const weekRangeText = `${startOfWeek.format("D.MM")} - ${endOfWeek.format(
    "D.MM"
  )}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Statistics</Text>

      <Text style={styles.sectionTitle}>
        Your Week <Text style={styles.weekRange}>| {weekRangeText}</Text>
      </Text>

      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === 5) {
            if (nativeEvent.translationX > 50) {
              setWeekOffset((prev) => prev - 1);
            } else if (nativeEvent.translationX < -50) {
              setWeekOffset((prev) => (prev < 0 ? prev + 1 : 0));
            }
          }
        }}
      >
        <View style={styles.graphContainer}>
          <LineChart
            data={{
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [{ data: weeklyDistances }],
            }}
            width={screenWidth * 0.9}
            height={screenHeight * 0.3}
            yAxisSuffix=" places"
            chartConfig={{
              backgroundColor: "#FFFFFF",
              backgroundGradientFrom: "#FFFFFF",
              backgroundGradientTo: "#FFFFFF",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#DA84C3",
              },
              propsForBackgroundLines: {
                strokeDasharray: "",
              },
            }}
            withDots={true}
            withInnerLines={true}
            withOuterLines={true}
            fromZero={true}
            style={styles.chartStyle}
          />
        </View>
      </PanGestureHandler>

      <Text style={styles.sectionTitle}>And this is you 👀</Text>

      <View style={styles.gridContainer}>
        <View style={styles.box}>
          <Text style={[styles.boxLabel]}>Your top spot:</Text>
          <Text style={[styles.boxText, { color: "#DA84C3" }]}>
            {mostVisitedPlace}
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>
            🌍 {cityExplored}% of {cityName} Explored
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>
            🗺️ {worldExplored}% of World Explored
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#F5F3EB", marginTop: 60 },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#3B3A36",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B3A36",
    marginBottom: 10,
  },
  graphContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
  },
  chartStyle: { borderRadius: 10 },
  gridContainer: { marginTop: 20 },
  box: {
    width: "100%",
    padding: 25,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 15,
    alignItems: "center",
  },
  boxText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B3A36",
    textAlign: "center",
  },
  boxLabel: { fontSize: 14, color: "#A18A96", marginBottom: 5 },
  weekRange: { fontSize: 14, fontWeight: "500", color: "#A18A96" },
});
