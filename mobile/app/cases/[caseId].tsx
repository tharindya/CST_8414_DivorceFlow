import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";

function reviewTone(status?: string) {
  switch ((status || "").toUpperCase()) {
    case "REVIEWED":
      return {
        bg: "#dcfce7",
        border: "#86efac",
        text: "#166534",
      };
    case "NEEDS_REVISION":
      return {
        bg: "#fee2e2",
        border: "#fca5a5",
        text: "#991b1b",
      };
    case "NOT_REVIEWED":
    default:
      return {
        bg: "#f3f4f6",
        border: "#d1d5db",
        text: "#374151",
      };
  }
}

function ReviewBadge({
  label,
  status,
}: {
  label: string;
  status?: string;
}) {
  const tone = reviewTone(status);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: tone.text }]}>
        {label}: {status || "NOT_REVIEWED"}
      </Text>
    </View>
  );
}

export default function CaseDetailScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [caseDoc, setCaseDoc] = useState<any>(null);
  const [clauses, setClauses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCase = useCallback(async ({ refresh = false } = {}) => {
    try {
      if (!refresh) setLoading(true);
      setError("");

      const token = await getToken();
      if (!token || !caseId) {
        router.replace("/login");
        return;
      }

      const caseRes = await api.getCase(caseId, token);
      const clauseRes = await api.listClauses(caseId, token);

      setCaseDoc(caseRes.case);
      setClauses(clauseRes.clauses || []);
    } catch (err: any) {
      console.log("CASE DETAIL LOAD ERROR:", err);
      setError(err.message || "Failed to load agreement");
    } finally {
      if (!refresh) setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  async function refreshCase() {
    setRefreshing(true);
    await loadCase({ refresh: true });
    setRefreshing(false);
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.headerCard}>
        <Text style={styles.title}>{caseDoc?.title || "Agreement"}</Text>
        <Text style={styles.meta}>Status: {caseDoc?.status || "DRAFT"}</Text>
        <Text style={styles.meta}>Jurisdiction: {caseDoc?.jurisdiction || "General"}</Text>

        <Pressable
          style={styles.chatButton}
          onPress={() => router.push(`/cases/${caseId}/chat`)}
        >
          <Text style={styles.chatButtonText}>Open Chat</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Clauses</Text>

      <FlatList
        data={clauses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshCase} />
        }
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.meta}>No clauses found for this agreement.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>Category: {item.category}</Text>

            {item.templateTitle ? (
              <Text style={styles.meta}>Template: {item.templateTitle}</Text>
            ) : null}

            <View style={styles.badgeRow}>
              <ReviewBadge
                label="Template Review"
                status={item.templateReviewStatus}
              />
              <ReviewBadge
                label="Moderator Review"
                status={item.adminReviewStatus}
              />
            </View>

            <Text style={styles.body}>{item.contentCurrent || "No content"}</Text>

            {item.adminReviewStatus === "NEEDS_REVISION" && !!item.adminReviewNote ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Moderator Note</Text>
                <Text style={styles.noteText}>{item.adminReviewNote}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: {
    marginBottom: 12,
    color: "#991b1b",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  cardTitle: { fontWeight: "800", fontSize: 17, color: "#111827", marginBottom: 8 },
  meta: { color: "#6b7280", marginBottom: 4 },
  body: { color: "#374151", marginTop: 12, lineHeight: 20 },
  chatButton: {
    marginTop: 14,
    backgroundColor: "#5b21b6",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  chatButtonText: { color: "#fff", fontWeight: "700" },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  noteBox: {
    marginTop: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: 14,
    padding: 12,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9a3412",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  noteText: {
    color: "#7c2d12",
    lineHeight: 20,
  },
});
