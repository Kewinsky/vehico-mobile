export const VEHICLE_EQUIPMENT_CATEGORY_IDS = [
  "general",
  "multimedia",
  "climate",
  "roof",
  "upholstery",
  "seats",
  "cruise",
  "lights",
  "parking",
  "driver_assist",
] as const;

export type VehicleEquipmentCategoryId =
  (typeof VEHICLE_EQUIPMENT_CATEGORY_IDS)[number];

export const VEHICLE_EQUIPMENT_PRESETS_BY_CATEGORY = {
  general: [
    "keyless_entry",
    "keyless_go",
    "sport_suspension",
    "air_suspension",
    "heated_windshield",
    "tow_hitch",
    "isofix",
    "alloy_wheels",
    "roof_rails",
    "rear_tinted_windows",
    "heated_steering_wheel",
  ],
  multimedia: [
    "apple_carplay",
    "android_auto",
    "bluetooth",
    "wireless_charging",
    "satellite_navigation",
    "internet_access",
    "usb_port",
    "head_up_display",
    "radio_multimedia",
  ],
  climate: [
    "climate_manual",
    "climate_auto",
    "climate_auto_2_zone",
    "climate_auto_3_zone",
    "climate_auto_4_zone",
  ],
  roof: [
    "open_roof",
    "panoramic_roof",
    "sunroof_electric_glass",
    "sunroof_manual_glass",
    "sunroof_second_electric_glass",
  ],
  upholstery: [
    "upholstery_alcantara",
    "upholstery_partial_leather",
    "upholstery_fabric",
    "upholstery_leather",
  ],
  seats: [
    "electric_driver_seat",
    "heated_driver_seat",
    "heated_passenger_seat",
    "ventilated_front_seats",
    "ventilated_rear_seats",
    "seat_memory",
    "front_armrests",
    "sport_steering_wheel",
    "steering_wheel_paddles",
  ],
  cruise: [
    "cruise_control",
    "cruise_adaptive_acc",
    "cruise_predictive_pcc",
  ],
  lights: [
    "headlights_bi_xenon",
    "headlights_xenon",
    "headlights_led",
    "headlights_laser",
    "dynamic_cornering_lights",
    "coming_home_lights",
  ],
  parking: [
    "parking_distance_front",
    "parking_distance_rear",
    "park_assistant",
    "independent_parking_system",
    "parking_camera_360",
    "parking_camera_rear",
    "mirrors_electric_folding",
  ],
  driver_assist: [
    "blind_spot_assist",
    "lane_keep_assist",
    "forward_distance_control",
    "autonomous_steering",
  ],
} as const satisfies Record<VehicleEquipmentCategoryId, readonly string[]>;

export type VehicleEquipmentPresetKey =
  (typeof VEHICLE_EQUIPMENT_PRESETS_BY_CATEGORY)[VehicleEquipmentCategoryId][number];

export const VEHICLE_EQUIPMENT_PRESET_KEYS: readonly VehicleEquipmentPresetKey[] =
  VEHICLE_EQUIPMENT_CATEGORY_IDS.flatMap(
    (categoryId) => VEHICLE_EQUIPMENT_PRESETS_BY_CATEGORY[categoryId],
  );

/** Map older checklist keys to the current preset set. */
export const VEHICLE_EQUIPMENT_LEGACY_KEY_MAP: Record<
  string,
  VehicleEquipmentPresetKey | VehicleEquipmentPresetKey[]
> = {
  backup_camera: "parking_camera_rear",
  parking_sensors: ["parking_distance_front", "parking_distance_rear"],
  heated_seats: ["heated_driver_seat", "heated_passenger_seat"],
  leather_seats: "upholstery_leather",
  sunroof: "open_roof",
  climate_control: "climate_auto",
  xenon_led_lights: "headlights_led",
  electric_mirrors: "mirrors_electric_folding",
};

export function isVehicleEquipmentPresetKey(
  value: string,
): value is VehicleEquipmentPresetKey {
  return (VEHICLE_EQUIPMENT_PRESET_KEYS as readonly string[]).includes(value);
}

export function normalizeVehicleEquipmentPresetKeys(
  keys: string[],
): VehicleEquipmentPresetKey[] {
  const next = new Set<VehicleEquipmentPresetKey>();
  for (const key of keys) {
    if (isVehicleEquipmentPresetKey(key)) {
      next.add(key);
      continue;
    }
    const mapped = VEHICLE_EQUIPMENT_LEGACY_KEY_MAP[key];
    if (!mapped) continue;
    if (Array.isArray(mapped)) {
      for (const item of mapped) next.add(item);
    } else {
      next.add(mapped);
    }
  }
  return [...next];
}
