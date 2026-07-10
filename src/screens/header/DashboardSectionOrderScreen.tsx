import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useTranslation } from "react-i18next";
import { DraggableGrid } from "react-native-draggable-grid";
import { GripVertical } from "lucide-react-native";

import { usePremiumNavigation } from "../../core/hooks/usePremiumNavigation";
import { useEntitlements } from "../../core/providers/EntitlementsProvider";
import { HeaderLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { Button } from "../../ui/components/common/Button";
import { SegmentTabs } from "../../ui/components/common/SegmentTabs";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { ModalButton } from "../../ui/components/layout/ModalButton";
import { sectionOrdersEqual } from "../../utils/dashboardSectionOrder";
import {
  dashboardSectionLabel,
  type DashboardSectionPanel,
} from "./vehicleDashboard/sections/sectionLabels";
import { useDashboardSectionOrder } from "./vehicleDashboard/useDashboardSectionOrder";
import { getPremiumUpgradeAlertButtons } from "../../ui/limits/entitlementAlerts";

type SectionRow = {
  key: string;
};

const ROW_HEIGHT = 48;

export function DashboardSectionOrderScreen() {
  const router = useRouter();
  const premiumNavigation = usePremiumNavigation();
  const { t } = useTranslation();
  const { isPremium } = useEntitlements();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const rowWidth = windowWidth - theme.layout.contentPaddingHorizontal * 2;
  const rowGap = theme.spacing.sm;
  const itemHeight = ROW_HEIGHT + rowGap;

  const [panel, setPanel] = useState<DashboardSectionPanel>("overview");
  const overviewOrder = useDashboardSectionOrder("overview");
  const statsOrder = useDashboardSectionOrder("stats");
  const activeOrder = panel === "overview" ? overviewOrder : statsOrder;
  const { orderedIds, defaultIds, resetOrder } = activeOrder;
  const [rows, setRows] = useState<SectionRow[]>(() =>
    orderedIds.map((id) => ({ key: id })),
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const gridHeight = rows.length * itemHeight;
  const defaultIdList = useMemo(() => [...defaultIds], [defaultIds]);

  useEffect(() => {
    if (isPremium) return;
    Alert.alert(
      t("limits.premiumRequiredTitle"),
      t("dashboard.sectionOrder.premiumRequiredBody"),
      getPremiumUpgradeAlertButtons(t, premiumNavigation),
      { cancelable: true, onDismiss: () => router.back() },
    );
  }, [isPremium, premiumNavigation, router, t]);
  const isAtDefault = sectionOrdersEqual(
    rows.map((r) => r.key),
    defaultIdList,
  );

  useEffect(() => {
    setRows(orderedIds.map((id) => ({ key: id })));
  }, [panel, orderedIds]);

  const isDirty = useMemo(
    () =>
      !sectionOrdersEqual(
        rows.map((r) => r.key),
        orderedIds,
      ),
    [orderedIds, rows],
  );

  const onSave = useCallback(async () => {
    if (!isDirty || saving) return;
    const nextIds = rows.map((r) => r.key);
    try {
      setSaving(true);
      if (panel === "overview") {
        await overviewOrder.saveOrder(
          nextIds as Parameters<typeof overviewOrder.saveOrder>[0],
        );
      } else {
        await statsOrder.saveOrder(
          nextIds as Parameters<typeof statsOrder.saveOrder>[0],
        );
      }
      toastSuccess(t("dashboard.sectionOrder.saved"));
      router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("common.error");
      toastError(message);
    } finally {
      setSaving(false);
    }
  }, [isDirty, router, overviewOrder, panel, rows, saving, statsOrder, t]);

  const onReset = useCallback(async () => {
    if (resetting || saving || isAtDefault) return;
    try {
      setResetting(true);
      await resetOrder();
      setRows(defaultIdList.map((id) => ({ key: id })));
      toastSuccess(t("dashboard.sectionOrder.resetSuccess"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("common.error");
      toastError(message);
    } finally {
      setResetting(false);
    }
  }, [defaultIdList, isAtDefault, resetOrder, resetting, saving, t]);

  const renderRow = useCallback(
    (item: SectionRow) => (
      <View
        style={[
          styles.row,
          {
            width: rowWidth,
            height: ROW_HEIGHT,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <GripVertical size={20} color={theme.colors.muted} />
        <Text
          style={[styles.rowLabel, { color: theme.colors.fg }]}
          numberOfLines={2}
        >
          {dashboardSectionLabel(panel, item.key, t)}
        </Text>
      </View>
    ),
    [
      panel,
      rowWidth,
      styles.row,
      styles.rowLabel,
      t,
      theme.colors.card,
      theme.colors.fg,
      theme.colors.muted,
    ],
  );

  const headerRight = (
    <ModalButton
      variant="done"
      onPress={() => void onSave()}
      disabled={!isDirty}
      loading={saving}
    >
      {t("common.save")}
    </ModalButton>
  );

  return (
    <HeaderLayout onBack={() => router.back()} right={headerRight}>
      <View style={[styles.content, { paddingTop: headerHeight }]}>
        <ContentHeader
          title={t("dashboard.sectionOrder.title")}
          subtitle={t("dashboard.sectionOrder.hint")}
        />

        <SegmentTabs
          value={panel}
          variant="secondary"
          options={[
            {
              value: "overview",
              label: t("dashboard.sectionOrder.tabOverview"),
            },
            {
              value: "stats",
              label: t("dashboard.sectionOrder.tabStats"),
            },
          ]}
          onChange={setPanel}
        />

        <View style={[styles.listWrap, { height: gridHeight }]}>
          <DraggableGrid
            key={panel}
            numColumns={1}
            itemHeight={itemHeight}
            delayLongPress={120}
            style={{ width: rowWidth, height: gridHeight, flex: 0 }}
            data={rows}
            renderItem={renderRow}
            onDragRelease={(data) => {
              setRows(data as SectionRow[]);
            }}
          />
        </View>

        <Button
          variant="outlined"
          onPress={() => void onReset()}
          disabled={isAtDefault || saving || resetting}
          loading={resetting}
          style={styles.resetButton}
        >
          {t("dashboard.sectionOrder.reset")}
        </Button>
      </View>
    </HeaderLayout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    content: {
      flex: 1,
    },
    listWrap: {
      marginTop: theme.spacing.md,
      width: "100%",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.xl,
    },
    rowLabel: {
      flex: 1,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.medium,
    },
    resetButton: {
      marginTop: theme.spacing.lg,
    },
  });
