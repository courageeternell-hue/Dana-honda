import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import type { ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppAlert, AppAlertProvider } from "@/components/AppAlert";

// Explicitly release the native splash once the JavaScript root has mounted.
// This prevents a native splash from masking a React startup/rendering problem.
function StartupSplashRelease() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return null;
}

function UpdateManager() {
  useEffect(() => {
    let active = true;

    async function checkForAppUpdate() {
      if (__DEV__ || !Updates.isEnabled) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (!active || !update.isAvailable) return;

        AppAlert.alert(
          "Pembaruan tersedia",
          "Versi terbaru Asisten Sales sudah tersedia. Perbarui sekarang untuk menggunakan fitur dan perbaikan terbaru.",
          [
            { text: "Nanti", style: "cancel" },
            {
              text: "Perbarui sekarang",
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch {
                  AppAlert.alert("Update gagal", "Pembaruan belum berhasil diunduh. Periksa koneksi internet dan coba lagi nanti.");
                }
              },
            },
          ],
          { cancelable: true },
        );
      } catch {
        // Update checks are best-effort; the app remains usable offline.
      }
    }

    void checkForAppUpdate();
    return () => { active = false; };
  }, []);

  return null;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorPage}>
      <Text style={styles.errorTitle}>Aplikasi belum bisa dibuka</Text>
      <Text style={styles.errorMessage}>{error.message || "Terjadi kesalahan saat memuat halaman."}</Text>
      <Pressable onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryText}>Coba lagi</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppAlertProvider>
      <AuthProvider>
        <StartupSplashRelease />
        <UpdateManager />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </AppAlertProvider>
  );
}

const styles = StyleSheet.create({
  errorPage: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", padding: 28 },
  errorTitle: { color: "#202027", fontSize: 19, fontWeight: "900", textAlign: "center" },
  errorMessage: { color: "#777780", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 12 },
  retryButton: { backgroundColor: "#E60012", borderRadius: 13, paddingHorizontal: 28, paddingVertical: 14, marginTop: 22 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
