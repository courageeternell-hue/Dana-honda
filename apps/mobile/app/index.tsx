import { useEffect, useRef, useState } from "react";
import { Redirect } from "expo-router";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);
  const dropY = useRef(new Animated.Value(-320)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.05)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(dropOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(dropY, {
          toValue: 0,
          duration: 620,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(dropOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 34,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 75,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(650),
    ]);

    animation.start(({ finished }) => {
      if (finished) setAnimationDone(true);
    });

    return () => animation.stop();
  }, [dropY, dropOpacity, splashScale, logoOpacity, logoScale]);

  if (loading || !animationDone) {
    return (
      <View style={s.page}>
        <Animated.View
          pointerEvents="none"
          style={[
            s.redSplash,
            { transform: [{ scale: splashScale }] },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            s.drop,
            {
              opacity: dropOpacity,
              transform: [{ translateY: dropY }, { rotate: "45deg" }],
            },
          ]}
        />
        <Animated.View
          style={[
            s.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require("../assets/dana-honda-icon.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.brand}>DANA HONDA</Text>
          <Text style={s.tagline}>Sales Management App</Text>
          <View style={s.loadingPill}>
            <View style={s.loadingDot} />
            <Text style={s.loading}>Menyiapkan aplikasi...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  redSplash: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E60012",
  },
  drop: {
    position: "absolute",
    top: "50%",
    width: 34,
    height: 34,
    marginTop: -17,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: "#E60012",
    elevation: 10,
    shadowColor: "#A9000D",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  logo: {
    width: 116,
    height: 116,
  },
  brand: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 2,
  },
  tagline: {
    marginTop: 6,
    color: "#FFE5E7",
    fontSize: 12,
    letterSpacing: 0.7,
  },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  loadingDot: {
    width: 6,
    height: 6,
    marginRight: 8,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  loading: {
    color: "#FFFFFF",
    fontSize: 11,
  },
});
