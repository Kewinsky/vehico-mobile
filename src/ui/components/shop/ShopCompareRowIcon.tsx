import { Ionicons } from "@expo/vector-icons";

import { RimIcon } from "../icons/RimIcon";
import { TireIcon } from "../icons/TireIcon";
import type { ShopCompareIcon } from "../../../screens/modal/shopComparison";

type Props = {
  icon: ShopCompareIcon;
  color: string;
  size?: number;
};

export function ShopCompareRowIcon({ icon, color, size = 18 }: Props) {
  if (icon.type === "tire") {
    return <TireIcon size={size} color={color} />;
  }
  if (icon.type === "rim") {
    return <RimIcon size={size} color={color} />;
  }
  return <Ionicons name={icon.name} size={size} color={color} />;
}
