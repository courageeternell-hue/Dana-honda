import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: string;
  customer_name: string;
  unit_type: string;
  spk_date: string;
  sales_name: string | null;
  source: string | null;
};

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const monthStart = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
const nextMonthStart = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return localDate(next);
};
const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function PenjualanScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [history, setHistory] = useState<Sale[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [monthlyUnits, setMonthlyUnits] = useState(0);
  const [dailyUnits, setDailyUnits] = useState(0);
  const [target, setTarget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const today = useMemo(() => localDate(new Date()), []);
  const currentMonth = useMemo(() => monthStart(new Date()), []);
  const nextMonth = useMemo(() => nextMonthStart(new Date()), []);
  const monthLabel = useMemo(
    () => new Date(`${currentMonth}T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    [currentMonth],
  );

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [countResult, monthResult, historyResult, targetResult] = await Promise.all([
      supabase.from("spk_records").select("id", { count: "exact", head: true })
        .eq("user_id", profile.id).eq("status", "Jual"),
      supabase.from("spk_records").select("id,customer_name,unit_type,spk_date,sales_name,source")
        .eq("user_id", profile.id).eq("status", "Jual")
        .gte("spk_date", currentMonth).lt("spk_date", nextMonth)
        .order("spk_date", { ascending: false }),
      supabase.from("spk_records").select("id,customer_name,unit_type,spk_date,sales_name,source")
        .eq("user_id", profile.id).eq("status", "Jual")
        .order("spk_date", { ascending: false }).limit(50),
      supabase.from("sales_targets").select("spk_target")
        .eq("user_id", profile.id).eq("target_month", currentMonth).maybeSingle(),
    ]);

    const queryError = countResult.error || monthResult.error || historyResult.error || targetResult.error;
    if (queryError) {
      setError(queryError.message);
    } else {
      const monthRows = (monthResult.data ?? []) as Sale[];
      setTotalUnits(countResult.count ?? 0);
      setMonthlyUnits(monthRows.length);
      setDailyUnits(monthRows.filter((item) => item.spk_date === today).length);
      setHistory((historyResult.data ?? []) as Sale[]);
      setTarget(targetResult.data?.spk_target ?? 0);
      setError("");
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id, currentMonth, nextMonth, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    void load();
  };

  const progress = target > 0 ? Math.min(100, (monthlyUnits / target) * 100) : 0;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#E60012" />}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="trending-up" size={23} color="#E60012" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rekap Penjualan</Text>
          <Text style={styles.subtitle}>Pantau hasil penjualan motor kamu</Text>
        </View>
        <View style={styles.monthPill}><Text style={styles.monthText}>{monthLabel}</Text></View>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#E60012" /><Text style={styles.muted}>Memuat rekap penjualan...</Text></View>
      ) : (
        <>
          {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color="#B42332" /><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.totalCard}>
            <View style={styles.totalTop}>
              <View>
                <Text style={styles.totalEyebrow}>TOTAL UNIT TERJUAL</Text>
                <Text style={styles.totalValue}>{totalUnits}</Text>
                <Text style={styles.totalCaption}>Akumulasi seluruh penjualan</Text>
              </View>
              <View style={styles.totalIcon}><Ionicons name="bicycle" size={32} color="#FFFFFF" /></View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ringkasan Penjualan</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}><Ionicons name="sunny-outline" size={19} color="#E60012" /></View>
              <Text style={styles.statValue}>{dailyUnits}</Text>
              <Text style={styles.statLabel}>Hari ini</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}><Ionicons name="calendar-outline" size={19} color="#E60012" /></View>
              <Text style={styles.statValue}>{monthlyUnits}</Text>
              <Text style={styles.statLabel}>Bulan ini</Text>
            </View>
          </View>

          <View style={styles.targetCard}>
            <View style={styles.targetHeader}>
              <View>
                <Text style={styles.targetTitle}>Pencapaian Target</Text>
                <Text style={styles.targetSub}>Target SPK bulan {monthLabel}</Text>
              </View>
              <Ionicons name="flag-outline" size={23} color="#E60012" />
            </View>
            {target > 0 ? (
              <>
                <View style={styles.targetNumbers}>
                  <Text style={styles.targetCount}>{monthlyUnits} <Text style={styles.targetOf}>/ {target} unit</Text></Text>
                  <Text style={styles.percent}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
                <Text style={styles.targetHint}>{monthlyUnits >= target ? "Target bulanan tercapai. Pertahankan!" : `Kurang ${target - monthlyUnits} unit lagi untuk mencapai target.`}</Text>
              </>
            ) : (
              <Text style={styles.targetHint}>Target bulan ini belum diatur oleh Admin atau Supervisor.</Text>
            )}
          </View>

          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.sectionTitle}>Riwayat Penjualan</Text>
              <Text style={styles.historySub}>Menampilkan maksimal 50 penjualan terbaru</Text>
            </View>
            <View style={styles.historyBadge}><Text style={styles.historyBadgeText}>{history.length}</Text></View>
          </View>

          {history.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={30} color="#B0B0B8" />
              <Text style={styles.emptyTitle}>Belum ada penjualan</Text>
              <Text style={styles.emptyText}>SPK yang statusnya diubah menjadi Jual akan muncul di sini.</Text>
            </View>
          ) : history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyIcon}><Ionicons name="checkmark" size={18} color="#16834A" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customer}>{item.customer_name}</Text>
                <Text style={styles.unit}>{item.unit_type}</Text>
                <Text style={styles.date}>{formatDate(item.spk_date)}{item.source ? ` • ${item.source}` : ""}</Text>
              </View>
              <View style={styles.soldPill}><Text style={styles.soldText}>Terjual</Text></View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F5F7" },
  content: { paddingHorizontal: 18, paddingBottom: 42 },
  header: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 22 },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 23, fontWeight: "900", color: "#24242A" },
  subtitle: { fontSize: 11, color: "#85858F", marginTop: 3 },
  monthPill: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8EAF0", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  monthText: { color: "#666671", fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  totalCard: { backgroundColor: "#E60012", borderRadius: 22, padding: 21, marginBottom: 24 },
  totalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalEyebrow: { color: "#FFE3E5", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  totalValue: { color: "#FFFFFF", fontSize: 43, fontWeight: "900", marginTop: 6 },
  totalCaption: { color: "#FFE3E5", fontSize: 11, marginTop: 2 },
  totalIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: "#24242A", fontSize: 17, fontWeight: "900" },
  statsGrid: { flexDirection: "row", gap: 12, marginTop: 13, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E8EAF0", padding: 16 },
  statIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center" },
  statValue: { color: "#25252B", fontSize: 28, fontWeight: "900", marginTop: 10 },
  statLabel: { color: "#777780", fontSize: 12, fontWeight: "700", marginTop: 2 },
  targetCard: { backgroundColor: "#FFFFFF", borderRadius: 19, borderWidth: 1, borderColor: "#E8EAF0", padding: 18, marginBottom: 25 },
  targetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  targetTitle: { color: "#25252B", fontSize: 15, fontWeight: "900" },
  targetSub: { color: "#92929B", fontSize: 11, marginTop: 4 },
  targetNumbers: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  targetCount: { color: "#25252B", fontSize: 23, fontWeight: "900" },
  targetOf: { color: "#92929B", fontSize: 13, fontWeight: "700" },
  percent: { color: "#E60012", fontSize: 15, fontWeight: "900" },
  track: { height: 9, borderRadius: 9, backgroundColor: "#F0F0F2", overflow: "hidden", marginTop: 10 },
  fill: { height: 9, borderRadius: 9, backgroundColor: "#E60012" },
  targetHint: { color: "#85858F", fontSize: 11, lineHeight: 17, marginTop: 10 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  historySub: { color: "#92929B", fontSize: 10, marginTop: 4 },
  historyBadge: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: "#FFF0F1", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  historyBadgeText: { color: "#E60012", fontSize: 12, fontWeight: "900" },
  historyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E8EAF0", padding: 14, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  historyIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#E9F8EF", alignItems: "center", justifyContent: "center" },
  customer: { color: "#292930", fontSize: 13, fontWeight: "900" },
  unit: { color: "#666671", fontSize: 11, fontWeight: "700", marginTop: 3 },
  date: { color: "#9999A2", fontSize: 10, marginTop: 4 },
  soldPill: { backgroundColor: "#E9F8EF", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  soldText: { color: "#16834A", fontSize: 10, fontWeight: "900" },
  empty: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E8EAF0", padding: 25, alignItems: "center" },
  emptyTitle: { color: "#303039", fontSize: 14, fontWeight: "900", marginTop: 10 },
  emptyText: { color: "#92929B", fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 5 },
  loading: { paddingVertical: 70, alignItems: "center" },
  muted: { color: "#85858F", fontSize: 12, marginTop: 10 },
  errorBox: { backgroundColor: "#FFF0F1", borderRadius: 12, padding: 12, flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 14 },
  errorText: { color: "#B42332", fontSize: 11, flex: 1 },
});
