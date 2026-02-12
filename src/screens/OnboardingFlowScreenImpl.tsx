import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { Button } from "../ui/components/Button";
import { SegmentTabs } from "../ui/components/SegmentTabs";
import type {
  DriveType,
  FuelType,
  TransmissionType,
  VehicleType,
} from "../types/domain";
import { normalizeDisplayName } from "../utils/displayName";
import {
  isNonNegativeNumber,
  isValidProductionYear,
} from "../utils/validation";
import { createVehicle, listVehicles } from "../services/vehicles/vehiclesRepo";
import { uploadVehiclePhoto } from "../services/vehicles/uploadPhoto";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { supabase } from "../services/supabase/client";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { useAuth } from "../app/providers/AuthProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { DriveTypeIcon } from "../ui/components/DriveTypeIcon";

type Props = NativeStackScreenProps<AppStackParamList, "Onboarding">;

type PhotoFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const TOTAL_STEPS = 12;
const LAST_STEP_INDEX = TOTAL_STEPS - 1;

export function OnboardingFlowScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { settings } = useUserSettings();
  const { vehiclesLimit, isPremium, photosPerVehicleLimit } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const distanceUnit = settings?.distanceUnit ?? "km";

  const [currentStep, setCurrentStep] = useState(0);

  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [powerHp, setPowerHp] = useState("");
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [transmission, setTransmission] = useState<TransmissionType | null>(
    null,
  );
  const [driveType, setDriveType] = useState<DriveType | null>(null);

  const [photo, setPhoto] = useState<PhotoFile | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [createdVehicleId, setCreatedVehicleId] = useState<string | null>(null);

  const vehicleTitle = useMemo(() => {
    const y = year.trim();
    const parts = [make.trim(), model.trim()].filter(Boolean).join(" ");
    return [parts, y].filter(Boolean).join(", ");
  }, [make, model, year]);

  const showProgress = currentStep > 0;
  const progressPct = useMemo(() => {
    const n = Math.max(1, Math.min(TOTAL_STEPS, currentStep + 1));
    return n / TOTAL_STEPS;
  }, [currentStep]);

  const canGoBack = currentStep > 0 && !saving;

  const canGoNext = useMemo(() => {
    if (saving) return false;
    if (currentStep === 1) return name.trim().length >= 2;
    if (currentStep === 3)
      return make.trim().length >= 2 && model.trim().length >= 2;
    if (currentStep === 4) return isValidProductionYear(year);
    if (currentStep === 5) {
      const v = vin.trim();
      return v.length === 0 || v.length === 17;
    }
    if (currentStep === 7) {
      if (engineCapacity.trim().length > 0) {
        const n = Number(engineCapacity.trim());
        if (!Number.isFinite(n) || n <= 1) return false;
      }
      if (powerHp.trim().length > 0) {
        const n = Number(powerHp.trim());
        if (!Number.isFinite(n) || n <= 1) return false;
      }
    }
    return true;
  }, [
    currentStep,
    make,
    model,
    name,
    saving,
    year,
    vin,
    engineCapacity,
    powerHp,
  ]);

  const nextLabel = useMemo(() => {
    if (currentStep === 0) return t("onboarding.welcome.getStarted");
    return t("common.next");
  }, [currentStep, t]);

  function stripExamplePrefix(s: string) {
    return s
      .replace(/^e\.g\.\s*/i, "")
      .replace(/^np\.\s*/i, "")
      .trim();
  }

  function makePlaceholder(label: string, example: string) {
    const ex = stripExamplePrefix(example);
    return ex ? `${label}: ${ex}` : `${label}:`;
  }

  function showPicker<T extends string>(opts: {
    title: string;
    value: T | null;
    options: readonly T[];
    getLabel: (v: T) => string;
    onChange: (v: T | null) => void;
    placeholderLabel?: string;
  }) {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }> = [{ text: t("common.cancel"), style: "cancel" }];

    if (opts.placeholderLabel) {
      buttons.push({
        text: opts.placeholderLabel,
        onPress: () => opts.onChange(null),
      });
    }

    opts.options.forEach((opt) => {
      buttons.push({
        text: opts.getLabel(opt),
        onPress: () => opts.onChange(opt),
      });
    });

    Alert.alert(opts.title, "", buttons, { cancelable: true });
  }

  function onBack() {
    if (!canGoBack) return;
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  async function pickPhotoFromGallery() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted)
        throw new Error(t("attachments.galleryPermissionDenied"));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error(t("attachments.noFileSelected"));
      setPhoto({
        uri: asset.uri,
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
      });
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    }
  }

  async function ensureVehicleCreated(): Promise<string | null> {
    if (createdVehicleId) return createdVehicleId;

    if (make.trim().length < 2) {
      toastError(t("onboarding.vehicle.makeModel.makeMinLength"));
      return null;
    }
    if (model.trim().length < 2) {
      toastError(t("onboarding.vehicle.makeModel.modelMinLength"));
      return null;
    }
    if (!isValidProductionYear(year)) {
      // Not enough data — just skip auto creation.
      return null;
    }

    const vinTrimmed = vin.trim();
    if (vinTrimmed.length > 0 && vinTrimmed.length !== 17) {
      toastError(t("onboarding.vehicle.vin.exactLength"));
      return null;
    }

    if (mileage.trim() && !isNonNegativeNumber(mileage)) {
      toastError(t("validation.nonNegativeRequired"));
      return null;
    }
    if (engineCapacity.trim()) {
      const n = Number(engineCapacity.trim());
      if (!Number.isFinite(n) || n <= 1) {
        toastError(t("onboarding.vehicle.specs.engineMin"));
        return null;
      }
    }
    if (powerHp.trim()) {
      const n = Number(powerHp.trim());
      if (!Number.isFinite(n) || n <= 1) {
        toastError(t("onboarding.vehicle.specs.powerMin"));
        return null;
      }
    }

    // Check vehicle limit (same as VehicleForm)
    if (!isPremium) {
      const vehicles = await listVehicles();
      if (vehicles.length >= vehiclesLimit) {
        Alert.alert(
          t("limits.vehicleLimitReachedTitle"),
          t("limits.vehicleLimitReachedBody", { limit: vehiclesLimit }),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("limits.upgradeToPremium"),
              onPress: () => navigation.navigate("Shop"),
            },
          ],
        );
        return null;
      }
    }

    const production_year = Number(year.trim());
    const created = await createVehicle({
      type: vehicleType,
      vin: vin.trim().length ? vin.trim() : null,
      make: make.trim(),
      model: model.trim(),
      production_year,
      mileage: mileage.trim().length ? Number(mileage.trim()) : null,
      engine_capacity: engineCapacity.trim().length
        ? Number(engineCapacity.trim())
        : null,
      power_hp: powerHp.trim().length ? Number(powerHp.trim()) : null,
      fuel_type: fuelType,
      transmission,
      drive_type: driveType,
    });

    setCreatedVehicleId(created.id);

    if (photo?.uri) {
      try {
        await uploadVehiclePhoto({
          vehicleId: created.id,
          fileUri: photo.uri,
          mimeType: photo.mimeType ?? null,
          fileName: photo.fileName ?? null,
          maxPhotos: photosPerVehicleLimit,
        });
      } catch (e: any) {
        // Don't block onboarding if upload fails.
        console.error("Failed to upload onboarding photo:", e);
        toastError(e?.message ?? t("common.error"));
      }
    }

    return created.id;
  }

  async function onNext() {
    if (!canGoNext) return;

    // Guard: should never happen (e.g. session expired).
    if (!user) {
      toastError(t("auth.sessionExpired"));
      await signOut();
      return;
    }

    try {
      if (currentStep === 8) {
        setCurrentStep(9);
        return;
      }

      // Request push permissions on notifications step.
      if (currentStep === 10) {
        setSaving(true);
        if (pushEnabled) {
          try {
            await Notifications.requestPermissionsAsync();
          } catch (e) {
            // Don't block onboarding on notification errors.
            console.warn("Notifications permission request failed:", e);
          }
        }
        setCurrentStep(11);
        return;
      }

      setCurrentStep((s) => Math.min(LAST_STEP_INDEX, s + 1));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function onComplete() {
    if (!user) return;
    try {
      setSaving(true);

      // Ensure we have a valid session (can be missing after long background or refresh failure).
      const {
        data: { session: freshSession },
      } = await supabase.auth.getSession();
      if (!freshSession) {
        toastError(t("auth.sessionExpired"));
        await signOut();
        return;
      }

      // Create vehicle when entering confirmation step (so step text is true).
      await ensureVehicleCreated();

      const normalizedName = normalizeDisplayName(name);
      const existing = (freshSession.user.user_metadata ?? {}) as Record<
        string,
        any
      >;
      const { error } = await supabase.auth.updateUser({
        data: {
          ...existing,
          has_completed_onboarding: true,
          name: normalizedName,
          full_name: normalizedName,
        },
      });
      if (error) {
        // Session may have expired right before update (e.g. "Auth session missing").
        const msg = (error.message ?? "").toLowerCase();
        if (msg.includes("session") && msg.includes("missing")) {
          toastError(t("auth.sessionExpired"));
          await signOut();
          return;
        }
        throw error;
      }

      toastSuccess(t("onboarding.complete.doneToast"));
      navigation.replace("Vehicles");
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  function renderStep() {
    const yearHelper =
      currentStep === 4 &&
      year.trim().length > 0 &&
      !isValidProductionYear(year)
        ? t("onboarding.vehicle.year.invalid")
        : undefined;

    switch (currentStep) {
      case 0:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.welcome.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.welcome.subtitle")}
            </Text>
          </View>
        );
      case 1:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.name.title")}
            </Text>
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={makePlaceholder(
                    t("onboarding.name.label"),
                    t("onboarding.name.placeholder"),
                  )}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  editable={!saving}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
            </View>
            {name.trim().length === 0 ? (
              <Text style={[styles.helper, { color: theme.colors.muted }]}>
                {t("onboarding.name.required")}
              </Text>
            ) : name.trim().length < 2 ? (
              <Text style={[styles.helper, { color: theme.colors.muted }]}>
                {t("onboarding.name.minLength")}
              </Text>
            ) : null}
          </View>
        );
      case 2:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.type.title")}
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <SegmentTabs
                value={vehicleType}
                onChange={setVehicleType}
                size="sm"
                options={[
                  { value: "car", label: t("onboarding.vehicle.type.car") },
                  {
                    value: "motorcycle",
                    label: t("onboarding.vehicle.type.motorcycle"),
                  },
                ]}
              />
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.makeModel.title")}
            </Text>
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <TextInput
                  value={make}
                  onChangeText={setMake}
                  placeholder={makePlaceholder(
                    t("vehicleForm.makeLabel"),
                    t("vehicleForm.placeholderMake"),
                  )}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  editable={!saving}
                  autoCapitalize="words"
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={styles.row}>
                <Ionicons
                  name="layers-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder={makePlaceholder(
                    t("vehicleForm.modelLabel"),
                    t("vehicleForm.placeholderModel"),
                  )}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  editable={!saving}
                  autoCapitalize="words"
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
            </View>
            {(make.trim().length > 0 && make.trim().length < 2) ||
            (model.trim().length > 0 && model.trim().length < 2) ? (
              <Text style={[styles.helper, { color: theme.colors.muted }]}>
                {make.trim().length > 0 && make.trim().length < 2
                  ? t("onboarding.vehicle.makeModel.makeMinLength")
                  : t("onboarding.vehicle.makeModel.modelMinLength")}
              </Text>
            ) : null}
          </View>
        );
      case 4:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.year.title")}
            </Text>
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder={makePlaceholder(
                    t("vehicleForm.yearLabel"),
                    t("vehicleForm.placeholderYear"),
                  )}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  keyboardType="number-pad"
                  editable={!saving}
                  maxLength={4}
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
            </View>
            {yearHelper ? (
              <Text style={[styles.helper, { color: theme.colors.muted }]}>
                {yearHelper}
              </Text>
            ) : null}
          </View>
        );
      case 5:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.vin.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.vehicle.vin.subtitle")}
            </Text>
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="barcode-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <TextInput
                  value={vin}
                  onChangeText={setVin}
                  placeholder={makePlaceholder(
                    t("vehicleForm.vinLabel"),
                    t("vehicleForm.placeholderVin"),
                  )}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  editable={!saving}
                  autoCapitalize="characters"
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
            </View>
            {vin.trim().length > 0 && vin.trim().length !== 17 ? (
              <Text style={[styles.helper, { color: theme.colors.muted }]}>
                {t("onboarding.vehicle.vin.exactLength")}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                setVin("");
                void onNext();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.skipLink,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.skipText, { color: theme.colors.accent }]}>
                {t("onboarding.vehicle.vin.skip")}
              </Text>
            </Pressable>
          </View>
        );
      case 6:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.mileage.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.vehicle.mileage.subtitle")}
            </Text>
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <TextInput
                  value={mileage}
                  onChangeText={setMileage}
                  placeholder={makePlaceholder(
                    t("vehicleForm.mileageLabel"),
                    t("vehicleForm.placeholderMileage"),
                  )}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  keyboardType="number-pad"
                  editable={!saving}
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
            </View>
            <Pressable
              onPress={() => {
                setMileage("");
                void onNext();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.skipLink,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.skipText, { color: theme.colors.accent }]}>
                {t("onboarding.vehicle.mileage.skip")}
              </Text>
            </Pressable>
          </View>
        );
      case 7:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.specs.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.vehicle.specs.subtitle")}
            </Text>

            {(() => {
              type TransmissionTab = TransmissionType | "none";
              type DriveTab = DriveType | "none";

              const transmissionTab: TransmissionTab = transmission ?? "none";
              const driveTab: DriveTab = driveType ?? "none";

              return (
                <View
                  style={[
                    styles.card,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <View style={styles.row}>
                    <MaterialCommunityIcons
                      name="engine"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <TextInput
                      value={engineCapacity}
                      onChangeText={setEngineCapacity}
                      placeholder={makePlaceholder(
                        t("vehicleForm.engineCapacityLabel"),
                        t("vehicleForm.placeholderEngineCapacity"),
                      )}
                      placeholderTextColor={theme.colors.muted}
                      keyboardAppearance={mode === "dark" ? "dark" : "light"}
                      keyboardType="number-pad"
                      editable={!saving}
                      style={[styles.input, { color: theme.colors.fg }]}
                    />
                  </View>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="flash-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <TextInput
                      value={powerHp}
                      onChangeText={setPowerHp}
                      placeholder={makePlaceholder(
                        t("vehicleForm.powerHpLabel"),
                        t("vehicleForm.placeholderPowerHp"),
                      )}
                      placeholderTextColor={theme.colors.muted}
                      keyboardAppearance={mode === "dark" ? "dark" : "light"}
                      keyboardType="number-pad"
                      editable={!saving}
                      style={[styles.input, { color: theme.colors.fg }]}
                    />
                  </View>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />

                  <Pressable
                    onPress={() =>
                      showPicker<FuelType>({
                        title: t("vehicleForm.fuelTypeLabel"),
                        value: fuelType,
                        options: [
                          "petrol",
                          "diesel",
                          "hybrid",
                          "electric",
                          "lpg",
                        ] as const,
                        getLabel: (value) =>
                          t(
                            `vehicleForm.fuelType${
                              value.charAt(0).toUpperCase() + value.slice(1)
                            }` as
                              | "vehicleForm.fuelTypePetrol"
                              | "vehicleForm.fuelTypeDiesel"
                              | "vehicleForm.fuelTypeHybrid"
                              | "vehicleForm.fuelTypeElectric"
                              | "vehicleForm.fuelTypeLpg",
                          ),
                        onChange: setFuelType,
                        placeholderLabel: "—",
                      })
                    }
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Ionicons
                      name="water-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <Text
                      style={[styles.valueText, { color: theme.colors.fg }]}
                    >
                      {fuelType
                        ? t(
                            `vehicleForm.fuelType${
                              fuelType.charAt(0).toUpperCase() +
                              fuelType.slice(1)
                            }` as
                              | "vehicleForm.fuelTypePetrol"
                              | "vehicleForm.fuelTypeDiesel"
                              | "vehicleForm.fuelTypeHybrid"
                              | "vehicleForm.fuelTypeElectric"
                              | "vehicleForm.fuelTypeLpg",
                          )
                        : t("vehicleForm.fuelTypeLabel")}
                    </Text>
                  </Pressable>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <View style={styles.segmentWrap}>
                      <SegmentTabs<TransmissionTab>
                        value={transmissionTab}
                        size="sm"
                        onChange={(v) =>
                          setTransmission(
                            v === "none" ? null : (v as TransmissionType),
                          )
                        }
                        options={[
                          {
                            value: "manual",
                            label: t("vehicleForm.transmissionManual"),
                          },
                          {
                            value: "automatic",
                            label: t("vehicleForm.transmissionAutomatic"),
                          },
                          { value: "none", label: "—" },
                        ]}
                      />
                    </View>
                  </View>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <Ionicons
                      name="git-branch-outline"
                      size={20}
                      color={theme.colors.accent}
                    />
                    <View style={styles.segmentWrap}>
                      <SegmentTabs<DriveTab>
                        value={driveTab}
                        size="sm"
                        onChange={(v) =>
                          setDriveType(v === "none" ? null : (v as DriveType))
                        }
                        options={[
                          { value: "FWD", label: "FWD" },
                          { value: "RWD", label: "RWD" },
                          { value: "AWD", label: "AWD" },
                          { value: "none", label: "—" },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })()}

            {(() => {
              const engineInvalid =
                engineCapacity.trim().length > 0 &&
                (() => {
                  const n = Number(engineCapacity.trim());
                  return !Number.isFinite(n) || n <= 1;
                })();
              const powerInvalid =
                powerHp.trim().length > 0 &&
                (() => {
                  const n = Number(powerHp.trim());
                  return !Number.isFinite(n) || n <= 1;
                })();
              if (!engineInvalid && !powerInvalid) return null;
              return (
                <Text
                  style={[
                    styles.helper,
                    { color: theme.colors.muted, marginTop: theme.spacing.xs },
                  ]}
                >
                  {engineInvalid
                    ? t("onboarding.vehicle.specs.engineMin")
                    : t("onboarding.vehicle.specs.powerMin")}
                </Text>
              );
            })()}

            <Pressable
              onPress={() => {
                setEngineCapacity("");
                setPowerHp("");
                setFuelType(null);
                setTransmission(null);
                setDriveType(null);
                void onNext();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.skipLink,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.skipText, { color: theme.colors.accent }]}>
                {t("onboarding.vehicle.specs.skipAll")}
              </Text>
            </Pressable>
          </View>
        );
      case 8:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.photo.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.vehicle.photo.subtitle")}
            </Text>

            {photo?.uri ? (
              <View
                style={[
                  styles.photoCard,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ) : null}

            <Button
              variant={photo ? "outlined" : "primary"}
              onPress={() => void pickPhotoFromGallery()}
              disabled={saving}
            >
              {photo
                ? t("onboarding.vehicle.photo.changePhoto")
                : t("onboarding.vehicle.photo.addPhoto")}
            </Button>

            <Pressable
              onPress={() => {
                setPhoto(null);
                void onNext();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.skipLink,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.skipText, { color: theme.colors.accent }]}>
                {t("onboarding.vehicle.photo.skip")}
              </Text>
            </Pressable>
          </View>
        );
      case 9:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.confirm.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {createdVehicleId
                ? t("onboarding.vehicle.confirm.subtitleAdded", {
                    make: make.trim(),
                    model: model.trim(),
                    year: year.trim(),
                  })
                : t("onboarding.vehicle.confirm.subtitleNotAdded", {
                    make: make.trim(),
                    model: model.trim(),
                    year: year.trim(),
                  })}
            </Text>
            <View
              style={[
                styles.detailsCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.vehicleImageContainer}>
                {photo?.uri ? (
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.vehicleImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={[
                      styles.vehicleImagePlaceholder,
                      { backgroundColor: theme.colors.border },
                    ]}
                  >
                    <Text style={styles.vehicleImagePlaceholderText}>
                      {vehicleType === "car" ? "🚗" : "🏍️"}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.detailsContent}>
                <Text style={[styles.detailsTitle, { color: theme.colors.fg }]}>
                  {vehicleTitle || "—"}
                </Text>
                {vin.trim().length ? (
                  <View style={styles.vinRow}>
                    <Text
                      style={[styles.vinText, { color: theme.colors.muted }]}
                    >
                      {vin.trim()}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.detailsDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.detailsGrid}>
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.yearLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {isValidProductionYear(year) ? year.trim() : "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <Ionicons
                          name="speedometer-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.mileageLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {mileage.trim().length
                            ? `${Number(mileage.trim()).toLocaleString()} ${distanceUnit}`
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="engine"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.engineCapacityLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {engineCapacity.trim().length
                            ? `${engineCapacity.trim()} cm³`
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <Ionicons
                          name="flash-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.powerHpLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {powerHp.trim().length
                            ? `${powerHp.trim()} HP`
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <Ionicons
                          name="water-outline"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.fuelTypeLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {fuelType
                            ? t(
                                fuelType === "petrol"
                                  ? "vehicleForm.fuelTypePetrol"
                                  : fuelType === "diesel"
                                    ? "vehicleForm.fuelTypeDiesel"
                                    : fuelType === "hybrid"
                                      ? "vehicleForm.fuelTypeHybrid"
                                      : fuelType === "electric"
                                        ? "vehicleForm.fuelTypeElectric"
                                        : "vehicleForm.fuelTypeLpg",
                              )
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="car-shift-pattern"
                          size={18}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.transmissionLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {transmission
                            ? t(
                                transmission === "manual"
                                  ? "vehicleForm.transmissionManual"
                                  : "vehicleForm.transmissionAutomatic",
                              )
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIconContainer,
                          { backgroundColor: theme.colors.accent + "25" },
                        ]}
                      >
                        <DriveTypeIcon size={18} color={theme.colors.accent} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.colors.muted },
                          ]}
                        >
                          {t("vehicleForm.driveTypeLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            { color: theme.colors.fg },
                          ]}
                        >
                          {driveType ?? "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      case 10:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.notifications.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.notifications.subtitle")}
            </Text>

            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <View style={styles.row}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <Text style={[styles.valueText, { color: theme.colors.fg }]}>
                  {t("onboarding.notifications.enablePush")}
                </Text>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </View>
            </View>
          </View>
        );
      case 11:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.complete.title")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.complete.subtitle")}
            </Text>

            <View style={{ gap: theme.spacing.xs }}>
              {(
                [
                  t("onboarding.complete.features.service"),
                  t("onboarding.complete.features.fueling"),
                  t("onboarding.complete.features.wheels"),
                  t("onboarding.complete.features.reminders"),
                  t("onboarding.complete.features.documents"),
                ] as const
              ).map((line) => (
                <View key={line} style={styles.bulletRow}>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.colors.accent}
                  />
                  <Text style={[styles.bulletText, { color: theme.colors.fg }]}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <Screen padding={false}>
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.bg,
          },
        ]}
      >
        {showProgress ? (
          <View style={styles.progressWrap}>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.accent,
                    width: `${Math.round(progressPct * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.muted }]}>
              {currentStep + 1}/{TOTAL_STEPS}
            </Text>
          </View>
        ) : (
          <View style={styles.progressWrap} />
        )}

        {currentStep === 0 ? (
          <Pressable onPress={() => void signOut()} hitSlop={10}>
            <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>
              {t("common.signOut")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: theme.layout.contentPaddingHorizontal },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.bg,
          },
        ]}
      >
        {currentStep === LAST_STEP_INDEX ? (
          <Button onPress={() => void onComplete()} disabled={saving}>
            {saving ? t("common.saving") : t("onboarding.complete.cta")}
          </Button>
        ) : currentStep === 0 ? (
          <Button
            variant="primary"
            onPress={() => void onNext()}
            disabled={!canGoNext}
          >
            {saving ? t("common.saving") : nextLabel}
          </Button>
        ) : (
          <View style={styles.footerRow}>
            <Button
              variant="outlined"
              onPress={onBack}
              disabled={!canGoBack}
              style={{ flex: 1, width: "auto" }}
            >
              {t("common.back")}
            </Button>
            <Button
              variant="primary"
              onPress={() => void onNext()}
              disabled={!canGoNext}
              style={{ flex: 1, width: "auto" }}
            >
              {saving ? t("common.saving") : nextLabel}
            </Button>
          </View>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    topBar: {
      height: theme.spacing.lg * 2 + theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
    },
    backBtn: {
      width: theme.spacing.xl + theme.spacing.xs,
      height: theme.spacing.xl + theme.spacing.xs,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    progressWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    progressTrack: {
      alignSelf: "stretch",
      height: 6,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
    },
    progressText: {
      fontSize: theme.typography.small,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    content: {
      flexGrow: 1,
    },
    step: {
      width: "100%",
      flexGrow: 1,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      marginVertical: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 4,
      marginBottom: theme.spacing.xs,
    },
    card: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    rowTopAligned: {
      alignItems: "flex-start",
    },
    divider: {
      height: 1,
      width: "100%",
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      paddingVertical: 0,
    },
    helper: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.small,
    },
    valueText: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
    },
    segmentWrap: {
      flex: 1,
      minWidth: 0,
    },
    segmentStack: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs,
    },
    sectionLabel: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      fontWeight: "800",
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    skipLink: {
      marginTop: theme.spacing.md,
      alignSelf: "flex-start",
    },
    skipText: {
      fontSize: theme.typography.small,
      fontWeight: "800",
    },
    photoCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      marginBottom: theme.spacing.xs,
    },
    photo: {
      width: "100%",
      height: 220,
    },
    summaryCard: {
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    summaryTitle: {
      fontSize: theme.typography.body,
      fontWeight: "900",
    },
    summaryMeta: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      fontWeight: "700",
    },
    detailsCard: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
      borderWidth: 1,
    },
    vehicleImageContainer: {
      position: "relative",
      height: 220,
      width: "100%",
      overflow: "hidden",
    },
    vehicleImage: {
      width: "100%",
      height: "100%",
    },
    vehicleImagePlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    vehicleImagePlaceholderText: {
      fontSize: theme.spacing.xl * 2,
    },
    detailsContent: {
      padding: theme.spacing.md,
    },
    detailsTitle: {
      fontSize: theme.typography.title,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    vinRow: {
      marginBottom: theme.spacing.md,
    },
    vinText: {
      fontSize: theme.typography.small,
      fontWeight: "600",
    },
    detailsDivider: {
      height: 1,
      marginBottom: theme.spacing.md,
    },
    detailsGrid: {
      gap: theme.spacing.sm,
    },
    detailsRow: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "flex-start",
    },
    detailItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    detailIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    detailContent: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    detailLabel: {
      fontSize: theme.typography.xs,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: theme.typography.body,
      fontWeight: "600",
    },
    pushRow: {
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pushLabel: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    bulletText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      flex: 1,
    },
    footer: {
      borderTopWidth: 1,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.sm,
      paddingBottom: insets.bottom + theme.spacing.md,
      gap: theme.spacing.xs,
    },
    footerRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerHint: {
      textAlign: "center",
      fontSize: theme.typography.small,
      marginTop: 2,
    },
  });
