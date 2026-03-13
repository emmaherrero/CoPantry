import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HouseholdProvider } from "../../lib/household-context";

function TabIcon({
  name,
  color,
  size,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

function AddButton() {
  return (
    <View style={styles.addButton}>
      <Ionicons name="add" size={32} color="white" />
    </View>
  );
}

export default function TabLayout() {
  return (
    <HouseholdProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#70ab25",
          tabBarInactiveTintColor: "#000",
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="pantry"
          options={{
            title: "Pantry",
            tabBarIcon: ({ color }) => (
              <TabIcon name="nutrition-outline" color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: "My Inventory",
            tabBarIcon: ({ color }) => (
              <TabIcon name="cube-outline" color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="add-item"
          options={{
            title: "",
            tabBarIcon: () => <AddButton />,
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: "Recipes",
            tabBarIcon: ({ color }) => (
              <TabIcon name="restaurant-outline" color={color} size={28} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <TabIcon name="person-outline" color={color} size={28} />
            ),
          }}
        />
      </Tabs>
    </HouseholdProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 96,
    backgroundColor: "white",
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "400",
  },
  addButton: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: "#70ab25",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
