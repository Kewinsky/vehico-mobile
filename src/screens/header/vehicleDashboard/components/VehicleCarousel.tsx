import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import Carousel from "react-native-reanimated-carousel";

import type { AppTheme } from "../../../../ui/theme";
import { carouselInlineStyles } from "../dashboardScreenStyles";
import { CarouselPaginationCounter } from "../../../../ui/components/common/CarouselPaginationCounter";

type VehicleCarouselProps = {
  photoUrls: string[];
  width: number;
  height: number;
  theme: AppTheme;
  onPhotoPress?: (index: number) => void;
};

export function VehicleCarousel({
  photoUrls,
  width,
  height,
  theme,
  onPhotoPress,
}: VehicleCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndexRef = useRef(0);

  if (photoUrls.length === 0) return null;

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
            const nextIndex =
              ((Math.round(absoluteProgress) % photoUrls.length) +
                photoUrls.length) %
              photoUrls.length;
            if (currentIndexRef.current !== nextIndex) {
              currentIndexRef.current = nextIndex;
              setActiveIndex(nextIndex);
            }
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
              style={carouselInlineStyles.paginationOverlay(theme)}
              pointerEvents="none"
            >
              <CarouselPaginationCounter
                activeIndex={activeIndex}
                total={photoUrls.length}
              />
            </View>
            <Pressable
              style={carouselInlineStyles.expandButton(theme)}
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
