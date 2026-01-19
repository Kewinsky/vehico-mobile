import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { VehicleType, FuelType, TransmissionType, DriveType } from "../types/domain";
import { createVehicle } from "../services/vehicles/vehiclesRepo";
import { uploadVehicleProfilePhoto } from "../services/vehicles/uploadProfilePhoto";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { IconButton } from "../ui/components/IconButton";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ui/ThemeProvider";
import { toastError } from "../ui/toast/toast";

type Props = NativeStackScreenProps<AppStackParamList, "VehicleForm">;

export function VehicleFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
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
  const [driveType, setDriveType] = useState<DriveType | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      make.trim().length > 0 &&
      model.trim().length > 0 &&
      year.trim().length === 4
    );
  }, [title, make, model, year]);

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
      setProfilePhotoUri(uri);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSave() {
    try {
      setSaving(true);
      const production_year = Number(year);
      if (!Number.isFinite(production_year)) throw new Error("Invalid year");

      const created = await createVehicle({
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
        drive_type: driveType,
        notes: notes.trim().length ? notes.trim() : null,
      });

      // Upload profile photo if selected
      if (profilePhotoUri) {
        try {
          const photoUrl = await uploadVehicleProfilePhoto({
            vehicleId: created.id,
            fileUri: profilePhotoUri,
          });
          // Update vehicle with profile photo URL
          const { updateVehicle } = await import(
            "../services/vehicles/vehiclesRepo"
          );
          const updated = await updateVehicle(created.id, {
            profile_photo_url: photoUrl,
          });
          // Update navigation params with updated vehicle
          navigation.replace("VehicleDetail", {
            vehicleId: updated.id,
            title: updated.title,
          });
          return;
        } catch (e: any) {
          // Log error but don't block navigation
          console.error("Failed to upload profile photo:", e);
        }
      }

      navigation.replace("VehicleDetail", {
        vehicleId: created.id,
        title: created.title,
      });
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen header={<AppHeader onBack={() => navigation.goBack()} />}>
      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.h1}>{t("vehicleForm.title")}</Text>

      <View style={{ height: theme.spacing.md }} />

      {/* Profile Photo Section */}
      {profilePhotoUri ? (
        <View style={styles.profilePhotoCard}>
          <View style={styles.profilePhotoImageContainer}>
            <Image
              source={{ uri: profilePhotoUri }}
              style={styles.profilePhotoImage}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.profilePhotoMenuButton}>
              <IconButton
                onPress={() => {
                  Alert.alert(t("vehicleForm.profilePhotoTitle"), "", [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("vehicleForm.changeProfilePhoto"),
                      onPress: () => void pickProfilePhoto(),
                    },
                    {
                      text: t("manageVehicle.removeProfilePhoto"),
                      style: "destructive",
                      onPress: () => setProfilePhotoUri(null),
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
            {t("vehicleForm.addProfilePhoto")}
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
              type === "car" && { borderColor: theme.colors.fg },
            ]}
          >
            <Text
              style={[
                styles.typeChipText,
                {
                  color: type === "car" ? theme.colors.fg : theme.colors.muted,
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
              type === "motorcycle" && { borderColor: theme.colors.fg },
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
        label={t("vehicleForm.titleLabel")}
        value={title}
        onChangeText={setTitle}
        placeholder={type === "car" ? "BMW 530d 2019" : "Yamaha MT-07 2020"}
      />

      <TextField
        label={t("vehicleForm.vinLabel")}
        value={vin}
        onChangeText={setVin}
        autoCapitalize="characters"
      />
      <TextField
        label={t("vehicleForm.makeLabel")}
        value={make}
        onChangeText={setMake}
      />
      <TextField
        label={t("vehicleForm.modelLabel")}
        value={model}
        onChangeText={setModel}
      />
      <TextField
        label={t("vehicleForm.yearLabel")}
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
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
                transmission === tr && { borderColor: theme.colors.fg },
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
      <View style={styles.group}>
        <Text style={[styles.label, { color: theme.colors.muted }]}>
          {t("vehicleForm.driveTypeLabel")}
        </Text>
        <View style={styles.typeRow}>
          {(["FWD", "RWD", "AWD"] as const).map((dt) => (
            <Pressable
              key={dt}
              onPress={() => setDriveType(dt)}
              style={[
                styles.typeChip,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
                driveType === dt && { borderColor: theme.colors.fg },
              ]}
            >
              <Text
                style={[
                  styles.typeChipText,
                  {
                    color:
                      driveType === dt ? theme.colors.fg : theme.colors.muted,
                  },
                ]}
              >
                {dt}
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
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: { fontSize: 20, fontWeight: "800", color: theme.colors.fg },
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
    },
    typeChip: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    typeChipText: {
      fontWeight: "700",
    },
    profilePhotoCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      backgroundColor: theme.colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
  });
