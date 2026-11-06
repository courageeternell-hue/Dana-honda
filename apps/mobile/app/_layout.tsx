import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppAlert, AppAlertProvider } from "@/components/AppAlert";

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
                  Alert.alert("Update gagal", "Pembaruan belum berhasil diunduh. Periksa koneksi internet dan coba lagi nanti.");
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

export default function RootLayout() {
  return (
    <AppAlertProvider>
    <AuthProvider>
      <UpdateManager />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
    </AppAlertProvider>
  );
}
