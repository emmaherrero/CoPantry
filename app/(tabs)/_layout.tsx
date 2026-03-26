import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HouseholdProvider } from "../../lib/household-context";
import { AppTheme, Fonts } from "../../constants/theme";

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
          tabBarActiveTintColor: AppTheme.colors.accentDark,
          tabBarInactiveTintColor: AppTheme.colors.muted,
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
    height: 98,
    backgroundColor: AppTheme.colors.surface,
    borderTopWidth: 2,
    borderTopColor: AppTheme.colors.line,
    shadowColor: "#d6b9aa",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: Fonts.rounded,
    fontWeight: "600",
  },
  addButton: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: AppTheme.colors.accent,
    borderWidth: 2,
    borderColor: AppTheme.colors.line,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#e181a3",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
});
