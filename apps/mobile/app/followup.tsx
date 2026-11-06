import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type P = {
  id: string;
  customer_name: string;
  phone: string;
  unit_interest: string | null;
  status: string;
  follow_up: string | null;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  return parseDate(value).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function FollowUp() {
  const { profile } = useAuth();
  const [items, setItems] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const load = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("prospects")
      .select("id,customer_name,phone,unit_interest,status,follow_up")
      .not("follow_up", "is", null)
      .order("follow_up", { ascending: true });

    if (!error) setItems((data ?? []) as P[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = dateKey(new Date());
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, P[]> = {};
    items.forEach((item) => {
      if (!item.follow_up) return;
      const key = item.follow_up.slice(0, 10);
      grouped[key] = [...(grouped[key] ?? []), item];
    });
    return grouped;
  }, [items]);

  const selectedItems = itemsByDate[selectedDate] ?? [];
  const dueCount = items.filter((item) => (item.follow_up ?? "").slice(0, 10) <= today).length;
  const upcomingCount = items.length - dueCount;

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor="#E60012" />
      }
    >
      <Header />
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryNumber}>{dueCount}</Text>
          <Text style={s.summaryLabel}>Perlu follow-up</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryNumber, s.upcomingNumber]}>{upcomingCount}</Text>
          <Text style={s.summaryLabel}>Jadwal mendatang</Text>
        </View>
      </View>

      <View style={s.calendarCard}>
        <View style={s.calendarHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.calendarCaption}>KALENDER FOLLOW-UP</Text>
            <Text style={s.monthTitle}>{formatDate(selectedDate)}</Text>
          </View>
        </View>

        <Pressable
          glass={false}
          accessibilityRole="button"
          accessibilityLabel="Buka kalender bawaan HP untuk memilih tanggal"
          onPress={() => setDatePickerVisible(true)}
          style={s.systemCalendarButton}
        >
          <Ionicons name="calendar-outline" size={21} color="#E60012" />
          <View style={{ flex: 1 }}>
            <Text style={s.systemCalendarTitle}>Pilih tanggal</Text>
            <Text style={s.systemCalendarHint}>Gunakan kalender bawaan HP</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color="#92929A" />
        </Pressable>

        {datePickerVisible && (
          <DateTimePicker
            value={parseDate(selectedDate)}
            mode="date"
            display="calendar"
            onChange={(event, date) => {
              setDatePickerVisible(false);
              if (event.type === "set" && date) setSelectedDate(dateKey(date));
            }}
          />
        )}

        <Pressable
          glass={false}
          onPress={() => setSelectedDate(today)}
          style={s.todayButton}
        >
          <Text style={s.todayButtonText}>Kembali ke hari ini</Text>
        </Pressable>
      </View>

      <View style={s.listHeader}>
        <View>
          <Text style={s.section}>Jadwal terpilih</Text>
          <Text style={s.selectedDate}>{formatDate(selectedDate)}</Text>
        </View>
        <View style={s.countPill}>
          <Text style={s.countText}>{selectedItems.length} jadwal</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#E60012" style={{ marginTop: 20 }} />
      ) : selectedItems.length ? (
        selectedItems.map((item) => <FollowItem key={item.id} item={item} />)
      ) : (
        <Empty text="Tidak ada jadwal pada tanggal ini. Pilih tanggal bertanda titik merah untuk melihat pelanggan." />
      )}

      <Text style={s.section}>Ringkasan jadwal</Text>
      {loading ? null : items.length ? (
        items.map((item) => (
          <Pressable
            key={item.id}
            glass={false}
            style={s.compactItem}
            onPress={() => {
              if (item.follow_up) {
                setSelectedDate(item.follow_up.slice(0, 10));
              }
            }}
          >
            <View style={s.compactDate}>
              <Text style={s.compactDay}>{item.follow_up ? parseDate(item.follow_up).getDate() : "—"}</Text>
              <Text style={s.compactMonth}>{item.follow_up ? monthNames[parseDate(item.follow_up).getMonth()].slice(0, 3) : ""}</Text>
            </View>
            <View style={s.compactBody}>
              <Text style={s.name}>{item.customer_name}</Text>
              <Text style={s.meta}>{item.unit_interest || "Motor belum ditentukan"} • {item.phone}</Text>
              <Text style={s.date}>{item.follow_up ? formatDate(item.follow_up) : "Tanggal belum tersedia"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A0A0A8" />
          </Pressable>
        ))
      ) : (
        <Empty text="Belum ada jadwal follow-up. Tambahkan tanggal melalui menu Prospek." />
      )}
    </ScrollView>
  );
}



