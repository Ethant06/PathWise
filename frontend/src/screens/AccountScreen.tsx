import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "../theme";
import type { UserPublic } from "../types";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Screen } from "../components/ui/Screen";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AccountScreen({
  user,
  onLogOut,
  children,
}: {
  user: UserPublic;
  onLogOut: () => void;
  /** Feature links and settings, shown above "Log out". */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const first = user.name.trim().split(/\s+/)[0] || user.name;
  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xxl }}>
        <View style={{ gap: theme.space.xs }}>
          <AppText variant="overline">Account</AppText>
          <AppText variant="title1">Hey, {first}</AppText>
        </View>
        <Card style={{ alignItems: "center", flexDirection: "row", gap: theme.space.lg }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radius.full,
              height: theme.size.avatar.lg,
              justifyContent: "center",
              width: theme.size.avatar.lg,
            }}
          >
            <AppText color={theme.colors.primary} variant="title2">
              {initials(user.name)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: theme.space.xs }}>
            <AppText variant="headline">{user.name}</AppText>
            <AppText numberOfLines={1} variant="subhead">
              {user.email}
            </AppText>
            <AppText variant="caption">
              {user.auth_provider === "google" ? "Signed in with Google" : "Signed in with email"}
            </AppText>
          </View>
        </Card>
        {children}
        <Button label="Log out" onPress={onLogOut} variant="destructive" />
      </View>
    </Screen>
  );
}
