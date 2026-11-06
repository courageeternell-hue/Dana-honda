import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { AppIcon } from "@/components/AppIcon";
import { LiquidPressable } from "@/components/LiquidPressable";
import { Ionicons } from "@expo/vector-icons";
const primary = "#E60012";
export default function TabLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <View style={{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F4F5F7"}}><ActivityIndicator color={primary} size="large" /></View>;
  if (!session || !profile) return <Redirect href="/login" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: primary, tabBarInactiveTintColor: "#9292A3", tabBarStyle: { height: 84, paddingTop: 9, paddingBottom: 12, borderTopWidth: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: "#FFFFFF", elevation: 12, shadowColor: "#172033", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: -4 } }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" } }}>
    <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ({ focused }) => <AppIcon name="home" size={21} active={focused} />, tabBarButton: (props) => <LiquidPressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="button" accessibilityState={props.accessibilityState} accessibilityLabel={props.accessibilityLabel} testID={props.testID} style={props.style}>{props.children}</LiquidPressable> }} />
    <Tabs.Screen name="prospek" options={{ title: "Prospek", tabBarIcon: ({ focused }) => <AppIcon name="people" size={21} active={focused} />, tabBarButton: (props) => <LiquidPressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="button" accessibilityState={props.accessibilityState} accessibilityLabel={props.accessibilityLabel} testID={props.testID} style={props.style}>{props.children}</LiquidPressable> }} />
    <Tabs.Screen name="spk" options={{ title: "SPK", tabBarIcon: ({ focused }) => <AppIcon name="document-text" size={21} active={focused} />, tabBarButton: (props) => <LiquidPressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="button" accessibilityState={props.accessibilityState} accessibilityLabel={props.accessibilityLabel} testID={props.testID} style={props.style}>{props.children}</LiquidPressable> }} />
    <Tabs.Screen name="ai" options={{ title: "Asisten AI", tabBarIcon: ({ focused }) => <Ionicons name="sparkles" size={21} color={focused ? primary : "#9292A3"} />, tabBarButton: (props) => <LiquidPressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="button" accessibilityState={props.accessibilityState} accessibilityLabel={props.accessibilityLabel} testID={props.testID} style={props.style}>{props.children}</LiquidPressable> }} />
    <Tabs.Screen name="profil" options={{ title: "Profil", tabBarIcon: ({ focused }) => <AppIcon name="person" size={21} active={focused} />, tabBarButton: (props) => <LiquidPressable onPress={props.onPress} onLongPress={props.onLongPress} accessibilityRole="button" accessibilityState={props.accessibilityState} accessibilityLabel={props.accessibilityLabel} testID={props.testID} style={props.style}>{props.children}</LiquidPressable> }} />
  </Tabs>;
}
