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
import { getToken } from "../lib/auth";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async ({ refresh = false } = {}) => {
    try {
      if (!refresh) setLoading(true);
      setError("");
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const data = await api.listNotifications(token);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      if (err.status === 401) router.replace("/login");
      else setError(err.message || "Failed to load notifications");
    } finally {
      if (!refresh) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  async function refresh() {
    setRefreshing(true);
    await loadNotifications({ refresh: true });
    setRefreshing(false);
  }

  async function markRead(notification: any) {
    const token = await getToken();
    if (!token) return router.replace("/login");

    try {
      setBusyId(notification._id);
      if (!notification.readAt) {
        const data = await api.markNotificationRead(notification._id, token);
        setNotifications((items) =>
          items.map((item) => (item._id === notification._id ? data.notification : item))
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      if (notification.caseId) router.push(`/cases/${notification.caseId}`);
    } catch (err: any) {
      setError(err.message || "Failed to open notification");
    } finally {
      setBusyId("");
    }
  }

  async function markAllRead() {
    const token = await getToken();
    if (!token) return router.replace("/login");

    try {
      setBusyId("all");
      await api.markAllNotificationsRead(token);
      const readAt = new Date().toISOString();
      setNotifications((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt || readAt }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || "Failed to mark notifications as read");
    } finally {
      setBusyId("");
    }
  }

  function formatDate(value?: string) {
    if (!value) return "";
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.title}>Case activity</Text>
          <Text style={styles.subtitle}>{unreadCount} unread</Text>
        </View>
        <Pressable
          style={[styles.markAll, (!unreadCount || busyId === "all") && styles.disabled]}
          disabled={!unreadCount || busyId === "all"}
          onPress={markAllRead}
        >
          <Text style={styles.markAllText}>
            {busyId === "all" ? "Updating..." : "Mark all read"}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.readAt && styles.unreadCard]}
              disabled={busyId === item._id}
              onPress={() => markRead(item)}
            >
              <View style={styles.topline}>
                <Text style={styles.caseTitle}>{item.caseTitle || "Agreement"}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              {item.actor?.name ? (
                <Text style={styles.actor}>Updated by {item.actor.name}</Text>
              ) : null}
              {!item.readAt ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  title: { color: "#111827", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#6b7280", marginTop: 3 },
  markAll: { backgroundColor: "#5b21b6", borderRadius: 12, padding: 10 },
  markAllText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: { color: "#991b1b", backgroundColor: "#fee2e2", padding: 10, borderRadius: 12 },
  list: { gap: 10, paddingBottom: 20 },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 14,
  },
  unreadCard: { backgroundColor: "#faf5ff", borderColor: "#c4b5fd" },
  topline: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  caseTitle: { color: "#5b21b6", fontWeight: "700", flex: 1 },
  date: { color: "#6b7280", fontSize: 11 },
  cardTitle: { color: "#111827", fontWeight: "800", marginTop: 8 },
  message: { color: "#374151", lineHeight: 20, marginTop: 5 },
  actor: { color: "#6b7280", fontSize: 12, marginTop: 8 },
  unreadDot: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7c3aed",
  },
});
