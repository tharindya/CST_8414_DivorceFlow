import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
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
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    init();
  }, [caseId]);

  useEffect(() => {
    if (!token || !caseId) return;

    loadMessages();

    const id = setInterval(loadMessages, 4000);
    return () => clearInterval(id);
  }, [token, caseId]);

  async function init() {
    const t = await getToken();
    const u = await getUser();
    setToken(t);
    setUser(u);
  }

  async function loadMessages() {
    if (!token || !caseId) return;
    const data = await api.listMessages(caseId, token);
    setMessages(data.messages || []);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function send() {
    if (!text.trim() || !token || !caseId) return;
    await api.sendMessage(caseId, text.trim(), token);
    setText("");
    await loadMessages();
  }

  function mine(item: any) {
    return item?.senderId?._id === user?.id;
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
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, mine(item) ? styles.rowMine : styles.rowOther]}>
            <View style={[styles.bubble, mine(item) ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={styles.sender}>
                {item.senderId?.name || item.senderId?.email || "User"}
              </Text>
              <Text style={styles.messageText}>{item.text}</Text>
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
        />
        <Pressable style={styles.sendButton} onPress={send}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  list: { padding: 16, gap: 10 },
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
  sendText: { color: "#fff", fontWeight: "700" },
});