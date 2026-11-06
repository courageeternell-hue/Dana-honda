import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AlertButton = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void | Promise<void> };
type DialogState = { title: string; message?: string; buttons: AlertButton[]; cancelable: boolean };
type Handler = (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean }) => void;

let presentDialog: Handler = () => {};
export const AppAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean }) =>
    presentDialog(title, message, buttons, options),
};

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    presentDialog = (title, message, buttons, options) => {
      setDialog({ title, message, buttons: buttons?.length ? buttons : [{ text: "Mengerti" }], cancelable: options?.cancelable !== false });
    };
    return () => { presentDialog = () => {}; };
  }, []);

  const close = () => setDialog(null);
  const runButton = (button: AlertButton) => {
    close();
    if (button.onPress) void button.onPress();
  };

  return (
    <>
      {children}
      <Modal visible={!!dialog} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (dialog?.cancelable) close(); }}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (dialog?.cancelable) close(); }} accessibilityLabel="Tutup dialog" />
          <View style={styles.card} accessibilityRole="alert">
            <View style={styles.iconWrap}>
              <Ionicons name="information" size={25} color="#E60012" />
            </View>
            <Text style={styles.title}>{dialog?.title}</Text>
            {!!dialog?.message && <Text style={styles.message}>{dialog.message}</Text>}
            <View style={styles.actions}>
              {(dialog?.buttons ?? []).map((button, index) => {
                const cancel = button.style === "cancel";
                const destructive = button.style === "destructive";
                return (
                  <Pressable
                    key={index}
                    onPress={() => runButton(button)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.button, cancel ? styles.cancelButton : destructive ? styles.dangerButton : styles.primaryButton, pressed && styles.pressed]}
                  >
                    <Text style={[styles.buttonText, cancel && styles.cancelText, destructive && styles.dangerText]}>{button.text}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.accent} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17, 24, 39, 0.48)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 24, paddingHorizontal: 22, paddingTop: 25, paddingBottom: 20, alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "#F0E5E6", elevation: 18, shadowColor: "#111827", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  iconWrap: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900", color: "#20212A", textAlign: "center" },
  message: { fontSize: 14, lineHeight: 21, color: "#747782", textAlign: "center", marginTop: 9 },
  actions: { width: "100%", gap: 9, marginTop: 22 },
  button: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1 },
  primaryButton: { backgroundColor: "#E60012", borderColor: "#E60012" },
  cancelButton: { backgroundColor: "#F5F6F8", borderColor: "#EAEBEF" },
  dangerButton: { backgroundColor: "#FFF0F1", borderColor: "#FFD5D9" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cancelText: { color: "#555965" },
  dangerText: { color: "#D50012" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  accent: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: "#E60012" },
});
