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

type P = {
  id: string;
  customer_name: string;
  phone: string;
  unit_interest: string | null;
  status: string;
  follow_up: string | null;
};

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

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
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();

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

  function changeMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function chooseDay(day: number) {
    setSelectedDate(dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)));
  }

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
          <View>
            <Text style={s.calendarCaption}>KALENDER FOLLOW-UP</Text>
            <Text style={s.monthTitle}>
              {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </Text>
          </View>
          <View style={s.monthControls}>
            <Pressable glass={false} accessibilityLabel="Bulan sebelumnya" onPress={() => changeMonth(-1)} style={s.monthArrow}>
              <Ionicons name="chevron-back" size={18} color="#E60012" />
            </Pressable>
            <Pressable glass={false} accessibilityLabel="Bulan berikutnya" onPress={() => changeMonth(1)} style={s.monthArrow}>
              <Ionicons name="chevron-forward" size={18} color="#E60012" />
            </Pressable>
          </View>
        </View>

        <View style={s.calendarGrid}>
          {weekdays.map((day) => (
            <Text key={day} style={s.weekday}>{day}</Text>
          ))}
          {Array.from({ length: firstWeekday }, (_, index) => (
            <View key={`empty-${index}`} style={s.dayCell} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
            const key = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
            const count = itemsByDate[key]?.length ?? 0;
            const isSelected = selectedDate === key;
            const isToday = today === key;
            return (
              <Pressable
                key={key}
                glass={false}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${monthNames[calendarMonth.getMonth()]}, ${count} jadwal`}
                onPress={() => chooseDay(day)}
                style={[s.dayCell, s.dayButton, isSelected && s.daySelected, isToday && !isSelected && s.dayToday]}
              >
                <Text allowFontScaling={false} style={[s.dayNumber, isSelected && s.dayNumberSelected]}>{String(day)}</Text>
                {count > 0 && <View style={[s.eventDot, isSelected && s.eventDotSelected]} />}
              </Pressable>
            );
          })}
        </View>

        <View style={s.calendarLegend}>
          <View style={s.legendDot} />
          <Text style={s.legendText}>Ada jadwal follow-up</Text>
          <View style={s.todayOutline} />
          <Text style={s.legendText}>Hari ini</Text>
        </View>
        <Pressable
          glass={false}
          onPress={() => {
            const now = new Date();
            setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            setSelectedDate(today);
          }}
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
                const date = parseDate(item.follow_up);
                setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
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
  monthControls: { flexDirection: "row", gap: 8 },
  monthArrow: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", textAlign: "center", color: "#92929A", fontSize: 11, fontWeight: "800", paddingVertical: 9 },
  dayCell: { width: "14.2857%", height: 43, alignItems: "center", justifyContent: "center" },
  dayButton: { borderRadius: 12 },
  daySelected: { backgroundColor: "#E60012" },
  dayToday: { borderWidth: 1.5, borderColor: "#E60012" },
  dayNumber: { fontFamily: "sans-serif", fontSize: 13, fontWeight: "600", color: "#34343D", includeFontPadding: false },
  dayNumberSelected: { color: "#FFF", fontWeight: "900" },
  eventDot: { position: "absolute", bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: "#E60012" },
  eventDotSelected: { backgroundColor: "#FFF" },
  calendarLegend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#E60012" },
  legendText: { color: "#888891", fontSize: 10, marginRight: 8 },
  todayOutline: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: "#E60012" },
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
