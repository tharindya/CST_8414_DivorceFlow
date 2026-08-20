import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../../lib/api";
import { getToken, getUser } from "../../../lib/auth";

export default function ChatScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      const [storedToken, storedUser] = await Promise.all([getToken(), getUser()]);
      if (!active) return;
      if (!storedToken) {
        router.replace("/login");
        return;
      }
      setToken(storedToken);
      setUser(storedUser);
    }

    void init();
    return () => {
      active = false;
    };
  }, [caseId]);

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!token || !caseId) return;

      try {
        if (!silent) setLoading(true);
        setError("");
        const data = await api.listMessages(caseId, token);
        setMessages(data.messages || []);
      } catch (err: any) {
        setError(err.message || "Failed to load messages");
        if (err.status === 401) router.replace("/login");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [caseId, token]
  );

  useEffect(() => {
    if (!token || !caseId) return;

    void loadMessages();

    const id = setInterval(() => void loadMessages({ silent: true }), 4000);
    return () => clearInterval(id);
  }, [caseId, loadMessages, token]);

  async function refresh() {
    setRefreshing(true);
    await loadMessages({ silent: true });
    setRefreshing(false);
  }

  async function send() {
    const messageText = text.trim();
    if (!messageText || !token || !caseId || sending) return;

    try {
      setSending(true);
      setError("");
      await api.sendMessage(caseId, messageText, token);
      setText("");
      await loadMessages({ silent: true });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function mine(item: any) {
    return item?.senderId?._id === (user?.id || user?._id);
  }

  function messageTime(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.list, messages.length === 0 && styles.emptyList]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          error ? <Text style={styles.error}>{error}</Text> : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.messageRow, mine(item) ? styles.rowMine : styles.rowOther]}>
            <View style={[styles.bubble, mine(item) ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={styles.sender}>
                {item.senderId?.name || item.senderId?.email || "User"}
              </Text>
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.messageTime}>{messageTime(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>{sending ? "Sending..." : "Send"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  emptyList: { justifyContent: "center" },
  emptyText: { color: "#6b7280", textAlign: "center" },
  error: {
    color: "#991b1b",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  messageRow: { flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  bubbleMine: { backgroundColor: "#ede9fe", borderColor: "#ddd6fe" },
  bubbleOther: { backgroundColor: "#fff", borderColor: "#e5e7eb" },
  sender: { fontWeight: "700", color: "#374151", marginBottom: 4 },
  messageText: { color: "#111827" },
  messageTime: { color: "#6b7280", fontSize: 11, marginTop: 6, textAlign: "right" },
  inputBar: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#5b21b6",
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendText: { color: "#fff", fontWeight: "700" },
});
