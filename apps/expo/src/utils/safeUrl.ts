import { Linking, Alert } from "react-native";

const ALLOWED_URL_SCHEMES = ["http:", "https:", "mailto:"];

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function safeOpenUrl(url: string): void {
  if (isSafeUrl(url)) {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Failed to open the URL.");
    });
  } else {
    Alert.alert("Invalid URL", "This link cannot be opened.");
  }
}
