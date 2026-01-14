import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Vehicle, VehiclePhoto } from "../types/domain";
import { deleteVehicle, getVehicle } from "../services/vehicles/vehiclesRepo";
import { createSignedUrl } from "../services/attachments/attachmentsRepo";
import { listVehiclePhotos } from "../services/vehiclePhotos/vehiclePhotosRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicle">;

export function ManageVehicleScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      const p = await listVehiclePhotos(vehicleId);
      setPhotos(p);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDeleteVehicle() {
    Alert.alert(
      t("manageVehicle.deleteVehicleTitle"),
      t("manageVehicle.deleteVehicleBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVehicle(vehicleId);
              navigation.popToTop();
            } catch (e: any) {
              toastError(t("common.error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  }

  async function openPhoto(photo: VehiclePhoto) {
    try {
      const url = await createSignedUrl(
        photo.storage_bucket,
        photo.storage_path
      );
      await Linking.openURL(url);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />

      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t("manageVehicle.title")}</Text>
        <Pressable
          onPress={() =>
            navigation.navigate("ManageVehicleEdit", { vehicleId })
          }
          hitSlop={10}
        >
          <Text style={styles.editLink}>{t("common.edit")}</Text>
        </Pressable>
      </View>

      {vehicle ? (
        <>
          <View style={{ height: theme.spacing.md }} />
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{vehicle.title}</Text>
            <View style={{ height: 12 }} />
            <View style={styles.row}>
              <Text style={styles.label}>{t("vehicleForm.makeLabel")}</Text>
              <Text style={styles.value}>{vehicle.make}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("vehicleForm.modelLabel")}</Text>
              <Text style={styles.value}>{vehicle.model}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t("vehicleForm.yearLabel")}</Text>
              <Text style={styles.value}>
                {String(vehicle.production_year)}
              </Text>
            </View>
            {vehicle.vin ? (
              <View style={styles.row}>
                <Text style={styles.label}>VIN</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {vehicle.vin}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ height: 24 }} />
          <Text style={styles.h2}>{t("manageVehicle.photosTitle")}</Text>
          <Text style={styles.muted}>{t("manageVehicle.photosSubtitle")}</Text>

          <View style={{ height: 12 }} />
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => void openPhoto(item)}
                  >
                    <Text style={styles.cardTitle}>
                      {t("documents.photoLabel")}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {item.storage_path.split("/").slice(-1)[0]}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.muted}>{t("documents.noPhotos")}</Text>
              ) : null
            }
          />

          <View style={{ height: 28 }} />
          <Button onPress={onDeleteVehicle} variant="destructive">
            {t("manageVehicle.deleteVehicle")}
          </Button>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 26, fontWeight: "800", color: theme.colors.fg },
    headerSubtitle: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    h2: { fontSize: 18, fontWeight: "800", color: theme.colors.fg },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    editLink: { color: theme.colors.muted, fontWeight: "800" },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 6,
    },
    cardTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.fg },
    cardMeta: { fontSize: theme.typography.small, color: theme.colors.muted },

    detailsCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: 8,
    },
    detailsTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    label: {
      fontSize: theme.typography.small,
      fontWeight: "800",
      color: theme.colors.muted,
    },
    value: {
      fontSize: theme.typography.small,
      fontWeight: "400",
      color: theme.colors.fg,
    },
  });
