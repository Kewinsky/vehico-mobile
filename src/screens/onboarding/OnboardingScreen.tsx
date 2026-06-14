import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { OnboardingLayout } from "../../layouts";
import { FormScreen } from "../../ui/components/layout/FormScreen";
import { useTheme } from "../../ui/ThemeProvider";
import { Button } from "../../ui/components/common/Button";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import type { VehicleType } from "../../types/domain";
import {
  resolveOAuthUserDisplayName,
  shouldPromptDisplayNameInOnboarding,
} from "../../services/auth/signInProviders";
import { normalizeDisplayName } from "../../utils/displayName";
import {
  isNonNegativeNumber,
  isValidProductionYear,
} from "../../utils/validation";
import {
  createVehicle,
  listVehicles,
} from "../../services/vehicles/vehiclesRepo";
import { uploadVehiclePhoto } from "../../services/vehicles/uploadPhoto";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { supabase } from "../../services/supabase/client";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import {
  getPremiumUpgradeAlertButtons,
  handleAndShowLimitErrorAlert,
} from "../../ui/limits/entitlementAlerts";
import { groupThousands } from "../../utils/numberFormatting";
import { useAuth } from "../../app/providers/AuthProvider";
import { useUnitDisplay } from "../../app/hooks/useUnitDisplay";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { Logo } from "../../ui/components/branding/Logo";
import { Card } from "../../ui/components/common/Card";
import { FormInputRow } from "../../ui/components/common/FormInputRow";
import { Glow, GLOW_SHAPES } from "../../ui/components/dashboard/Glow";

type Props = NativeStackScreenProps<AppStackParamList, "Onboarding">;

type PhotoFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const TOTAL_STEPS = 6;
const LAST_STEP_INDEX = TOTAL_STEPS - 1;
const PROGRESS_STEPS = TOTAL_STEPS - 1; // don't count welcome step

