import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { firestore, auth } from "./firebase/config";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import useLocationTracker from "./map/useLocationTracker";
import * as turf from "@turf/turf"; // Turf.js for geospatial calculations
import * as Location from "expo-location"; // Location services
import {
  returnGeocodedLocation,
  getWeeklyDistances,
} from "./map/locationUtils";
import { getMostVisitedPlaces } from "./map/locationTracker";
import { fetchLocationPoints } from "./dataLayer";
import { ScrollView } from "react-native";
import moment from "moment";
import { PanGestureHandler } from "react-native-gesture-handler";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// Function to calculate the total shaded area
const calculateShadedArea = (trail, trailWidthInMeters = 10) => {
  if (trail.length < 2) return 0; // Need at least two points to form a segment

  let totalArea = 0;

  for (let i = 1; i < trail.length; i++) {
    const point1 = turf.point([trail[i - 1].longitude, trail[i - 1].latitude]);
    const point2 = turf.point([trail[i].longitude, trail[i].latitude]);
    const distance = turf.distance(point1, point2, { units: "meters" }); // Distance in meters

    const segmentArea = distance * trailWidthInMeters; // Rectangle area
    totalArea += segmentArea;
  }

  return totalArea / 1e6; // Convert from m² to km²
};

export default function ProfileScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyDistances, setWeeklyDistances] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [trail, setTrail] = useState([]);
  const [mostVisitedPlace, setMostVisitedPlace] = useState(
    "Fetching location..."
  );

  const cityArea = 117.8; // TODO - get current city
  const worldLandArea = 148940000; // World's land area in km²

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
    if (!auth.currentUser) return;

    const fetchLocationData = async () => {
      try {
        const locationsRef = collection(
          firestore,
          "locations",
          auth.currentUser.uid,
          "locationData"
        );
        const locationSnapshot = await getDocs(locationsRef);
        const locationData = locationSnapshot.docs.map((doc) => doc.data());

        setTrail(locationData);
      } catch (error) {
        console.error("Error fetching location data:", error);
      }
    };

    fetchLocationData();
  }, []);

  const locationIcons = {
    gym: "🏋️‍♀️",
    home: "🏠",
    work: "🎒",
    groceries: "🛒",
    bar: "🍻",
    cafe: "☕️",
  };

  useEffect(() => {
    (async () => {
      const mostVisitedPlaces = await getMostVisitedPlaces(
        auth.currentUser.uid
      );
      let location =
        mostVisitedPlaces
          .sort((a, b) => {
            return b.timeSpent - a.timeSpent;
          })
          .find((place) => {
            return place.type != "home" && place.type != "work";
          }) || mostVisitedPlace[0];
      let type = location.type;
      let icon = locationIcons[type] || "🏆";
      const result = await returnGeocodedLocation(location);
      setMostVisitedPlace(icon + " " + result[0]?.name || "Unknown Place");
    })();
  }, []);

  // Calculate the exact shaded area
  const shadedArea = calculateShadedArea(trail, 10); // Width of trail = 10m
  const cityExplored = (shadedArea / cityArea) * 100;
  const worldExplored = (shadedArea / worldLandArea) * 100;

  // Finding this week
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
            // 5 = END
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
            {mostVisitedPlace || "No data"}
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>
            🌍 {cityExplored.toFixed(2)}% of City Explored
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>
            🗺️ {worldExplored.toFixed(6)}% of World Explored
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F5F3EB", // earthy tone
    marginTop: 60,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#3B3A36", // charcoal
    textAlign: "left",
    marginBottom: 20,
  },
  graphContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B3A36",
    marginBottom: 10,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  chartStyle: {
    borderRadius: 10,
  },
  gridContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 20,
  },
  box: {
    width: "98%",
    padding: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  boxText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B3A36",
    textAlign: "center",
  },
  weekHeader: {
    width: "100%",
    marginBottom: 12,
    alignItems: "flex-start",
  },

  weekRange: {
    fontSize: 14,
    fontWeight: "500",
    color: "#A18A96", // мягкий серо-розовый оттенок
    marginTop: 2,
  },
  boxLabel: {
    fontSize: 14,
    color: "#A18A96",
    marginBottom: 5,
    fontWeight: "500",
    textAlign: "left",
  },
});
