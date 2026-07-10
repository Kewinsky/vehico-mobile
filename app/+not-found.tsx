import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Screen not found.</Text>
        <Link href="/">Go home</Link>
      </View>
    </>
  );
}
