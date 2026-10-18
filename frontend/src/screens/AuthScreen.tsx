import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { login, loginWithGoogle, register } from "../api";
import { BrandBlock } from "../components/BrandBlock";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Screen } from "../components/ui/Screen";
import { TextField } from "../components/ui/TextField";
import { useTheme } from "../theme";
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

export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (response: TokenResponse) => Promise<void>;
}) {
  const theme = useTheme();
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
      setError("Google sign-in needs the Android client ID for this app.");
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen scroll>
        <View style={{ gap: theme.space.xxxl }}>
          <BrandBlock />
          <View style={{ gap: theme.space.sm }}>
            <AppText variant="display">{isSignup ? "Create account" : "Welcome back"}</AppText>
            <AppText variant="body">
              {isSignup ? "A safer walk home starts with your name." : "Log in and pick a walk home."}
            </AppText>
          </View>
          <View style={{ gap: theme.space.md }}>
            {isSignup ? (
              <TextField
                autoComplete="name"
                label="Name"
                onChangeText={setName}
                placeholder="Your name"
                textContentType="name"
                value={name}
              />
            ) : null}
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="you@uw.edu"
              textContentType="emailAddress"
              value={email}
            />
            <TextField
              autoCapitalize="none"
              autoComplete={isSignup ? "new-password" : "current-password"}
              label="Password"
              onChangeText={setPassword}
              onSubmitEditing={submit}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              returnKeyType="go"
              secureTextEntry
              textContentType={isSignup ? "newPassword" : "password"}
              value={password}
            />
          </View>
          {error ? (
            <AppText accessibilityLiveRegion="polite" style={{ color: theme.colors.error }} variant="callout">
              {error}
            </AppText>
          ) : null}
          <View style={{ gap: theme.space.md }}>
            <Button
              disabled={pending !== null}
              label={isSignup ? "Create account" : "Log in"}
              loading={pending === "form"}
              onPress={submit}
            />
            <Button
              disabled={pending !== null || !request}
              label={pending === "google" ? "Waiting for Google…" : "Continue with Google"}
              loading={pending === "google"}
              onPress={startGoogle}
              variant="secondary"
            />
            <Button
              label={isSignup ? "I already have an account" : "New to PathWise? Create an account"}
              onPress={switchMode}
              variant="text"
            />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
