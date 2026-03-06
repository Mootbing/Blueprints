import { Alert, Platform } from "react-native";

type AlertButton = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export function crossAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const fullMessage = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(fullMessage);
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === "cancel");
  const actionBtns = buttons.filter((b) => b.style !== "cancel");

  if (actionBtns.length === 0) {
    window.alert(fullMessage);
    cancelBtn?.onPress?.();
    return;
  }

  if (actionBtns.length === 1) {
    if (window.confirm(fullMessage)) {
      actionBtns[0].onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
    return;
  }

  // Multiple action buttons: prompt for each option
  for (const btn of actionBtns) {
    if (window.confirm(`${fullMessage}\n\n${btn.text}?`)) {
      btn.onPress?.();
      return;
    }
  }
  cancelBtn?.onPress?.();
}
