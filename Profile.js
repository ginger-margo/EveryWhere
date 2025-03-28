import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { firestore, auth } from "./firebase/config";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import useLocationTracker from "./map/useLocationTracker";
import * as turf from "@turf/turf"; // Turf.js for geospatial calculations
import * as Location from "expo-location"; // Location services
import {returnGeocodedLocation} from "./map/locationUtils";
import {getMostVisitedPlaces} from "./map/locationTracker";

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
  const [weeklyDistances, setWeeklyDistances] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [trail, setTrail] = useState([]);
  const [mostVisitedPlace, setMostVisitedPlace] = useState("Fetching location...");

  const cityArea = 117.8; // TODO - get current city
  const worldLandArea = 148940000; // World's land area in km²

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchLocationData = async () => {
      try {
        const locationsRef = collection(firestore, "locations", auth.currentUser.uid, "locationData");
        const locationSnapshot = await getDocs(locationsRef);
        const locationData = locationSnapshot.docs.map((doc) => doc.data());

        setTrail(locationData);
      } catch (error) {
        console.error("Error fetching location data:", error);
      }
    };

    fetchLocationData();
  }, []);

  const locationIcons = {"gym": "🏋️‍♀️", "home": "🏠", "work": "🎒", "groceries": "🛒", "bar": "🍻", "cafe": "☕️"};


  useEffect(() => {
    (async () => {
      const mostVisitedPlaces = await getMostVisitedPlaces(auth.currentUser.uid);
      console.log("Hello, these are the correct most visited places", mostVisitedPlaces);
     let location = mostVisitedPlaces.sort((a, b)=> {
        return b.timeSpent - a.timeSpent;
      }).find((place) => {
        return place.type != "home" && place.type != "work";
      }) || mostVisitedPlace[0];
      let type = location.type;
      console.log(type, "Thi is the type");
      console.log(location, "this is the location");
      let icon = locationIcons[type] || "🏆";
      const result = await returnGeocodedLocation(location);
      console.log(result, "This is the most visited place ");
      setMostVisitedPlace(icon + " " + result[0]?.name || "Unknown Place");
    })();
  }, []);

  // Calculate the exact shaded area
  const shadedArea = calculateShadedArea(trail, 10); // Width of trail = 10m
  const cityExplored = (shadedArea / cityArea) * 100;
  const worldExplored = (shadedArea / worldLandArea) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Statistics</Text>

      <View style={styles.graphContainer}>
        <Text style={styles.sectionTitle}>Distance Walked</Text>
        <LineChart
          data={{
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{ data: weeklyDistances }],
          }}
          width={screenWidth * 0.9}
          height={screenHeight * 0.3}
          yAxisSuffix=" km"
          chartConfig={{
            backgroundColor: "#FFF",
            backgroundGradientFrom: "#F7F7F7",
            backgroundGradientTo: "#E6E6E6",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          style={styles.chartStyle}
        />
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.box}>
          <Text style={styles.boxText}> {mostVisitedPlace || "No data"}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>🌍 {cityExplored.toFixed(2)}% of City Explored</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxText}>🗺️ {worldExplored.toFixed(3)}% of World Explored</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFF", marginTop: 60 },
  header: { fontSize: 32, fontWeight: "bold", color: "#000", textAlign: "left", marginBottom: 20 },
  graphContainer: { alignItems: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#000", marginBottom: 10 },
  chartStyle: { borderRadius: 10 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20 },
  box: { width: "48%", height: screenHeight * 0.15, backgroundColor: "#F0F0F0", justifyContent: "center", alignItems: "center", marginBottom: 10, borderRadius: 10 },
  boxText: { fontSize: 16, fontWeight: "bold", color: "#000", textAlign: "center" }
});
