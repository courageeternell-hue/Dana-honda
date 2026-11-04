import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  return <AuthProvider><StatusBar style="dark" backgroundColor="#F7F7FB" /><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}
