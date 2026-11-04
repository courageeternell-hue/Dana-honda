import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  return <AuthProvider><StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" /><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}
