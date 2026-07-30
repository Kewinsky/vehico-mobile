import { SegmentTabsFallback } from "./SegmentTabs.fallback";
import type { SegmentTabsProps } from "./SegmentTabs.types";

export type { SegmentTabsProps } from "./SegmentTabs.types";

export function SegmentTabs<T extends string>(props: SegmentTabsProps<T>) {
  return <SegmentTabsFallback {...props} />;
}
