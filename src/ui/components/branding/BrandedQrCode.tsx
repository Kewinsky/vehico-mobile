import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { RadialGradient } from "@shopify/react-native-skia";
import QRCode from "react-native-qrcode-skia";

import { useTheme } from "../../ThemeProvider";
import { Logo } from "./Logo";

const ACCENT_GRADIENT_DARK = "#996E02";

type BrandedQrCodeProps = {
  value: string;
  size: number;
};

export function BrandedQrCode({ value, size }: BrandedQrCodeProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const logoSize = Math.round(Math.min(80, Math.max(56, size * 0.3)));
  const logoAreaSize = logoSize + theme.spacing.sm * 2;
  const gradientCenter = size / 2;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, backgroundColor: "transparent" },
      ]}
    >
      <QRCode
        value={value}
        size={size}
        errorCorrectionLevel="H"
        logoAreaSize={logoAreaSize}
        logoAreaBorderRadius={999}
        shapeOptions={{
          shape: "rounded",
          eyePatternShape: "rounded",
          gap: 0,
          eyePatternGap: 0,
        }}
        logo={
          <View
            style={[
              styles.logoBadge,
              {
                width: logoAreaSize,
                height: logoAreaSize,
                backgroundColor: "transparent",
              },
            ]}
          >
            <Logo width={logoSize} height={logoSize} />
          </View>
        }
      >
        <RadialGradient
          c={{ x: gradientCenter, y: gradientCenter }}
          r={gradientCenter}
          colors={[theme.colors.accent, ACCENT_GRADIENT_DARK]}
          positions={[0.2, 1]}
        />
      </QRCode>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    logoBadge: {
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
  });
