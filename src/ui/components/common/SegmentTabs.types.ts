type Option<T extends string> = {
  value: T;
  label: string;
};

type Variant = "default" | "secondary";

export type SegmentTabsProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  size?: "sm" | "md";
  variant?: Variant;
  /** Use Pressable tabs instead of native segmented control. */
  preferFallback?: boolean;
};
