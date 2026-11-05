import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
const primary = "#D71920";
export default function TabLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <View style={{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F7F7F7"}}><ActivityIndicator color={primary} size="large" /></View>;
  if (!session || !profile) return <Redirect href="/login" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: primary, tabBarInactiveTintColor: "#9292A3", tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 8, borderTopColor: "#EEEEEE", backgroundColor: "#FFFFFF" }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" } }}>
    <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={String(color ?? primary)} size={size} /> }} />
    <Tabs.Screen name="prospek" options={{ title: "Prospek", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={String(color ?? primary)} size={size} /> }} />
    <Tabs.Screen name="spk" options={{ title: "SPK", tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={String(color ?? primary)} size={size} /> }} />
    <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={String(color ?? primary)} size={size} /> }} />
  </Tabs>;
}
