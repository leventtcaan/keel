import { Alert } from 'react-native';

type Question = {
  /** Already translated. */
  title: string;
  /** One paragraph, or several (a sign-out with entries waiting and photos on the phone says both). */
  body: string | readonly string[];
  confirmLabel: string;
  keepLabel: string;
  onConfirm: () => void;
};

/**
 * The question before a destructive step, as the system's own alert (ADR-087 #1, iOS HIG): it is on the screen whatever the
 * list under it has scrolled to, where an inline step at the end of a long list was off it. The destructive button is the
 * confirm; keeping is the cancel one, and an alert has no other way out, so a tap in a hurry changes nothing.
 */
export function askFirst({ title, body, confirmLabel, keepLabel, onConfirm }: Question): void {
  Alert.alert(title, typeof body === 'string' ? body : body.join('\n\n'), [
    { text: keepLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
