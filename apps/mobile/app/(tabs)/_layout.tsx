import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
const purple = "#5B4BDB";
export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: purple, tabBarInactiveTintColor: "#9292A3", tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 8, borderTopColor: "#EEEEF4", backgroundColor: "#FFFFFF" }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } }}>
    <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="prospek" options={{ title: "Prospek", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="spk" options={{ title: "SPK", tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
  </Tabs>;
}
