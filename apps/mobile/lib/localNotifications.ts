import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

const CHANNEL_ID = "sales-reminders";
const FOLLOWUP_KIND = "sales-followup";
const TARGET_KIND = "sales-target";
const TARGET_MESSAGE = "Ayok semangat target kamu masih jauh ni";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function reminderDate(dateKey: string) {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day, 9, 0, 0, 0);
  return date;
}

async function cancelManagedReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => {
        const kind = item.content.data?.reminderType;
        return kind === FOLLOWUP_KIND || kind === TARGET_KIND;
      })
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

/** Rebuilds this user's local reminders from the latest Supabase records. */
export async function syncLocalSalesReminders(userId: string) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Pengingat Sales",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#E60012",
    });
  }

  const now = new Date();
  const today = localDateKey(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthStartKey = localDateKey(monthStart);
  const nextMonthKey = localDateKey(nextMonth);

  const [followups, prospects, spk, target] = await Promise.all([
    supabase
      .from("prospects")
      .select("id,customer_name,follow_up")
      .eq("user_id", userId)
      .not("follow_up", "is", null)
      .gte("follow_up", today)
      .order("follow_up", { ascending: true }),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("prospect_date", monthStartKey)
      .lt("prospect_date", nextMonthKey),
    supabase
      .from("spk_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("spk_date", monthStartKey)
      .lt("spk_date", nextMonthKey),
    supabase
      .from("sales_targets")
      .select("prospect_target,spk_target")
      .eq("user_id", userId)
      .eq("target_month", monthStartKey)
      .maybeSingle(),
  ]);

  const failed = followups.error || prospects.error || spk.error || target.error;
  if (failed) throw failed;

  const permission = await Notifications.getPermissionsAsync();
  const granted = permission.granted
    ? permission
    : await Notifications.requestPermissionsAsync();
  if (!granted.granted) return;

  await cancelManagedReminders();

  const channelId = Platform.OS === "android" ? CHANNEL_ID : undefined;
  const schedule = async (
    title: string,
    body: string,
    date: Date,
    reminderType: string,
    reminderId: string,
  ) => {
    if (date.getTime() <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        data: { reminderType, reminderId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(channelId ? { channelId } : {}),
      },
    });
  };

  for (const item of followups.data ?? []) {
    if (!item.follow_up) continue;
    const fireAt = reminderDate(item.follow_up);
    await schedule(
      "Waktunya Follow-up",
      `Jangan lupa hubungi ${item.customer_name || "pelanggan"} hari ini.`,
      fireAt,
      FOLLOWUP_KIND,
      item.id,
    );
  }

  const prospectTarget = Number(target.data?.prospect_target ?? 0);
  const spkTarget = Number(target.data?.spk_target ?? 0);
  const targetStillAhead =
    (prospectTarget > 0 && (prospects.count ?? 0) < prospectTarget) ||
    (spkTarget > 0 && (spk.count ?? 0) < spkTarget);

  if (targetStillAhead) {
    const reminder = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
    if (reminder.getTime() <= now.getTime()) reminder.setDate(reminder.getDate() + 1);
    while (reminder < nextMonth) {
      await schedule(
        "Semangat, Sales!",
        TARGET_MESSAGE,
        new Date(reminder),
        TARGET_KIND,
        `target-${localDateKey(reminder)}`,
      );
      reminder.setDate(reminder.getDate() + 1);
    }
  }
}
