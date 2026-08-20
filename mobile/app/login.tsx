import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { saveSession } from "../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("a@test.com");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    try {
      setBusy(true);
      const data = await api.login(email, password);
      await saveSession(data.token, data.user);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Login failed", err.message || "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>DivorceFlow Mobile</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Review agreements and chat with the other party.</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={handleLogin} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? "Signing in..." : "Sign in"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", justifyContent: "center", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  eyebrow: { color: "#5b21b6", fontWeight: "700", marginBottom: 10 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  subtitle: { color: "#6b7280", marginTop: 8, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#5b21b6",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});