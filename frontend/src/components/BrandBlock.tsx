import { Image, View } from "react-native";

import { useTheme } from "../theme";

/**
 * Logo and title for the login and home screens.
 * Replace frontend/assets/logo.png with your own PNG and keep this filename.
 * The file has transparent padding; this frame crops it so the mark sits flush left.
 */
const logo = require("../../assets/logo.png");

const ART = { width: 960, height: 325, left: 28, top: 36, contentWidth: 833, contentHeight: 259 };

export function BrandBlock() {
  const theme = useTheme();
  const frameHeight = theme.size.fab;
  const scale = frameHeight / ART.contentHeight;
  const frameWidth = Math.round(ART.contentWidth * scale);

  return (
    <View style={{ alignItems: "flex-start" }}>
      <View style={{ height: frameHeight, overflow: "hidden", width: frameWidth }}>
        <Image
          accessibilityLabel="PathWise"
          source={logo}
          style={{
            height: Math.round(ART.height * scale),
            marginLeft: Math.round(-ART.left * scale),
            marginTop: Math.round(-ART.top * scale),
            width: Math.round(ART.width * scale),
          }}
        />
      </View>
    </View>
  );
}
