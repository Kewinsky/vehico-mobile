import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SFSymbol } from "sf-symbols-typescript";
import {
  Button,
  Host,
  HStack,
  Image,
  Label,
  List,
  Spacer,
  SwipeActions,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  lineLimit,
  listRowBackground,
  listStyle,
  scrollContentBackground,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { Workshop, WorkshopType } from "../../../types/domain";
import {
  callWorkshop,
  navigateToWorkshop,
} from "../../../services/workshops/workshopContactActions";
import { useTheme } from "../../ThemeProvider";
import { toastCaughtError } from "../../toast/toast";
import type { WorkshopsListProps } from "./WorkshopsList.types";

const WORKSHOP_SYMBOLS: Record<WorkshopType, SFSymbol> = {
  mechanic: "wrench.and.screwdriver",
  electrician: "bolt",
  detailer: "sparkles",
  bodywork: "paintbrush",
  car_wash: "drop",
  other: "storefront",
};

function WorkshopRow({
  workshop,
  onPress,
  onDelete,
}: Pick<WorkshopsListProps, "onPress" | "onDelete"> & {
  workshop: Workshop;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const phone = workshop.phone_number?.trim() ?? "";
  const address = workshop.address?.trim() ?? "";

  const reportContactError = (error: unknown) =>
    toastCaughtError(error, t("common.error"));

  return (
    <SwipeActions modifiers={[listRowBackground(theme.colors.card)]}>
      <Button onPress={() => onPress(workshop)} modifiers={[buttonStyle("plain")]}>
        <HStack
          spacing={theme.spacing.sm}
          modifiers={[
            frame({ minHeight: 44, maxWidth: Infinity, alignment: "leading" }),
            contentShape(shapes.rectangle()),
          ]}
        >
          <Image
            systemName={WORKSHOP_SYMBOLS[workshop.workshop_type ?? "other"]}
            color={theme.colors.accent}
            size={22}
            modifiers={[frame({ width: 44, height: 44 })]}
          />
          <VStack alignment="leading" spacing={theme.spacing.xs / 2}>
            <Text
              modifiers={[
                font({ textStyle: "body", weight: "semibold" }),
                foregroundStyle(theme.colors.fg),
                lineLimit(2),
              ]}
            >
              {workshop.name}
            </Text>
            {address ? (
              <Text
                modifiers={[
                  font({ textStyle: "subheadline" }),
                  foregroundStyle(theme.colors.muted),
                  lineLimit(2),
                ]}
              >
                {address}
              </Text>
            ) : null}
          </VStack>
          <Spacer minLength={0} />
          <Image
            systemName="chevron.right"
            color={theme.colors.muted}
            size={12}
          />
        </HStack>
      </Button>
      <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
        {/* Trailing actions appear from right to left: call, maps, delete. */}
        {phone ? (
          <Button
            onPress={() => void callWorkshop(phone).catch(reportContactError)}
            modifiers={[tint(theme.colors.accent), labelStyle("iconOnly")]}
          >
            <Label
              title={t("workshops.call")}
              systemImage="phone"
              modifiers={[foregroundStyle("#000000")]}
            />
          </Button>
        ) : null}
        {address ? (
          <Button
            onPress={() =>
              void navigateToWorkshop(address).catch(reportContactError)
            }
            modifiers={[tint(theme.colors.muted), labelStyle("iconOnly")]}
          >
            <Label
              title={t("workshops.navigate")}
              systemImage="location"
              modifiers={[foregroundStyle("#000000")]}
            />
          </Button>
        ) : null}
        {/* Keep the row visible until deletion is confirmed, without a destructive role. */}
        <Button
          onPress={() => onDelete(workshop)}
          modifiers={[tint(theme.colors.danger), labelStyle("iconOnly")]}
        >
          <Label
            title={t("common.delete")}
            systemImage="trash"
            modifiers={[foregroundStyle("#000000")]}
          />
        </Button>
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

export function WorkshopsList({
  workshops,
  onPress,
  onDelete,
}: WorkshopsListProps) {
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const renderRow = useCallback(
    ({ item }: { item: Workshop }) => (
      <WorkshopRow workshop={item} onPress={onPress} onDelete={onDelete} />
    ),
    [onPress, onDelete],
  );

  return (
    <Host colorScheme={mode} seedColor={theme.colors.accent} style={{ flex: 1 }}>
      <List
        modifiers={[
          listStyle("insetGrouped"),
          scrollContentBackground("hidden"),
          background(theme.colors.bg),
        ]}
      >
        {workshops.length === 0 ? (
          <Text
            modifiers={[
              foregroundStyle(theme.colors.muted),
              listRowBackground(theme.colors.card),
            ]}
          >
            {t("workshops.noWorkshops")}
          </Text>
        ) : (
          <List.ForEach
            data={workshops}
            keyExtractor={(item) => item.id}
            estimatedItemSize={76}
          >
            {renderRow}
          </List.ForEach>
        )}
      </List>
    </Host>
  );
}
