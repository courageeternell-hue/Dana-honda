import { useEffect, useRef, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "ASISTEN SALES";

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  const [typedText, setTypedText] = useState("");
  const [minimumTimeDone, setMinimumTimeDone] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
    const progressLoop = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(progress, { toValue: 0.12, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    pulseLoop.start();
    spinLoop.start();
    progressLoop.start();

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
      pulseLoop.stop();
      spinLoop.stop();
      progressLoop.stop();
    };
  }, [pulse, spin, progress]);

  const openingDone = typedText.length === BRAND.length && minimumTimeDone;

  if (loading || !openingDone) {
    return (
      <View style={s.page}>
        <View style={s.logoStage}>
          <Animated.View
            style={[
              s.orbit,
              {
                transform: [
                  { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
                  { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] }) },
                ],
              },
            ]}
          />
          <Animated.View style={[s.logo, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }] }]}>
            <Image source={require("../assets/dana-honda-icon.png")} style={s.logoImage} resizeMode="contain" />
          </Animated.View>
          <Animated.View
            style={[
              s.orbitDot,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
              },
            ]}
          />
        </View>
        <Text style={s.brand}>{typedText}<Text style={s.cursor}>|</Text></Text>
        <Text style={s.tagline}>Sales Management App</Text>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["12%", "100%"] }) }]} />
        </View>
        <View style={s.loadingRow}>
          <ActivityIndicator color="#E60012" size="small" />
          <Text style={s.loading}>Menyiapkan aplikasi...</Text>
        </View>
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}

const s = StyleSheet.create({
  page: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  logoStage: { width: 156, height: 156, alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", width: 142, height: 142, borderRadius: 71, borderWidth: 2, borderColor: "#F5A0A8", borderStyle: "dashed" },
  orbitDot: { position: "absolute", top: 5, right: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E60012", borderWidth: 2, borderColor: "#FFFFFF" },
  logo: { width: 112, height: 112, borderRadius: 30, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", overflow: "hidden", elevation: 8, shadowColor: "#9B0010", shadowOpacity: .18, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  logoImage: { width: 104, height: 104 },
  brand: { minHeight: 28, fontSize: 20, fontWeight: "900", fontStyle: "italic", letterSpacing: 1.5, color: "#17171B", marginTop: 22 },
  cursor: { color: "#E60012" },
  tagline: { fontSize: 12, color: "#888891", letterSpacing: .6, marginTop: 6 },
  progressTrack: { width: 150, height: 4, borderRadius: 3, backgroundColor: "#F6DADD", overflow: "hidden", marginTop: 28 },
  progressFill: { height: 4, borderRadius: 3, backgroundColor: "#E60012" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12 },
  loading: { fontSize: 11, color: "#9999A1" },
});
