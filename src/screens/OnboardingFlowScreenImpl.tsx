import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
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
import { AppLayout } from "../ui/components/AppLayout";
import { useTheme } from "../ui/ThemeProvider";
import { Button } from "../ui/components/Button";
import { hexToRgba } from "../ui/components/ChoiceChip";
import type { VehicleType } from "../types/domain";
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
import { maybeHandleBackendEntitlementLimitError } from "../ui/limits/entitlementAlerts";
import { useAuth } from "../app/providers/AuthProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "Onboarding">;

type PhotoFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const TOTAL_STEPS = 6;
const LAST_STEP_INDEX = TOTAL_STEPS - 1;
const PROGRESS_STEPS = TOTAL_STEPS - 1; // don't count welcome step

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
  const [showValidation, setShowValidation] = useState(false);

  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");

  const [photo, setPhoto] = useState<PhotoFile | null>(null);

  const [saving, setSaving] = useState(false);
  const [createdVehicleId, setCreatedVehicleId] = useState<string | null>(null);

  const vehicleTitle = useMemo(() => {
    const y = year.trim();
    const parts = [make.trim(), model.trim()].filter(Boolean).join(" ");
    return [parts, y].filter(Boolean).join(", ");
  }, [make, model, year]);

  const showProgress = currentStep > 0;
  const progressAnim = useRef(new Animated.Value(currentStep)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStep, progressAnim]);

  useEffect(() => {
    setShowValidation(false);
  }, [currentStep]);

  const canGoBack = currentStep > 0 && !saving;

  const canGoNext = useMemo(() => {
    if (saving) return false;
    if (currentStep === 1) return name.trim().length >= 2;
    if (currentStep === 2) return vehicleType != null;
    if (currentStep === 3) {
      if (make.trim().length < 2 || model.trim().length < 2) return false;
      if (!isValidProductionYear(year)) return false;
      if (!mileage.trim().length) return false;
      if (!isNonNegativeNumber(mileage)) return false;
      return true;
    }
    return true;
  }, [currentStep, make, model, name, saving, vehicleType, year, mileage]);

  const nextLabel = useMemo(() => {
    if (currentStep === 0) return t("onboarding.welcome.getStarted");
    return t("common.next");
  }, [currentStep, t]);

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

    if (!vehicleType) {
      toastError(t("onboarding.vehicle.type.title"));
      return null;
    }

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

    if (mileage.trim() && !isNonNegativeNumber(mileage)) {
      toastError(t("validation.nonNegativeRequired"));
      return null;
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
    let created: Awaited<ReturnType<typeof createVehicle>>;
    try {
      created = await createVehicle({
        type: vehicleType,
        vin: null,
        make: make.trim(),
        model: model.trim(),
        production_year,
        mileage: mileage.trim().length ? Number(mileage.trim()) : null,
      });
    } catch (e: any) {
      if (maybeHandleBackendEntitlementLimitError(e, t, navigation))
        return null;
      toastError(e?.message ?? t("common.error"));
      return null;
    }

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
    if (!canGoNext) {
      setShowValidation(true);
      return;
    }

    // Guard: should never happen (e.g. session expired).
    if (!user) {
      toastError(t("auth.sessionExpired"));
      await signOut();
      return;
    }

    try {
      setCurrentStep((s) => Math.min(LAST_STEP_INDEX, s + 1));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  function onFinish() {
    if (saving) return;

    Alert.alert(
      t("onboarding.notifications.title"),
      t("onboarding.notifications.subtitle"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
          onPress: () => void onComplete(),
        },
        {
          text: t("onboarding.notifications.enablePush"),
          onPress: async () => {
            try {
              await Notifications.requestPermissionsAsync();
            } catch (e) {
              // Don't block onboarding on notification errors.
              console.warn("Notifications permission request failed:", e);
            } finally {
              void onComplete();
            }
          },
        },
      ],
      { cancelable: true },
    );
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
      currentStep === 3 &&
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
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("onboarding.name.label")}
                  </Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t("onboarding.name.placeholder")}
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
            {(() => {
              const n = name.trim();
              const showRequired = showValidation && n.length === 0;
              const showMinLength = n.length > 0 && n.length < 2;
              if (!showRequired && !showMinLength) return null;
              return (
                <Text style={[styles.helper, { color: theme.colors.muted }]}>
                  {showRequired
                    ? t("onboarding.name.required")
                    : t("onboarding.name.minLength")}
                </Text>
              );
            })()}
          </View>
        );
      case 2:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.type.title")}
            </Text>
            <View style={styles.vehicleTypeRow}>
              <Pressable
                onPress={() => setVehicleType("car")}
                disabled={saving}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.vehicleTypeCard,
                  {
                    borderColor:
                      vehicleType === "car"
                        ? theme.colors.accent
                        : theme.colors.border,
                    backgroundColor:
                      vehicleType === "car"
                        ? hexToRgba(theme.colors.accent, 0.12)
                        : theme.colors.card,
                  },
                  pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="car-outline"
                  size={35}
                  color={
                    vehicleType === "car"
                      ? theme.colors.accent
                      : theme.colors.muted
                  }
                />
                <Text
                  style={[
                    styles.vehicleTypeLabel,
                    {
                      color:
                        vehicleType === "car"
                          ? theme.colors.fg
                          : theme.colors.muted,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t("onboarding.vehicle.type.car")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setVehicleType("motorcycle")}
                disabled={saving}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.vehicleTypeCard,
                  {
                    borderColor:
                      vehicleType === "motorcycle"
                        ? theme.colors.accent
                        : theme.colors.border,
                    backgroundColor:
                      vehicleType === "motorcycle"
                        ? hexToRgba(theme.colors.accent, 0.12)
                        : theme.colors.card,
                  },
                  pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                ]}
              >
                <MaterialCommunityIcons
                  name="motorbike"
                  size={35}
                  color={
                    vehicleType === "motorcycle"
                      ? theme.colors.accent
                      : theme.colors.muted
                  }
                />
                <Text
                  style={[
                    styles.vehicleTypeLabel,
                    {
                      color:
                        vehicleType === "motorcycle"
                          ? theme.colors.fg
                          : theme.colors.muted,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t("onboarding.vehicle.type.motorcycle")}
                </Text>
              </Pressable>
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
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("vehicleForm.makeLabel")}
                  </Text>
                </View>
                <TextInput
                  value={make}
                  onChangeText={setMake}
                  placeholder={t("vehicleForm.placeholderMake")}
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
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="layers-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("vehicleForm.modelLabel")}
                  </Text>
                </View>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder={t("vehicleForm.placeholderModel")}
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
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("vehicleForm.yearLabel")}
                  </Text>
                </View>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder={t("vehicleForm.placeholderYear")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  editable={!saving}
                  keyboardType="number-pad"
                  maxLength={4}
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
                <View style={styles.rowLeft}>
                  <Ionicons
                    name="speedometer-outline"
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[styles.label, { color: theme.colors.muted }]}
                    numberOfLines={1}
                  >
                    {t("vehicleForm.mileageLabel")}
                  </Text>
                </View>
                <TextInput
                  value={mileage}
                  onChangeText={setMileage}
                  placeholder={t("vehicleForm.placeholderMileage")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  keyboardType="number-pad"
                  editable={!saving}
                  style={[styles.input, { color: theme.colors.fg }]}
                />
              </View>
            </View>
            {(() => {
              const makeInvalid =
                make.trim().length > 0 && make.trim().length < 2;
              const modelInvalid =
                model.trim().length > 0 && model.trim().length < 2;
              const mileageMissing = mileage.trim().length === 0;
              const mileageInvalid =
                mileage.trim().length > 0 && !isNonNegativeNumber(mileage);
              const showMileageMissing = showValidation && mileageMissing;
              if (
                !makeInvalid &&
                !modelInvalid &&
                !yearHelper &&
                !showMileageMissing &&
                !mileageInvalid
              )
                return null;
              return (
                <Text style={[styles.helper, { color: theme.colors.muted }]}>
                  {makeInvalid
                    ? t("onboarding.vehicle.makeModel.makeMinLength")
                    : modelInvalid
                      ? t("onboarding.vehicle.makeModel.modelMinLength")
                      : yearHelper
                        ? yearHelper
                        : t("validation.nonNegativeRequired")}
                </Text>
              );
            })()}
          </View>
        );
      case 4:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.vehicle.photo.title")}
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
      case 5:
        return (
          <View style={styles.step}>
            <Text style={[styles.title, { color: theme.colors.fg }]}>
              {t("onboarding.summary.title", {
                nameSuffix: normalizeDisplayName(name).trim()
                  ? `, ${normalizeDisplayName(name).trim()}!`
                  : "!",
              })}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {t("onboarding.summary.subtitle")}
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
                    <MaterialCommunityIcons
                      name={
                        vehicleType === "motorcycle"
                          ? "motorbike"
                          : "car-outline"
                      }
                      size={theme.spacing.xl * 2}
                      color={theme.colors.muted}
                    />
                  </View>
                )}
              </View>
              <View style={styles.detailsContent}>
                <Text style={[styles.detailsTitle, { color: theme.colors.fg }]}>
                  {[make.trim(), model.trim()].filter(Boolean).join(" ") || "—"}
                </Text>
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
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <AppLayout>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.colors.bg,
          },
        ]}
      >
        {showProgress ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressSegmentsRow}>
              {Array.from({ length: PROGRESS_STEPS }).map((_, i) => {
                const w = progressAnim.interpolate({
                  inputRange: [i, i + 1],
                  outputRange: ["0%", "100%"],
                  extrapolate: "clamp",
                });
                return (
                  <View
                    key={i}
                    style={[
                      styles.progressSegment,
                      { backgroundColor: theme.colors.border },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.progressSegmentFill,
                        { backgroundColor: theme.colors.accent, width: w },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.progressWrap} />
        )}

        {currentStep === 0 ? (
          <Pressable onPress={() => void signOut()} hitSlop={10}>
            <Text
              style={{
                color: theme.colors.danger,
                fontWeight: theme.typography.fontWeight.bold,
              }}
            >
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
        <View
          style={[
            styles.content,
            { paddingHorizontal: theme.layout.contentPaddingHorizontal },
          ]}
        >
          {renderStep()}
        </View>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.bg,
          },
        ]}
      >
        {currentStep === LAST_STEP_INDEX ? (
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
              onPress={onFinish}
              disabled={saving}
              style={{ flex: 1, width: "auto" }}
            >
              {saving ? t("common.saving") : t("onboarding.complete.cta")}
            </Button>
          </View>
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
    </AppLayout>
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
    progressSegmentsRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      gap: 6,
    },
    progressSegment: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressSegmentFill: {
      height: "100%",
      borderRadius: 999,
    },
    progressText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
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
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 0,
      flexShrink: 1,
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
      textAlign: "right",
    },
    label: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
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
    segmentTabsNewLine: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
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
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
    },
    summaryMeta: {
      marginTop: theme.spacing.xs / 2,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    summaryImageContainer: {
      width: "100%",
      height: 180,
      borderRadius: theme.radius.md,
      overflow: "hidden",
      marginBottom: theme.spacing.md,
    },
    summaryImage: {
      width: "100%",
      height: "100%",
    },
    summaryImagePlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    summaryContent: {
      gap: theme.spacing.sm,
    },
    summaryRows: {
      gap: theme.spacing.sm,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    summaryIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryRowContent: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    summaryRowLabel: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    summaryRowValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.xs,
    },
    vinRow: {
      marginBottom: theme.spacing.md,
    },
    vinText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
      flex: 1,
    },
    footer: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.sm,
      paddingBottom: insets.bottom,
      gap: theme.spacing.xs,
    },
    vehicleTypeRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    vehicleTypeCard: {
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      flex: 1,
      minHeight: 120,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
    },
    vehicleTypeIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    vehicleTypeLabel: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
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
