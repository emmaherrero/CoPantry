import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

export default function Opening() {
  const opacity = useRef(new Animated.Value(1)).current;
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const navigate = async () => {
      let destination: string = "/login";

      if (session) {
        const { data } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", session.user.id)
          .limit(1)
          .single();

        destination = data ? "/(tabs)/inventory" : "/setup";
      }

      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        router.replace(destination as any);
      });
    };

    const timer = setTimeout(navigate, 3400);
    return () => clearTimeout(timer);
  }, [loading, session, opacity]);

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
    backgroundColor: "#75b0f2",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 318,
    height: 261,
    borderRadius: 24,
  },
  title: {
    color: "white",
    fontSize: 40,
    fontWeight: "700",
    marginTop: 12,
  },
});
