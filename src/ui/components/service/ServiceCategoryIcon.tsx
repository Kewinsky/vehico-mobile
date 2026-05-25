import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { ServiceEntryCategory } from "../../../types/domain";
import { SERVICE_CATEGORY_COLORS } from "../../theme/serviceCategoryColors";

type Props = {
  category: ServiceEntryCategory;
  size?: number;
  color?: string;
};

/** Single source of truth for service entry category list/timeline icons. */
export function ServiceCategoryIcon({
  category,
  size = 22,
  color,
}: Props) {
  const iconColor = color ?? SERVICE_CATEGORY_COLORS[category];

  switch (category) {
    case "maintenance":
      return (
        <MaterialCommunityIcons name="tools" size={size} color={iconColor} />
      );
    case "repair":
      return (
        <MaterialCommunityIcons
          name="wrench-outline"
          size={size}
          color={iconColor}
        />
      );
    case "inspection":
      return <Ionicons name="search-outline" size={size} color={iconColor} />;
    case "upgrade":
      return (
        <Ionicons name="trending-up-outline" size={size} color={iconColor} />
      );
    case "oil_change":
      return (
        <MaterialCommunityIcons name="oil" size={size} color={iconColor} />
      );
    case "other":
    default:
      return (
        <Ionicons
          name="information-circle-outline"
          size={size}
          color={iconColor}
        />
      );
  }
}
