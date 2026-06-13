import { Ionicons } from "@expo/vector-icons";
import { Navigation, Phone } from "lucide-react-native";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ExclusiveSwipeable } from "../common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../common/SwipeActions";

import type { Workshop, WorkshopType } from "../../../types/domain";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

type WorkshopItemProps = {
  workshop: Workshop;
  callLabel: string;
  navigateLabel: string;
  onPress?: () => void;
};

const WORKSHOP_ICON_BACKGROUND: Record<WorkshopType, string> = {
  mechanic: "rgba(239,68,68,0.1)",
  electrician: "rgba(245,158,11,0.1)",
  detailer: "rgba(59,130,246,0.1)",
  bodywork: "rgba(34,197,94,0.1)",
  car_wash: "rgba(14,165,233,0.1)",
  other: "rgba(107,114,128,0.1)",
};
function workshopIconBackground(type: WorkshopType | null | undefined): string {
  if (!type) return WORKSHOP_ICON_BACKGROUND.other;
  return WORKSHOP_ICON_BACKGROUND[type] ?? WORKSHOP_ICON_BACKGROUND.other;
}

function WorkshopIcon({
  type,
  mutedColor,
}: {
  type: WorkshopType | null | undefined;
  mutedColor: string;
}) {
  switch (type) {
    case "mechanic":
      return <Ionicons name="construct-outline" size={22} color="#ef4444" />;
    case "electrician":
      return <Ionicons name="flash-outline" size={22} color="#f59e0b" />;
    case "detailer":
      return <Ionicons name="sparkles-outline" size={22} color="#3b82f6" />;
    case "bodywork":
      return (
        <Ionicons name="color-palette-outline" size={22} color="#22c55e" />
      );
    case "car_wash":
      return <Ionicons name="water-outline" size={22} color="#0ea5e9" />;
    default:
      return (
        <Ionicons name="storefront-outline" size={22} color={mutedColor} />
      );
  }
}

export function WorkshopItem({
  workshop,
  callLabel,
  navigateLabel,
  onPress,
}: WorkshopItemProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const phoneTrimmed = workshop.phone_number?.trim() ?? "";
  const addressTrimmed = workshop.address?.trim() ?? "";
  const canCall = phoneTrimmed.length > 0;
  const canNavigate = addressTrimmed.length > 0;

  async function placeCall() {
    if (!canCall) return;
    const telHref = `tel:${phoneTrimmed.replace(/[^\d+#*;,.]/g, "")}`;
    try {
      await Linking.openURL(telHref);
      return;
    } catch {
      const canOpen = await Linking.canOpenURL(telHref);
      if (canOpen) {
        await Linking.openURL(telHref);
      }
    }
  }

  async function openNavigation() {
    if (!canNavigate) return;
    const encodedAddress = encodeURIComponent(addressTrimmed);
    const nativeUrls =
      Platform.OS === "ios"
        ? [
            `comgooglemaps://?q=${encodedAddress}`,
            `maps://?q=${encodedAddress}`,
          ]
        : [
            `google.navigation:q=${encodedAddress}`,
            `geo:0,0?q=${encodedAddress}`,
          ];
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

    for (const url of nativeUrls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Try the next navigation handler.
      }
    }

    await Linking.openURL(fallbackUrl);
  }

  const content = (
    <View style={styles.card}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: workshopIconBackground(workshop.workshop_type),
            },
          ]}
        >
          <WorkshopIcon
            type={workshop.workshop_type}
            mutedColor={theme.colors.muted}
          />
        </View>

        <View style={styles.main}>
          <Text
            style={[styles.title, { color: theme.colors.fg }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {workshop.name}
          </Text>
          {!!workshop.address && (
            <Text
              style={[styles.subtitle, { color: theme.colors.muted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {workshop.address}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const rowContent = onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    content
  );

  if (!canCall && !canNavigate) return rowContent;

  const swipeActions = [
    ...(canNavigate
      ? [
          {
            onPress: () => void openNavigation(),
            color: theme.colors.muted,
            icon: <Navigation size={20} color="#000000" />,
            accessibilityLabel: navigateLabel,
          },
        ]
      : []),
    ...(canCall
      ? [
          {
            onPress: () => void placeCall(),
            color: theme.colors.accent,
            icon: <Phone size={20} color="#000000" />,
            accessibilityLabel: callLabel,
          },
        ]
      : []),
  ];

  return (
    <ExclusiveSwipeable
      renderRightActions={(progress) => (
        <SwipeActionsRow progress={progress} actions={swipeActions} />
      )}
      rightThreshold={32}
    >
      {rowContent}
    </ExclusiveSwipeable>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      gap: theme.spacing.sm,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.sm / 2,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
    },
  });