export function OnboardingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const { user, signOut } = useAuth();
  const { vehiclesLimit, isPremium, photosPerVehicleLimit } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);
  const { distanceUnitLabel } = useUnitDisplay();

  const promptDisplayName = shouldPromptDisplayNameInOnboarding(user);
  const skipNameStep = !promptDisplayName;
  const progressSegmentCount = skipNameStep
    ? PROGRESS_STEPS - 1
    : PROGRESS_STEPS;

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

  const showProgress = currentStep > 0;
  const progressStep = useMemo(() => {
    if (currentStep <= 0) return 0;
    if (skipNameStep && currentStep > 1) return currentStep - 1;
    return currentStep;
  }, [currentStep, skipNameStep]);
  const progressAnim = useRef(new Animated.Value(progressStep)).current;

  useEffect(() => {
    if (skipNameStep) {
      setName(resolveOAuthUserDisplayName(user));
    }
  }, [skipNameStep, user]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressStep,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressStep, progressAnim]);

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

  function nextStepIndex(step: number): number {
    if (step === 0) return skipNameStep ? 2 : 1;
    return Math.min(LAST_STEP_INDEX, step + 1);
  }

  function previousStepIndex(step: number): number {
    if (step === 2 && skipNameStep) return 0;
    return Math.max(0, step - 1);
  }

  function onBack() {
    if (!canGoBack) return;
    setCurrentStep((s) => previousStepIndex(s));
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
      // Not enough data – just skip auto creation.
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
          getPremiumUpgradeAlertButtons(t, navigation),
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
      if (handleAndShowLimitErrorAlert(e, t, navigation)) return null;
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
      setCurrentStep((s) => nextStepIndex(s));
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

      const normalizedName = skipNameStep
        ? resolveOAuthUserDisplayName(freshSession.user)
        : normalizeDisplayName(name.trim());
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
          <View style={[styles.step, styles.welcomeStep]}>
            <View style={styles.welcomeIntro}>
              <Logo width={132} height={132} />
              <Text style={styles.welcomeBrandTitle}>
                {t("onboarding.welcome.heroTitle")}
              </Text>
              <Text style={[styles.welcomeBody, { color: theme.colors.muted }]}>
                {t("onboarding.welcome.heroSubtitle")}
              </Text>
              <Pressable
                onPress={() => void onNext()}
                disabled={!canGoNext}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.welcomeArrowButton,
                  { backgroundColor: theme.colors.accent },
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <Ionicons name="arrow-forward" size={24} color="#000000" />
              </Pressable>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.step}>
            <ContentHeader title={t("onboarding.name.title")} />
            <Card
              style={{
                borderRadius: theme.radius.md,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              }}
            >
              <FormInputRow
                icon="person-outline"
                label={t("onboarding.name.label")}
                value={name}
                onChangeText={setName}
                placeholder={t("onboarding.name.placeholder")}
                editable={!saving}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
              />
            </Card>
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
            <ContentHeader title={t("onboarding.vehicle.type.title")} />
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
                        ? hexToRgba(theme.colors.accent, 0.15)
                        : theme.colors.card,
                  },
                  pressed && { transform: [{ scale: 0.985 }] },
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
                        ? hexToRgba(theme.colors.accent, 0.15)
                        : theme.colors.card,
                  },
                  pressed && { transform: [{ scale: 0.985 }] },
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
            <ContentHeader title={t("onboarding.vehicle.makeModel.title")} />
            <Card>
              <FormInputRow
                icon="pricetag-outline"
                label={t("vehicleForm.makeLabel")}
                value={make}
                onChangeText={setMake}
                placeholder={
                  vehicleType === "motorcycle"
                    ? t("vehicleForm.placeholderMakeMotorcycle")
                    : t("vehicleForm.placeholderMake")
                }
                editable={!saving}
                autoFocus
                autoCapitalize="words"
              />
              <FormInputRow
                icon="layers-outline"
                label={t("vehicleForm.modelLabel")}
                value={model}
                onChangeText={setModel}
                placeholder={
                  vehicleType === "motorcycle"
                    ? t("vehicleForm.placeholderModelMotorcycle")
                    : t("vehicleForm.placeholderModel")
                }
                editable={!saving}
                autoCapitalize="words"
              />
              <FormInputRow
                icon="calendar-outline"
                label={t("vehicleForm.yearLabel")}
                value={year}
                onChangeText={setYear}
                placeholder={
                  vehicleType === "motorcycle"
                    ? t("vehicleForm.placeholderYearMotorcycle")
                    : t("vehicleForm.placeholderYear")
                }
                editable={!saving}
                keyboardType="number-pad"
                maxLength={4}
              />
              <FormInputRow
                icon="speedometer-outline"
                label={`${t("vehicleForm.mileageLabel")} (${distanceUnitLabel})`}
                value={mileage}
                onChangeText={setMileage}
                placeholder={
                  vehicleType === "motorcycle"
                    ? t("vehicleForm.placeholderMileageMotorcycle")
                    : t("vehicleForm.placeholderMileage")
                }
                keyboardType="number-pad"
                editable={!saving}
              />
            </Card>
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
            <ContentHeader
              title={t("onboarding.vehicle.photo.title", {
                make: make.trim(),
                model: model.trim(),
              })}
            />
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
            ) : (
              <Pressable
                onPress={() => void pickPhotoFromGallery()}
                disabled={saving}
                style={({ pressed }) => [
                  styles.photoPlaceholderCard,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View
                  style={[
                    styles.photoPlaceholderIcon,
                    { backgroundColor: hexToRgba(theme.colors.accent, 0.14) },
                  ]}
                >
                  <Ionicons
                    name="camera-outline"
                    size={28}
                    color={theme.colors.accent}
                  />
                </View>
                <Text
                  style={[
                    styles.photoPlaceholderTitle,
                    { color: theme.colors.fg },
                  ]}
                >
                  {t("onboarding.vehicle.photo.addPhoto")}
                </Text>
              </Pressable>
            )}

            {photo ? (
              <Button
                variant="outlined"
                onPress={() => void pickPhotoFromGallery()}
                disabled={saving}
              >
                {t("onboarding.vehicle.photo.changePhoto")}
              </Button>
            ) : null}

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
            <ContentHeader
              title={t("onboarding.summary.title", {
                nameSuffix: normalizeDisplayName(name).trim()
                  ? `, ${normalizeDisplayName(name).trim()}!`
                  : "!",
              })}
              subtitle={t("onboarding.summary.subtitle")}
            />

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
                  {[make.trim(), model.trim()].filter(Boolean).join(" ") || "–"}
                </Text>
              </View>

              <View style={styles.detailsContent}>
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
                          {isValidProductionYear(year) ? year.trim() : "–"}
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
                            ? `${groupThousands(Number(mileage.trim()), 0, i18n.language)} ${distanceUnitLabel}`
                            : "–"}
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
    <OnboardingLayout
      background={
        <>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          <Glow
            width={windowWidth}
            height={Math.round(windowHeight * 0.55)}
            mode={mode}
            shape={GLOW_SHAPES[1]}
            style={styles.backgroundGlow}
          />
        </>
      }
      header={
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: "transparent",
              borderBottomColor: "transparent",
            },
          ]}
        >
          {showProgress ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressSegmentsRow}>
                {Array.from({ length: progressSegmentCount }).map((_, i) => {
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
      }
      footer={
        currentStep === 0 ? null : (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: "transparent",
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
              <></>
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
        )
      }
    >
      <FormScreen noLayout scrollEnabled>
        <View style={styles.content}>{renderStep()}</View>
      </FormScreen>
    </OnboardingLayout>
  );
}

const makeStyles = (theme: any, insets: { bottom: number }) =>
  StyleSheet.create({
    backgroundGlow: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    topBar: {
      height: theme.spacing.lg * 2 + theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.sm,
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
    },
    content: {
      flexGrow: 1,
    },
    step: {
      width: "100%",
      flexGrow: 1,
    },
    welcomeStep: {
      justifyContent: "center",
      paddingBottom: theme.spacing.lg * 1.5,
    },
    welcomeIntro: {
      alignItems: "center",
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    welcomeBrandTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle + 8,
      fontWeight: "900",
      fontFamily: "ChironGoRoundTC",
      textAlign: "center",
    },
    welcomeBody: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
      textAlign: "center",
      maxWidth: 320,
    },
    welcomeArrowButton: {
      width: 60,
      height: 60,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.sm,
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
    helper: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.small,
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
    photoPlaceholderCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md + 2,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    photoPlaceholderIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    photoPlaceholderTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    photoPlaceholderSubtitle: {
      fontSize: theme.typography.small,
      textAlign: "center",
    },
    photo: {
      width: "100%",
      height: 220,
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
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    detailsTitle: {
      paddingTop: theme.spacing.md,
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    vinRow: {
      marginBottom: theme.spacing.md,
    },
    vinText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
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
