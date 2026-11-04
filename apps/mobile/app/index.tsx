import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7FB" }}><ActivityIndicator color="#5B4BDB" size="large" /></View>;
  if (!session || !profile) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
