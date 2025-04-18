import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace("Login");
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <LinearGradient
    colors={["#3B5E47", "#B6CDBD", "#FAF5EB"]}
      style={styles.container}
    >
      {/* <Image
        source={require("./assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      /> */}
      <Text style={styles.title}>EveryWhere</Text>
      <Text style={styles.subtitle}>Explore · Discover · Mark</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#DA84C3",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginTop: 10,
    letterSpacing: 1,
  },
});
