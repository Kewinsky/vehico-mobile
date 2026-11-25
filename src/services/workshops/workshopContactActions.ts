import { Linking } from "react-native";

export async function callWorkshop(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return;

  const url = `tel:${trimmed.replace(/[^\d+#*;,.]/g, "")}`;
  await Linking.openURL(url);
}

export async function navigateToWorkshop(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return;

  const encodedAddress = encodeURIComponent(trimmed);
  const nativeUrls = [
    `comgooglemaps://?q=${encodedAddress}`,
    `maps://?q=${encodedAddress}`,
  ];

  for (const url of nativeUrls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next navigation handler.
    }
  }

  await Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
  );
}
