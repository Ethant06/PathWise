import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { login, loginWithGoogle, register } from "../api";
import { BrandBlock } from "../components/BrandBlock";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme";
import type { TokenResponse } from "../types";

type Mode = "login" | "signup";

WebBrowser.maybeCompleteAuthSession();

/** Google's iOS redirect. In Expo Go the client bundle ID is host.exp.Exponent. */
function googleRedirectUri(clientId: string): string {
  const prefix = clientId.replace(".apps.googleusercontent.com", "");
  return `com.googleusercontent.apps.${prefix}:/oauthredirect`;
}

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.eyebrow}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedLight}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (response: TokenResponse) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"form" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledGoogleToken = useRef<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleIosClientId || "missing.apps.googleusercontent.com",
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    redirectUri: Platform.OS === "ios" && googleIosClientId ? googleRedirectUri(googleIosClientId) : undefined,
    // Always show the account picker and Google's permission screen.
    extraParams: { prompt: "select_account consent" },
    scopes: ["openid", "profile", "email"],
  });

  const isSignup = mode === "signup";

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.authentication?.idToken || response.params.id_token;
    if (!idToken || handledGoogleToken.current === idToken) return;
    handledGoogleToken.current = idToken;
    run("google", () => loginWithGoogle({ id_token: idToken }));
  }, [response]);

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError(null);
  }

  async function run(kind: "form" | "google", call: () => Promise<TokenResponse>) {
    setPending(kind);
    setError(null);
    try {
      await onAuthenticated(await call());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPending(null);
    }
  }

  async function startGoogle() {
    if (!googleIosClientId && Platform.OS === "ios") {
      setError("Google sign-in needs the iOS client ID for Expo Go.");
      return;
    }
    if (!googleAndroidClientId && Platform.OS === "android") {
      setError("Google sign-in needs the Android client ID for com.pathwise.app.");
      return;
    }
    setError(null);
    setPending("google");
    const result = await promptAsync({ preferEphemeralSession: true });
    if (result.type === "cancel" || result.type === "dismiss" || result.type === "error") {
      setPending(null);
      setError(
        result.type === "error"
          ? "Google did not grant access. Sign-in was not completed."
          : "Google sign-in was canceled.",
      );
    }
  }

  function submit() {
    const trimmedEmail = email.trim();
    if ((isSignup && !name.trim()) || !trimmedEmail || !password) {
      setError(isSignup ? "Enter your name, email, and password." : "Enter your email and password.");
      return;
    }
    run("form", () =>
      isSignup
        ? register({ name: name.trim(), email: trimmedEmail, password })
        : login({ email: trimmedEmail, password }),
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <BrandBlock tagline="Find your safer way home" />

        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>{isSignup ? "Get started" : "Welcome back"}</Text>
          <Text style={styles.title}>{isSignup ? "Create Account" : "Log In"}</Text>
        </View>

        <View style={styles.card}>
          {isSignup && (
            <>
              <Field
                autoComplete="name"
                label="Name"
                onChangeText={setName}
                placeholder="Your name"
                textContentType="name"
                value={name}
              />
              <View style={styles.divider} />
            </>
          )}
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@uw.edu"
            textContentType="emailAddress"
            value={email}
          />
          <View style={styles.divider} />
          <Field
            autoCapitalize="none"
            autoComplete={isSignup ? "new-password" : "current-password"}
            label="Password"
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder={isSignup ? "Create a password" : "Your password"}
            returnKeyType="go"
            secureTextEntry
            textContentType={isSignup ? "newPassword" : "password"}
            value={password}
          />
        </View>

        {error && (
          <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.primary}>
          <PrimaryButton
            disabled={pending !== null}
            label={isSignup ? "Create Account" : "Log In"}
            loading={pending === "form"}
            onPress={submit}
          />
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={pending !== null || !request}
          onPress={startGoogle}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryPressed,
            (pending !== null || !request) && styles.inactive,
          ]}
        >
          <Text style={styles.secondaryLabel}>
            {pending === "google" ? "Waiting for Google…" : "Sign in with Google"}
          </Text>
        </Pressable>

        <View style={styles.switchRow}>
          <Text style={styles.switchCopy}>
            {isSignup ? "Already have an account?" : "New to SafePath?"}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={switchMode}>
            <Text style={styles.textButton}>{isSignup ? "Log in" : "Create an account"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 26,
    paddingBottom: 32,
  },
  header: { marginTop: 32, marginBottom: 18 },
  headerEyebrow: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", letterSpacing: -0.65 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  field: { gap: 4, minHeight: 70, justifyContent: "center", paddingHorizontal: 15, paddingVertical: 12 },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: { color: colors.ink, fontSize: 14, fontWeight: "600", padding: 0 },
  divider: { backgroundColor: colors.line, height: 1, marginLeft: 15 },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 11,
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  primary: { marginTop: 16 },
  orRow: { alignItems: "center", flexDirection: "row", gap: 10, marginVertical: 18 },
  orLine: { backgroundColor: colors.line, flex: 1, height: 1 },
  orText: { color: colors.mutedLight, fontSize: 12 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
  },
  secondaryPressed: { backgroundColor: colors.surfaceSoft },
  secondaryLabel: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  inactive: { opacity: 0.6 },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginTop: 22,
  },
  switchCopy: { color: colors.muted, fontSize: 13 },
  textButton: { color: colors.blue, fontSize: 13, fontWeight: "600" },
});
