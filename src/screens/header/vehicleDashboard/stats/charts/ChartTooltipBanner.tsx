import { StyleSheet, Text, View } from "react-native";

type Props = {
  text: string | null;
  backgroundColor: string;
  textColor: string;
};

export function ChartTooltipBanner({ text, backgroundColor, textColor }: Props) {
  if (text == null || text.trim() === "") {
    return null;
  }

  return (
    <View style={[styles.wrap, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]} numberOfLines={4}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    maxWidth: "100%",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
