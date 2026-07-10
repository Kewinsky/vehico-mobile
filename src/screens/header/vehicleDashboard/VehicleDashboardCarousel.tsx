import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import Carousel, { Pagination } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";

import { Glow } from "../../../ui/components/dashboard/Glow";
import { useVehicleDashboard } from "./VehicleDashboardProvider";

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: ReturnType<typeof useVehicleDashboard>["theme"];
  onPhotoPress?: (index: number) => void;
};

function VehicleCarousel({
  photoUrls,
  width,
  height,
  theme,
  onPhotoPress,
}: VehicleCarouselProps) {
  const progress = useSharedValue(0);
  const currentIndexRef = useRef(0);

  if (photoUrls.length === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={() =>
        onPhotoPress?.(Math.round(currentIndexRef.current) % photoUrls.length)
      }
      style={{ width, height, overflow: "hidden" }}
    >
      <View style={{ position: "relative", width, height }}>
        <Carousel
          loop
          snapEnabled
          pagingEnabled
          data={photoUrls}
          width={width}
          height={height}
          onProgressChange={(_, absoluteProgress) => {
            progress.value = absoluteProgress;
            currentIndexRef.current = absoluteProgress;
          }}
          renderItem={({ item: url }) => (
            <View style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <Image
                source={{ uri: url }}
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: theme.colors.card,
                }}
                contentFit="cover"
                transition={200}
              />
            </View>
          )}
        />
        {photoUrls.length > 1 ? (
          <>
            <View
              style={carouselStyles.paginationOverlay(theme)}
              pointerEvents="none"
            >
              <Pagination.Basic
                progress={progress}
                data={photoUrls.map((url) => ({ url }))}
                dotStyle={carouselStyles.paginationDot}
                activeDotStyle={carouselStyles.activePaginationDot(theme)}
                containerStyle={{ gap: 5 }}
              />
            </View>
            <Pressable
              style={carouselStyles.expandButton(theme)}
              onPress={() =>
                onPhotoPress?.(
                  Math.round(currentIndexRef.current) % photoUrls.length,
                )
              }
              hitSlop={8}
            >
              <FontAwesome5
                name="expand"
                size={16}
                color={theme.colors.accent}
              />
            </Pressable>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Photo carousel with glow – overview tab only. */
export function VehicleDashboardCarousel() {
  const {
    vehicle,
    photoUrls,
    windowWidth,
    windowHeight,
    vehicleImageHeight,
    theme,
    mode,
    setFullScreenIndex,
  } = useVehicleDashboard();

  const styles = makeStyles(theme);

  return (
    <View style={styles.root}>
      <Glow
        width={windowWidth}
        height={Math.round(windowHeight * 0.55)}
        mode={mode}
        variant="irregular"
        irregularOrigin="top-right"
        angle={135}
        scale={2}
        style={styles.glow}
      />
      <View style={[styles.imageContainer, { height: vehicleImageHeight }]}>
        {photoUrls.length > 0 ? (
          <VehicleCarousel
            photoUrls={photoUrls}
            width={windowWidth}
            height={vehicleImageHeight}
            theme={theme}
            onPhotoPress={(index) => setFullScreenIndex(index)}
          />
        ) : (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons
              name={vehicle?.type === "car" ? "car-outline" : "motorbike"}
              size={theme.spacing.xl * 2}
              color={theme.colors.muted}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useVehicleDashboard>["theme"]) =>
  StyleSheet.create({
    root: {
      position: "relative",
      width: "100%",
    },
    glow: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 0,
    },
    imageContainer: {
      position: "relative",
      zIndex: 1,
      overflow: "hidden",
      borderBottomLeftRadius: theme.radius.xl,
      borderBottomRightRadius: theme.radius.xl,
    },
    placeholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
  });

const carouselStyles = {
  paginationOverlay: (theme: ReturnType<typeof useVehicleDashboard>["theme"]) =>
    ({
      position: "absolute" as const,
      bottom: theme.spacing.md,
      left: theme.spacing.md,
      zIndex: 10,
    }),
  paginationDot: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 999,
  },
  activePaginationDot: (
    theme: ReturnType<typeof useVehicleDashboard>["theme"],
  ) => ({
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
  }),
  expandButton: (theme: ReturnType<typeof useVehicleDashboard>["theme"]) => ({
    position: "absolute" as const,
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }),
};
