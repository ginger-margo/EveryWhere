import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config"; // ✅ Ensure correct import

// Import Screens
import LoginScreen from "./LoginScreen"; 
import Map from "./map/Map";
import ProfileScreen from "./Profile";
import RecommendationsScreen from "./recommendations/Recommendations";

// Create Bottom Tab Navigator
const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // ✅ Ensure Firebase is initialized before using auth
  useEffect(() => {
    if (!auth) {
      console.log("Firebase is not initialized yet.");
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setFirebaseReady(true);
    });

    return () => unsubscribe();
  }, []);

  if (loading || !firebaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="tomato" />
        <Text>Initializing Firebase...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator
          initialRouteName="Map"
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              let iconName;
              if (route.name === "Recommendations") iconName = "star-outline";
              else if (route.name === "Map") iconName = "map-outline";
              else if (route.name === "Profile") iconName = "person-outline";

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: "tomato",
            tabBarInactiveTintColor: "gray",
            tabBarShowLabel: false,
            headerShown: false,
          })}
        >
          <Tab.Screen name="Recommendations" component={RecommendationsScreen} />
          <Tab.Screen name="Map" component={Map} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
