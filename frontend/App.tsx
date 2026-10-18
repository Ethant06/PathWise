import {
  EncodeSans_600SemiBold,
  EncodeSans_700Bold,
  useFonts as useEncodeSans,
} from "@expo-google-fonts/encode-sans";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts as useInter } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { currentUser } from "./src/api";
import { AuthScreen } from "./src/screens/AuthScreen";
import { clearToken, getToken, saveToken } from "./src/session";
import { SignedInApp } from "./src/SignedInApp";
import { useTheme } from "./src/theme";
import type { TokenResponse, UserPublic } from "./src/types";

type Session = { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; user: UserPublic };

export default function App() {
  const theme = useTheme();
  const [encodeLoaded] = useEncodeSans({ EncodeSans_600SemiBold, EncodeSans_700Bold });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const fontsLoaded = encodeLoaded && interLoaded;
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
    <SafeAreaProvider>
      <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
        {!fontsLoaded || session.status === "loading" ? (
          <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}
        {fontsLoaded && session.status === "signedOut" ? <AuthScreen onAuthenticated={handleAuthenticated} /> : null}
        {fontsLoaded && session.status === "signedIn" ? (
          <SignedInApp onLogOut={handleLogOut} user={session.user} />
        ) : null}
        <StatusBar style={theme.isDark ? "light" : "dark"} />
      </View>
    </SafeAreaProvider>
  );
}
