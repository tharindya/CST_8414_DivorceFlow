import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { clearSession, getToken } from "../lib/auth";

export default function AgreementsScreen() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const data = await api.listCases(token);
      setCases(data.cases || []);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
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
      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <Text style={styles.title}>My Agreements</Text>

      <FlatList
        data={cases}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
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
  logout: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 12,
  },
  logoutText: { fontWeight: "700", color: "#111827" },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 16 },
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