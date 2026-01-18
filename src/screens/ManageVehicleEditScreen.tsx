import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type {
  Vehicle,
  VehicleType,
  FuelType,
  TransmissionType,
} from "../types/domain";
import { getVehicle, updateVehicle } from "../services/vehicles/vehiclesRepo";
import {
  deleteVehicleProfilePhoto,
  uploadVehicleProfilePhoto,
} from "../services/vehicles/uploadProfilePhoto";
import { createSignedUrl } from "../services/attachments/attachmentsRepo";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<AppStackParamList, "ManageVehicleEdit">;

export function ManageVehicleEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [type, setType] = useState<VehicleType>("car");
  const [title, setTitle] = useState("");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [powerHp, setPowerHp] = useState("");
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [transmission, setTransmission] = useState<TransmissionType | null>(
    null
  );
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const v = await getVehicle(vehicleId);
      setVehicle(v);
      setType(v.type);
      setTitle(v.title);
      setVin(v.vin ?? "");
      setMake(v.make);
      setModel(v.model);
      setYear(String(v.production_year));
      setEngineCapacity(v.engine_capacity ? String(v.engine_capacity) : "");
      setPowerHp(v.power_hp ? String(v.power_hp) : "");
      setFuelType(v.fuel_type);
      setTransmission(v.transmission);
      setNotes(v.notes ?? "");
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      make.trim().length > 0 &&
      model.trim().length > 0 &&
      year.trim().length === 4
    );
  }, [title, make, model, year]);

  async function onSave() {
    try {
      setSaving(true);
      const production_year = Number(year);
      if (!Number.isFinite(production_year)) throw new Error("Invalid year");
      const updated = await updateVehicle(vehicleId, {
        type,
        title: title.trim(),
        vin: vin.trim().length ? vin.trim() : null,
        make: make.trim(),
        model: model.trim(),
        production_year,
        engine_capacity: engineCapacity.trim().length
          ? Number(engineCapacity)
          : null,
        power_hp: powerHp.trim().length ? Number(powerHp) : null,
        fuel_type: fuelType,
        transmission: transmission,
        notes: notes.trim().length ? notes.trim() : null,
      });
      setVehicle(updated);
      navigation.goBack();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function pickProfilePhoto() {
    try {
      setUploadingPhoto(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Media library permission denied");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) throw new Error("No file selected");

      const photoUrl = await uploadVehicleProfilePhoto({
        vehicleId,
        fileUri: uri,
      });
      await updateVehicle(vehicleId, { profile_photo_url: photoUrl });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeProfilePhoto() {
    try {
      await deleteVehicleProfilePhoto(vehicleId);
      await updateVehicle(vehicleId, { profile_photo_url: null });
      await load();
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.h1}>{t("manageVehicle.editTitle")}</Text>
      {!!loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      )}

      {vehicle ? (
        <>
          <View style={{ height: theme.spacing.md }} />

          {/* Profile Photo Section */}
          {vehicle.profile_photo_url ? (
            <View style={styles.profilePhotoCard}>
              <View style={styles.profilePhotoImageContainer}>
                <Image
                  source={{ uri: vehicle.profile_photo_url }}
                  style={styles.profilePhotoImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.profilePhotoMenuButton}>
                  <IconButton
                    onPress={() => {
                      Alert.alert(t("manageVehicle.profilePhotoTitle"), "", [
                        { text: t("common.cancel"), style: "cancel" },
                        {
                          text: t("manageVehicle.changeProfilePhoto"),
                          onPress: () => void pickProfilePhoto(),
                        },
                        {
                          text: t("manageVehicle.removeProfilePhoto"),
                          style: "destructive",
                          onPress: () => void removeProfilePhoto(),
                        },
                      ]);
                    }}
                    variant="ghost"
                    disabled={saving || uploadingPhoto}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={theme.colors.fg}
                    />
                  </IconButton>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.profilePhotoCard}>
              <Button
                onPress={() => void pickProfilePhoto()}
                variant="ghost"
                disabled={saving || uploadingPhoto}
              >
                {t("manageVehicle.addProfilePhoto")}
              </Button>
            </View>
          )}

          <View style={{ height: theme.spacing.sm }} />
          <View style={styles.group}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.type")}
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setType("car")}
                style={[
                  styles.typeChip,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  type === "car" && { borderColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        type === "car" ? theme.colors.fg : theme.colors.muted,
                    },
                  ]}
                >
                  {t("vehicleForm.car")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType("motorcycle")}
                style={[
                  styles.typeChip,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  type === "motorcycle" && { borderColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        type === "motorcycle"
                          ? theme.colors.fg
                          : theme.colors.muted,
                    },
                  ]}
                >
                  {t("vehicleForm.motorcycle")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />
          <TextField
            noMarginTop
            label={t("manageVehicle.titleLabel")}
            value={title}
            onChangeText={setTitle}
          />
          <TextField
            label={t("manageVehicle.vinLabel")}
            value={vin}
            onChangeText={setVin}
            autoCapitalize="characters"
          />
          <TextField
            label={t("manageVehicle.makeLabel")}
            value={make}
            onChangeText={setMake}
          />
          <TextField
            label={t("manageVehicle.modelLabel")}
            value={model}
            onChangeText={setModel}
          />
          <TextField
            label={t("manageVehicle.yearLabel")}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TextField
            label={t("vehicleForm.engineCapacityLabel")}
            value={engineCapacity}
            onChangeText={setEngineCapacity}
            keyboardType="number-pad"
          />
          <TextField
            label={t("vehicleForm.powerHpLabel")}
            value={powerHp}
            onChangeText={setPowerHp}
            keyboardType="number-pad"
          />
          <PickerField
            label={t("vehicleForm.fuelTypeLabel")}
            value={fuelType}
            options={["petrol", "diesel", "hybrid", "electric", "lpg"] as const}
            getLabel={(value) =>
              t(
                `vehicleForm.fuelType${
                  value.charAt(0).toUpperCase() + value.slice(1)
                }` as
                  | "vehicleForm.fuelTypePetrol"
                  | "vehicleForm.fuelTypeDiesel"
                  | "vehicleForm.fuelTypeHybrid"
                  | "vehicleForm.fuelTypeElectric"
                  | "vehicleForm.fuelTypeLpg"
              )
            }
            onChange={setFuelType}
            placeholder={t("vehicleForm.fuelTypeLabel")}
          />
          <View style={styles.group}>
            <Text style={[styles.label, { color: theme.colors.muted }]}>
              {t("vehicleForm.transmissionLabel")}
            </Text>
            <View style={styles.typeRow}>
              {(["manual", "automatic"] as const).map((tr) => (
                <Pressable
                  key={tr}
                  onPress={() => setTransmission(tr)}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                    transmission === tr && { borderColor: theme.colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      {
                        color:
                          transmission === tr
                            ? theme.colors.fg
                            : theme.colors.muted,
                      },
                    ]}
                  >
                    {t(
                      `vehicleForm.transmission${
                        tr.charAt(0).toUpperCase() + tr.slice(1)
                      }` as
                        | "vehicleForm.transmissionManual"
                        | "vehicleForm.transmissionAutomatic"
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <TextField
            label={t("vehicleForm.notesLabel")}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />

          <View style={{ height: theme.spacing.md }} />
          <Button onPress={onSave} disabled={!canSave || saving}>
            {t("common.save")}
          </Button>
          <View style={{ height: theme.spacing.sm }} />
          <Button
            onPress={() => navigation.goBack()}
            variant="ghost"
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
        </>
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
    h2: { fontSize: 16, fontWeight: "800", color: theme.colors.fg },
    muted: { marginTop: 6, color: theme.colors.muted, lineHeight: 20 },
    sectionHeader: { gap: 6 },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    cardTitle: { color: theme.colors.fg, fontWeight: "800" },
    cardMeta: { marginTop: 4, color: theme.colors.muted },
    profilePhotoCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    profilePhotoImageContainer: {
      position: "relative",
      height: 220,
      width: "100%",
    },
    profilePhotoImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.card,
    },
    profilePhotoMenuButton: {
      position: "absolute",
      top: theme.spacing.sm,
      right: theme.spacing.sm,
    },
    loadingContainer: {
      paddingTop: theme.spacing.xl + theme.spacing.xs,
      paddingBottom: theme.spacing.xl + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    group: {
      gap: 8,
      marginTop: theme.spacing.sm,
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
    },
    typeRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "wrap",
    },
    typeChip: {
      flex: 1,
      minWidth: 80,
      height: 44,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    typeChipText: {
      fontWeight: "700",
      fontSize: 13,
    },
  });
