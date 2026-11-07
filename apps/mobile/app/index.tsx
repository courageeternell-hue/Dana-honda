import { useEffect, useRef, useState } from "react";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Redirect } from "expo-router";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "ASISTEN SALES";

export default function IndexRoute() {
  const { session, loading, profile } = useAuth();
  const splashSound = useAudioPlayer(require("../assets/water-drop-splash.mp3"));
  const [brandText, setBrandText] = useState("");
  const [animationDone, setAnimationDone] = useState(false);
  const dropY = useRef(new Animated.Value(-360)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.04)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    let typingTimer: ReturnType<typeof setInterval> | undefined;
    let soundTimer: ReturnType<typeof setTimeout> | undefined;
    soundTimer = setTimeout(() => {
      void setAudioModeAsync({ playsInSilentMode: true }).then(() => {
        splashSound.volume = 0.42;
        splashSound.play();
      }).catch(() => {});
    }, 350);
    const animation = Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(dropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(dropY, {
          toValue: 0,
          duration: 1050,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(dropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 38,
          duration: 1150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 42,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(300),
    ]);

    animation.start(({ finished }) => {
      if (!finished) return;
      let index = 0;
      typingTimer = setInterval(() => {
        index += 1;
        setBrandText(BRAND.slice(0, index));
        if (index >= BRAND.length) {
          if (typingTimer) clearInterval(typingTimer);
      if (soundTimer) clearTimeout(soundTimer);
      splashSound.pause();
          setTimeout(() => setAnimationDone(true), 700);
        }
      }, 135);
    });

    return () => {
      animation.stop();
      if (typingTimer) clearInterval(typingTimer);
      if (soundTimer) clearTimeout(soundTimer);
      splashSound.pause();
    };
  }, [dropY, dropOpacity, splashScale, logoOpacity, logoScale, splashSound]);

  if (loading || !animationDone) {
    return (
      <View style={s.page}>
        <Animated.View
          pointerEvents="none"
          style={[s.redSplash, { transform: [{ scale: splashScale }] }]}
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
          <View style={s.logoFrame}>
            <Image
              source={require("../assets/dana-honda-icon.png")}
              style={s.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={s.brand}>
            {brandText}
            <Text style={s.cursor}>|</Text>
          </Text>
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
  logoFrame: {
    width: 120,
    height: 120,
    borderRadius: 27,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#76000A",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 24,
  },
  brand: {
    minHeight: 29,
    marginTop: 19,
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 2,
  },
  cursor: {
    color: "#FFE5E7",
    fontWeight: "400",
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
