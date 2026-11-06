import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "ASISTEN SALES";

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  const [typedText, setTypedText] = useState("");
  const [minimumTimeDone, setMinimumTimeDone] = useState(false);

  useEffect(() => {
    let index = 0;
    const typingTimer = setInterval(() => {
      index += 1;
      setTypedText(BRAND.slice(0, index));
      if (index >= BRAND.length) clearInterval(typingTimer);
    }, 105);

    const minimumTimer = setTimeout(() => setMinimumTimeDone(true), 1900);

    return () => {
      clearInterval(typingTimer);
      clearTimeout(minimumTimer);
    };
  }, []);

  const openingDone = typedText.length === BRAND.length && minimumTimeDone;

  if (loading || !openingDone) {
    return (
      <View style={s.page}>
        <View style={s.logo}>
          <Image source={require("../assets/dana-honda-icon.png")} style={s.logoImage} resizeMode="contain" />
        </View>
        <Text style={s.brand}>{typedText}<Text style={s.cursor}>|</Text></Text>
        <Text style={s.tagline}>Sales Management App</Text>
        <ActivityIndicator color="#E60012" size="small" style={s.spinner} />
        <Text style={s.loading}>Menyiapkan aplikasi...</Text>
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}

const s = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  logo: { width: 112, height: 112, borderRadius: 30, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", overflow: "hidden", elevation: 9, shadowColor: "#9B0010", shadowOpacity: .16, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  logoImage: { width: 104, height: 104 },
  brand: { minHeight: 28, fontSize: 20, fontWeight: "900", fontStyle: "italic", letterSpacing: 1.5, color: "#17171B", marginTop: 22 },
  cursor: { color: "#E60012" },
  tagline: { fontSize: 12, color: "#888891", letterSpacing: .6, marginTop: 6 },
  spinner: { marginTop: 30 },
  loading: { fontSize: 11, color: "#9999A1", marginTop: 9 },
});
