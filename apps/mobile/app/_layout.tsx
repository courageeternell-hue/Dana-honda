import { Stack } from "expo-router";
import { StatusBar } from "react-native";
export default function RootLayout() {
  return <><StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" /><Stack screenOptions={{ headerShown: false }} /></>;
}
