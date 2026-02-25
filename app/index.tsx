import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

export default function Opening() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const SPLASH_MS = 4000;

    const FADE_MS = 600;
    const fadeStart = SPLASH_MS - FADE_MS;

    const fadeTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        // replace so user can’t go "back" to splash
        router.replace("/login");
      });
    }, fadeStart);

    return () => clearTimeout(fadeTimer);
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>CoPantry</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#79B3F2",
    justifyContent: "center",
    alignItems: "center"
  },
  logo: { 
    width: 250, 
    height: 250, 
    borderRadius: 24,
  },
  title: { 
    color: "white", 
    fontSize: 35, 
    fontWeight: "800",
 
  },
});