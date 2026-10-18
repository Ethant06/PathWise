import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { currentUser } from "./src/api";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { clearToken, getToken, saveToken } from "./src/session";
import { colors } from "./src/theme";
import type { TokenResponse, UserPublic } from "./src/types";

type Session = { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; user: UserPublic };

export default function App() {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) setSession({ status: "signedOut" });
        return;
      }
      try {
        const user = await currentUser(token);
        if (!cancelled) setSession({ status: "signedIn", user });
      } catch {
        // Expired or rejected token: drop it and show the login screen.
        await clearToken();
        if (!cancelled) setSession({ status: "signedOut" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAuthenticated(response: TokenResponse) {
    await saveToken(response.access_token);
    setSession({ status: "signedIn", user: response.user });
  }

  async function handleLogOut() {
    await clearToken();
    setSession({ status: "signedOut" });
  }

  return (
    <View style={styles.container}>
      {session.status === "loading" && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.teal} />
        </View>
      )}
      {session.status === "signedOut" && <AuthScreen onAuthenticated={handleAuthenticated} />}
      {session.status === "signedIn" && <AccountScreen onLogOut={handleLogOut} user={session.user} />}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
