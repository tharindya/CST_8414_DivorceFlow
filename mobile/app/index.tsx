import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../lib/api";
import { clearSession, getToken } from "../lib/auth";

export default function AgreementsScreen() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  const loadCases = useCallback(async ({ refresh = false } = {}) => {
    try {
      if (!refresh) setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const [caseData, notificationData] = await Promise.all([
        api.listCases(token),
        api.getUnreadNotificationCount(token),
      ]);
      setCases(caseData.cases || []);
      setUnreadCount(notificationData.unreadCount || 0);
    } catch (err: any) {
      if (err.status === 401) router.replace("/login");
      else setError(err.message || "Failed to load agreements");
    } finally {
      if (!refresh) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCases();
    }, [loadCases])
  );

  async function refresh() {
    setRefreshing(true);
    await loadCases({ refresh: true });
    setRefreshing(false);
  }

  async function logout() {
    await clearSession();
    router.replace("/login");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/notifications")}
        >
          <Text style={styles.actionText}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable style={styles.actionButton} onPress={logout}>
          <Text style={styles.actionText}>Log out</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>My Agreements</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={cases}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No agreements found.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/cases/${item._id}`)}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <Text style={styles.meta}>Jurisdiction: {item.jurisdiction || "General"}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  actionText: { fontWeight: "700", color: "#111827" },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: "#5b21b6",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
  error: {
    color: "#991b1b",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 30 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  cardTitle: { fontWeight: "800", fontSize: 18, color: "#111827", marginBottom: 8 },
  meta: { color: "#6b7280" },
});
