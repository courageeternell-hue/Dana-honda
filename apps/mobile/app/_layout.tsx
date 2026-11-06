import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { syncLocalSalesReminders } from "@/lib/localNotifications";
import { AppAlert, AppAlertProvider } from "@/components/AppAlert";

function LocalNotificationManager() {
  const { profile } = useAuth();
  useEffect(() => {
    if (!profile?.id) return;
    void syncLocalSalesReminders(profile.id).catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncLocalSalesReminders(profile.id).catch(() => {});
    });
    return () => subscription.remove();
  }, [profile?.id]);
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

export default function RootLayout() {
  return (
    <AppAlertProvider>
    <AuthProvider>
      <UpdateManager />
      <LocalNotificationManager />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
    </AppAlertProvider>
  );
}