function Header() {
  return (
    <View style={s.header}>
      <Pressable glass={false} onPress={() => router.back()} style={s.back}>
        <Ionicons name="arrow-back" size={21} color="#24242A" />
      </Pressable>
      <View>
        <Text style={s.title}>Follow-up</Text>
        <Text style={s.sub}>Kalender dan jadwal kontak pelanggan</Text>
      </View>
    </View>
  );
}

function FollowItem({ item }: { item: P }) {
  const overdue = !!item.follow_up && item.follow_up.slice(0, 10) <= dateKey(new Date());
  return (
    <Pressable
      glass={false}
      style={s.item}
      onPress={() => router.push("/(tabs)/prospek")}
    >
      <View style={s.icon}>
        <Ionicons name="person-outline" size={20} color="#E60012" />
      </View>
      <View style={s.body}>
        <Text style={s.name}>{item.customer_name}</Text>
        <Text style={s.meta}>
          {item.unit_interest || "Motor belum ditentukan"} • {item.phone}
        </Text>
        <Text style={s.date}>{item.follow_up ? formatDate(item.follow_up) : "Tanggal belum tersedia"}</Text>
      </View>
      <View style={[s.statusPill, overdue ? s.overduePill : s.upcomingPill]}>
        <Text style={[s.statusText, overdue ? s.overdueText : s.upcomingText]}>
          {overdue ? "Jatuh tempo" : "Mendatang"}
        </Text>
      </View>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name="calendar-clear-outline" size={27} color="#B0B0B8" />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F5F7" },
  content: { padding: 20, paddingBottom: 42 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, fontWeight: "900", color: "#24242A" },
  sub: { fontSize: 12, color: "#888891", marginTop: 3 },
  summaryRow: { flexDirection: "row", gap: 11, marginBottom: 15 },
  summaryCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E8EAF0" },
  summaryNumber: { fontSize: 24, fontWeight: "900", color: "#E60012" },
  upcomingNumber: { color: "#2876C7" },
  summaryLabel: { fontSize: 11, fontWeight: "700", color: "#85858E", marginTop: 3 },
  calendarCard: { backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: "#E8EAF0", padding: 16, marginBottom: 22 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  calendarCaption: { fontSize: 10, letterSpacing: 1, fontWeight: "900", color: "#E60012", marginBottom: 4 },
  monthTitle: { fontSize: 19, fontWeight: "900", color: "#24242A" },
  systemCalendarButton: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#F8DCDD" },
  systemCalendarTitle: { fontSize: 14, fontWeight: "900", color: "#292930" },
  systemCalendarHint: { fontSize: 11, color: "#85858E", marginTop: 3 },
  todayButton: { alignSelf: "flex-start", marginTop: 12, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: "#FFF0F1", borderRadius: 9 },
  todayButtonText: { fontSize: 11, fontWeight: "800", color: "#E60012" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11 },
  section: { fontSize: 16, fontWeight: "900", color: "#24242A", marginTop: 6, marginBottom: 6 },
  selectedDate: { color: "#888891", fontSize: 11, marginTop: 2 },
  countPill: { backgroundColor: "#FFF0F1", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  countText: { fontSize: 11, color: "#E60012", fontWeight: "800" },
  item: { backgroundColor: "#FFF", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E8EAF0", marginBottom: 9 },
  icon: { width: 39, height: 39, borderRadius: 12, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, marginLeft: 11 },
  name: { fontSize: 13, fontWeight: "900", color: "#292930" },
  meta: { fontSize: 10, color: "#85858E", marginTop: 3 },
  date: { fontSize: 11, fontWeight: "800", color: "#E60012", marginTop: 5 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginLeft: 5 },
  overduePill: { backgroundColor: "#FFF0F1" },
  upcomingPill: { backgroundColor: "#EAF3FF" },
  statusText: { fontSize: 9, fontWeight: "900" },
  overdueText: { color: "#D71920" },
  upcomingText: { color: "#2876C7" },
  empty: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#E8EAF0", marginBottom: 14 },
  emptyText: { fontSize: 12, lineHeight: 18, color: "#92929A", marginTop: 8, textAlign: "center" },
  compactItem: { backgroundColor: "#FFF", borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E8EAF0", marginBottom: 8 },
  compactDate: { width: 45, height: 48, borderRadius: 12, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center" },
  compactDay: { color: "#E60012", fontSize: 18, fontWeight: "900" },
  compactMonth: { color: "#E60012", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  compactBody: { flex: 1, marginLeft: 11 },
});
