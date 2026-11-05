import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
const primary = "#D71920";
export default function TabLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <View style={{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F7F7F7"}}><ActivityIndicator color={primary} size="large" /></View>;
  if (!session || !profile) return <Redirect href="/login" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: primary, tabBarInactiveTintColor: "#9292A3", tabBarStyle: { height: 78, paddingTop: 8, paddingBottom: 9, borderTopColor: "#EEEEEE", backgroundColor: "#FFFFFF" }, tabBarLabelStyle: { fontSize: 12, fontWeight: "700" } }}>
    <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ({ focused }) => <AppIcon name="home" size={21} active={focused} /> }} />
    <Tabs.Screen name="prospek" options={{ title: "Prospek", tabBarIcon: ({ focused }) => <AppIcon name="people" size={19} active={focused} /> }} />
    <Tabs.Screen name="spk" options={{ title: "SPK", tabBarIcon: ({ focused }) => <AppIcon name="document-text" size={19} active={focused} /> }} />
    <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ focused }) => <AppIcon name="person" size={19} active={focused} /> }} />
  </Tabs>;
}
